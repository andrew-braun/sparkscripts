#!/usr/bin/env node
/**
 * Deployment smoke test — read-only GETs against a running Glyphin deployment.
 *
 *   pnpm test:smoke -- https://glyphin.app
 *   SMOKE_BASE_URL=https://glyphin.app pnpm test:smoke
 *
 * Checks that the core public surface responds and that Worker responses carry
 * the security headers. It only performs GETs, never mutates learner data, and
 * never targets a hardcoded production URL — the base URL is a required input so
 * this can point at a Cloudflare preview or a local `wrangler dev` build.
 *
 * Exits non-zero if any check fails, so it can gate a deploy step.
 */

// Presence-checked on Worker (SSR) responses. Values are asserted only for the
// two headers whose exact value is the whole point; the rest are name-presence
// so a legitimate edge-level tweak (e.g. HSTS max-age) does not fail the smoke.
// The authoritative value set lives in `src/lib/server/security-headers.ts` and
// is guarded against `_headers` drift by `security-headers.test.ts`.
const REQUIRED_SECURITY_HEADERS = [
	"strict-transport-security",
	"x-content-type-options",
	"x-frame-options",
	"referrer-policy",
	"permissions-policy",
	"cross-origin-opener-policy",
	"cross-origin-resource-policy",
];
const EXACT_SECURITY_HEADERS = {
	"x-frame-options": "DENY",
	"x-content-type-options": "nosniff",
};

function resolveBaseUrl() {
	const fromArg = process.argv.slice(2).find((arg) => !arg.startsWith("-"));
	const base = fromArg ?? process.env.SMOKE_BASE_URL;
	if (!base) {
		console.error(
			"Missing base URL. Usage: pnpm test:smoke -- https://your-deployment.example",
		);
		process.exit(2);
	}
	try {
		return new URL(base).origin;
	} catch {
		console.error(`Invalid base URL: ${base}`);
		process.exit(2);
	}
}

async function fetchPath(baseUrl, path) {
	const url = `${baseUrl}${path}`;
	const response = await fetch(url, { redirect: "manual", headers: { accept: "*/*" } });
	const body = await response.text();
	return { url, response, body };
}

function checkStatus(problems, response, expected) {
	if (response.status !== expected) {
		problems.push(`expected status ${expected}, got ${response.status}`);
	}
}

function checkHeaderIncludes(problems, response, name, needle) {
	const value = response.headers.get(name) ?? "";
	if (!value.toLowerCase().includes(needle.toLowerCase())) {
		problems.push(`header ${name} = "${value}" did not include "${needle}"`);
	}
}

function checkSecurityHeaders(problems, response) {
	for (const name of REQUIRED_SECURITY_HEADERS) {
		if (!response.headers.has(name)) {
			problems.push(`missing security header ${name}`);
		}
	}
	for (const [name, expected] of Object.entries(EXACT_SECURITY_HEADERS)) {
		const value = response.headers.get(name);
		if (value !== expected) {
			problems.push(`security header ${name} = "${value}", expected "${expected}"`);
		}
	}
}

/** @type {{ name: string, run: (baseUrl: string) => Promise<string[]> }[]} */
const checks = [
	{
		name: "homepage serves HTML with an h1 and security headers",
		async run(baseUrl) {
			const problems = [];
			const { response, body } = await fetchPath(baseUrl, "/");
			checkStatus(problems, response, 200);
			checkHeaderIncludes(problems, response, "content-type", "text/html");
			checkSecurityHeaders(problems, response);
			if (!/<h1[\s>]/iu.test(body)) problems.push("no <h1> in server-rendered HTML");
			return problems;
		},
	},
	{
		name: "first lesson page responds",
		async run(baseUrl) {
			const problems = [];
			const { response } = await fetchPath(baseUrl, "/learn/1");
			checkStatus(problems, response, 200);
			checkHeaderIncludes(problems, response, "content-type", "text/html");
			return problems;
		},
	},
	{
		name: "learner projection endpoint responds unauthenticated",
		async run(baseUrl) {
			const problems = [];
			const { response, body } = await fetchPath(baseUrl, "/api/learner/projection");
			checkStatus(problems, response, 200);
			checkHeaderIncludes(problems, response, "content-type", "application/json");
			checkHeaderIncludes(problems, response, "cache-control", "no-store");
			try {
				const parsed = JSON.parse(body);
				if (parsed?.auth?.authenticated !== false) {
					problems.push("expected auth.authenticated === false for an anonymous request");
				}
			} catch {
				problems.push("response body was not valid JSON");
			}
			return problems;
		},
	},
	{
		name: "sitemap.xml is served",
		async run(baseUrl) {
			const problems = [];
			const { response, body } = await fetchPath(baseUrl, "/sitemap.xml");
			checkStatus(problems, response, 200);
			checkHeaderIncludes(problems, response, "content-type", "xml");
			if (!body.includes("<urlset")) problems.push("sitemap body missing <urlset>");
			return problems;
		},
	},
	{
		name: "robots.txt points at the sitemap",
		async run(baseUrl) {
			const problems = [];
			const { response, body } = await fetchPath(baseUrl, "/robots.txt");
			checkStatus(problems, response, 200);
			if (!/sitemap:/iu.test(body)) problems.push("robots.txt missing a Sitemap directive");
			return problems;
		},
	},
	{
		name: "llms.txt is served",
		async run(baseUrl) {
			const problems = [];
			const { response } = await fetchPath(baseUrl, "/llms.txt");
			checkStatus(problems, response, 200);
			return problems;
		},
	},
];

async function main() {
	const baseUrl = resolveBaseUrl();
	console.log(`Smoke testing ${baseUrl}\n`);

	let failed = 0;
	for (const check of checks) {
		let problems;
		try {
			problems = await check.run(baseUrl);
		} catch (error) {
			problems = [`request threw: ${error instanceof Error ? error.message : String(error)}`];
		}
		if (problems.length === 0) {
			console.log(`  PASS  ${check.name}`);
		} else {
			failed += 1;
			console.log(`  FAIL  ${check.name}`);
			for (const problem of problems) console.log(`          - ${problem}`);
		}
	}

	console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
	if (failed > 0) process.exit(1);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
