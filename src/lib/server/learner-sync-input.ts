import type { LessonCompletionSyncInput } from "$lib/data/learner";

// Pure input parsing for the learner-sync trust boundary. This lives outside the
// `+server.ts` route so it can be unit-tested in isolation and reused. It must
// reject any untrusted shape deterministically and never throw — callers treat a
// `null` return as "invalid payload, respond 400". Keep this free of route,
// environment, or Supabase imports.

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clientAttemptIdPattern = /^[A-Za-z0-9:_-]{1,64}$/;

const MIN_ATTEMPTS = 1;
const MAX_ATTEMPTS = 50;
const MAX_TIME_SPENT_MS = 86_400_000;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isValidScore(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100;
}

function isValidCompletedAt(value: unknown): value is string {
	return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

/**
 * Parse an untrusted request body into validated lesson-completion attempts.
 * Returns `null` for any invalid shape (non-record body, missing/oversized
 * `attempts` array, malformed field, or a duplicate client attempt id).
 */
export function readLessonCompletionAttempts(value: unknown): LessonCompletionSyncInput[] | null {
	if (!isRecord(value) || !Array.isArray(value.attempts)) return null;
	if (value.attempts.length < MIN_ATTEMPTS || value.attempts.length > MAX_ATTEMPTS) return null;

	const attempts: LessonCompletionSyncInput[] = [];
	const seenAttemptIds = new Set<string>();

	for (const item of value.attempts) {
		if (!isRecord(item)) return null;

		const clientAttemptId = item.clientAttemptId;
		const publicationId = item.publicationId;
		const lessonId = item.lessonId;
		const score = item.score;
		const completedAt = item.completedAt;
		const timeSpentMs = item.timeSpentMs;

		if (typeof clientAttemptId !== "string" || !clientAttemptIdPattern.test(clientAttemptId)) {
			return null;
		}

		if (seenAttemptIds.has(clientAttemptId)) return null;
		seenAttemptIds.add(clientAttemptId);

		if (typeof publicationId !== "string" || !uuidPattern.test(publicationId)) return null;
		if (typeof lessonId !== "number" || !Number.isInteger(lessonId) || lessonId < 1) {
			return null;
		}
		if (!isValidScore(score)) return null;
		if (!isValidCompletedAt(completedAt)) return null;

		if (
			timeSpentMs !== undefined &&
			(typeof timeSpentMs !== "number" ||
				!Number.isInteger(timeSpentMs) ||
				timeSpentMs < 0 ||
				timeSpentMs > MAX_TIME_SPENT_MS)
		) {
			return null;
		}

		attempts.push({
			clientAttemptId,
			publicationId,
			lessonId,
			score,
			completedAt,
			...(timeSpentMs !== undefined ? { timeSpentMs } : {}),
		});
	}

	return attempts;
}
