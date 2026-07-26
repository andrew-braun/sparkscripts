import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { describe, it } from "vitest";

import { SECURITY_HEADERS } from "./security-headers.ts";

/**
 * `_headers` (which covers prerendered pages and static assets) and
 * `SECURITY_HEADERS` (which covers Worker responses) necessarily state the same
 * policy twice — a plain text file cannot import TypeScript. These tests parse
 * the real file and assert the two agree, so the duplication cannot silently
 * drift into a site where half the routes are protected and half are not.
 */

const HEADERS_FILE = new URL("../../../_headers", import.meta.url);

/** Parse the `/*` catch-all block of a Cloudflare `_headers` file. */
function parseCatchAllBlock(source: string): Map<string, string> {
	const headers = new Map<string, string>();
	let inCatchAll = false;

	for (const rawLine of source.split("\n")) {
		const line = rawLine.trim();

		if (line === "" || line.startsWith("#")) continue;

		// A line with no leading whitespace in the raw source starts a new path rule.
		if (!/^\s/.test(rawLine)) {
			inCatchAll = line === "/*";
			continue;
		}

		if (!inCatchAll) continue;

		const separator = line.indexOf(":");
		assert.ok(separator > 0, `malformed header line in _headers: ${line}`);

		const name = line.slice(0, separator).trim().toLowerCase();
		const value = line.slice(separator + 1).trim();
		headers.set(name, value);
	}

	return headers;
}

describe("_headers", () => {
	const parsed = parseCatchAllBlock(readFileSync(HEADERS_FILE, "utf8"));

	it("declares a /* catch-all block", () => {
		assert.ok(parsed.size > 0, "no headers parsed from the /* block");
	});

	it("matches SECURITY_HEADERS exactly", () => {
		assert.deepEqual(
			Object.fromEntries([...parsed].sort()),
			Object.fromEntries(Object.entries(SECURITY_HEADERS).sort()),
			"_headers and src/lib/server/security-headers.ts disagree. " +
				"Static assets and Worker responses would ship different policies. " +
				"Update both.",
		);
	});
});

describe("SECURITY_HEADERS", () => {
	it("does not set a Content-Security-Policy", () => {
		// CSP is owned by `kit.csp` in svelte.config.js, which is the only thing
		// that can emit the per-page script hashes prerendered pages require.
		// Setting a second, static CSP here would override or conflict with it.
		assert.equal(SECURITY_HEADERS["content-security-policy"], undefined);
	});

	it("denies framing, since meta-tag CSP cannot express frame-ancestors", () => {
		assert.equal(SECURITY_HEADERS["x-frame-options"], "DENY");
	});

	it("enforces HSTS for at least a year", () => {
		const hsts = SECURITY_HEADERS["strict-transport-security"];
		const maxAge = Number(/max-age=(\d+)/.exec(hsts ?? "")?.[1]);

		assert.ok(maxAge >= 31536000, `max-age ${maxAge} is under one year`);
		assert.match(hsts ?? "", /includeSubDomains/);
	});

	it("blocks MIME sniffing", () => {
		assert.equal(SECURITY_HEADERS["x-content-type-options"], "nosniff");
	});
});
