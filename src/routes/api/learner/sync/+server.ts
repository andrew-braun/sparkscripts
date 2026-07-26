import { json } from "@sveltejs/kit";

import type { LearnerProjectionEnvelope } from "$lib/data/learner";
import { getSupabaseClient, requireVerifiedUser } from "$lib/server/auth";
import { getLearnerProjection, syncLessonCompletionAttempts } from "$lib/server/learner-projection";
import { readLessonCompletionAttempts } from "$lib/server/learner-sync-input";
import { consumeRateLimitToken } from "$lib/server/rate-limit";

import type { RequestHandler } from "./$types";

export const prerender = false;

// Per-user throttle on this state-changing endpoint. Tuned to sit well above
// real usage — the client batches all pending attempts into a single POST and,
// on any non-OK response, keeps them queued and retries on the next flush — while
// still blunting scripted abuse (~12 requests/minute sustained, burst of 12).
const SYNC_RATE_LIMIT = { capacity: 12, refillPerSecond: 0.2 } as const;

// SECURITY: this state-changing POST relies on SvelteKit's built-in CSRF
// protection (`kit.csrf.checkOrigin`, default `true`) to reject cross-site form
// submissions and non-same-origin requests. It must stay enabled — do not
// disable `csrf.checkOrigin` in `svelte.config.js`. Auth is still verified
// server-side below via `requireVerifiedUser`.
function projectionJson(envelope: LearnerProjectionEnvelope): Response {
	return json(envelope, {
		headers: {
			"cache-control": "no-store",
		},
	});
}

export const POST: RequestHandler = async ({ locals, request }) => {
	const user = await requireVerifiedUser(locals);

	const rateLimit = await consumeRateLimitToken(`learner-sync:${user.id}`, SYNC_RATE_LIMIT);
	if (!rateLimit.allowed) {
		return json(
			{ error: "Too many sync requests. Please slow down and try again shortly." },
			{ status: 429, headers: { "retry-after": String(rateLimit.retryAfterSeconds) } },
		);
	}

	const supabase = getSupabaseClient(locals);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const attempts = readLessonCompletionAttempts(body);

	if (!attempts) {
		return json({ error: "Invalid lesson sync payload" }, { status: 400 });
	}

	await syncLessonCompletionAttempts(supabase, attempts);
	const projection = await getLearnerProjection(supabase);

	return projectionJson({
		auth: { authenticated: true, email: user.email ?? null },
		projection,
	});
};
