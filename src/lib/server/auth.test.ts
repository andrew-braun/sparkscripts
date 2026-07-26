import assert from "node:assert/strict";

import { describe, it } from "vitest";

import {
	getSafeRedirectPath,
	normalizeEmail,
	normalizeEmailOtp,
	readOptionalFormString,
	readRequiredFormString,
} from "./auth.ts";

describe("getSafeRedirectPath", () => {
	it("returns the value for each allow-listed path", () => {
		for (const path of ["/", "/auth", "/learn", "/alphabet", "/words", "/practice"]) {
			assert.equal(getSafeRedirectPath(path), path);
		}
	});

	it("falls back to / for null or empty input", () => {
		assert.equal(getSafeRedirectPath(null), "/");
		assert.equal(getSafeRedirectPath(""), "/");
	});

	it("rejects open-redirect and off-list targets", () => {
		for (const hostile of [
			"//evil.com",
			"https://evil.com",
			"http://evil.com",
			"/learn/1", // not literally allow-listed
			"/auth?next=/evil",
			"/admin",
			"../../etc/passwd",
			"/ ",
			"javascript:alert(1)",
		]) {
			assert.equal(getSafeRedirectPath(hostile), "/");
		}
	});
});

describe("normalizeEmail", () => {
	it("trims and lowercases a valid address", () => {
		assert.equal(normalizeEmail("  User@Example.COM "), "user@example.com");
	});

	it("rejects malformed addresses", () => {
		for (const bad of [
			null,
			"",
			"no-at-sign",
			"a@b",
			"a@b.",
			"@example.com",
			"a b@example.com",
		]) {
			assert.equal(normalizeEmail(bad), null);
		}
	});
});

describe("normalizeEmailOtp", () => {
	it("strips non-digits and accepts exactly six digits", () => {
		assert.equal(normalizeEmailOtp("123456"), "123456");
		assert.equal(normalizeEmailOtp("123 456"), "123456");
		assert.equal(normalizeEmailOtp("12-34-56"), "123456");
	});

	it("rejects codes that are not six digits after stripping", () => {
		for (const bad of [null, "", "12345", "1234567", "abcdef", "12 34"]) {
			assert.equal(normalizeEmailOtp(bad), null);
		}
	});
});

describe("form string readers", () => {
	function form(entries: Record<string, string>) {
		const data = new FormData();
		for (const [key, value] of Object.entries(entries)) data.append(key, value);
		return data;
	}

	it("returns a trimmed non-empty required string, else null", () => {
		assert.equal(readRequiredFormString(form({ email: "  hi  " }), "email"), "hi");
		assert.equal(readRequiredFormString(form({ email: "   " }), "email"), null);
		assert.equal(readRequiredFormString(form({}), "email"), null);
	});

	it("returns undefined instead of null for optional strings", () => {
		assert.equal(readOptionalFormString(form({ email: "hi" }), "email"), "hi");
		assert.equal(readOptionalFormString(form({}), "email"), undefined);
	});
});
