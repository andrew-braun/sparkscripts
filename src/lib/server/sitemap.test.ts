import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { buildSitemap } from "./sitemap.ts";

const ORIGIN = "https://glyphin.app";

function locs(xml: string): string[] {
	return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
}

describe("buildSitemap", () => {
	it("emits a valid urlset with absolute HTTPS loc URLs and no lastmod/priority", () => {
		const xml = buildSitemap(ORIGIN, ["/", "/about", "/learn"]);

		assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
		assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
		assert.doesNotMatch(xml, /<lastmod>|<changefreq>|<priority>/);
		assert.deepEqual(locs(xml), [
			"https://glyphin.app/",
			"https://glyphin.app/about",
			"https://glyphin.app/learn",
		]);
	});

	it("includes published lesson URLs under the canonical origin", () => {
		const xml = buildSitemap(ORIGIN, ["/", "/learn/1", "/learn/2"]);
		assert.deepEqual(locs(xml), [
			"https://glyphin.app/",
			"https://glyphin.app/learn/1",
			"https://glyphin.app/learn/2",
		]);
	});

	it("preserves caller order and de-duplicates repeated paths", () => {
		const xml = buildSitemap(ORIGIN, ["/learn", "/about", "/learn", "/"]);
		assert.deepEqual(locs(xml), [
			"https://glyphin.app/learn",
			"https://glyphin.app/about",
			"https://glyphin.app/",
		]);
	});

	it("strips trailing slashes from every path except root", () => {
		const xml = buildSitemap(ORIGIN, ["/", "/learn/", "/about/"]);
		assert.deepEqual(locs(xml), [
			"https://glyphin.app/",
			"https://glyphin.app/learn",
			"https://glyphin.app/about",
		]);
	});

	it("XML-escapes reserved characters in loc URLs", () => {
		const xml = buildSitemap(ORIGIN, ["/learn/a&b"]);
		assert.match(xml, /<loc>https:\/\/glyphin\.app\/learn\/a&amp;b<\/loc>/);
		assert.doesNotMatch(xml, /a&b/);
	});

	it("rejects non-absolute paths", () => {
		assert.throws(() => buildSitemap(ORIGIN, ["learn"]), TypeError);
	});

	it("rejects a non-canonical origin", () => {
		assert.throws(() => buildSitemap("http://glyphin.app", ["/"]), TypeError);
		assert.throws(() => buildSitemap("https://glyphin.app/path", ["/"]), TypeError);
	});
});
