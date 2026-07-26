import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { validateProductionOrigin } from "../../config/site.ts";
import { buildPageMetadata } from "./metadata.ts";

const origin = "https://glyphin.example";

describe("buildPageMetadata", () => {
	it("suffixes the site name exactly once", () => {
		assert.equal(
			buildPageMetadata({ title: "Learn Thai", origin }).title,
			"Learn Thai — Glyphin",
		);
		assert.equal(
			buildPageMetadata({ title: "Learn Thai — Glyphin", origin }).title,
			"Learn Thai — Glyphin",
		);
	});

	it("constructs absolute canonical and image URLs", () => {
		const metadata = buildPageMetadata({
			title: "Learn Thai",
			canonicalPath: "/learn",
			imagePath: "/og/learn.png",
			origin,
		});

		assert.equal(metadata.canonicalUrl, "https://glyphin.example/learn");
		assert.equal(metadata.social?.openGraph.url, "https://glyphin.example/learn");
		assert.equal(metadata.social?.openGraph.image, "https://glyphin.example/og/learn.png");
	});

	it("rejects canonical and image paths that are not root-relative", () => {
		assert.throws(
			() => buildPageMetadata({ title: "Learn Thai", canonicalPath: "learn", origin }),
			/canonicalPath must begin with \//,
		);
		assert.throws(
			() =>
				buildPageMetadata({
					title: "Learn Thai",
					imagePath: "//bad.example/image.png",
					origin,
				}),
			/imagePath must begin with \//,
		);
	});

	it("builds Open Graph and Twitter metadata for indexable pages", () => {
		const metadata = buildPageMetadata({
			title: "Lesson",
			description: "Read a Thai word.",
			canonicalPath: "/learn/lesson",
			imagePath: "/og/lesson.png",
			origin,
			type: "article",
		});

		assert.deepEqual(metadata, {
			title: "Lesson — Glyphin",
			description: "Read a Thai word.",
			canonicalUrl: "https://glyphin.example/learn/lesson",
			social: {
				openGraph: {
					siteName: "Glyphin",
					title: "Lesson — Glyphin",
					description: "Read a Thai word.",
					url: "https://glyphin.example/learn/lesson",
					type: "article",
					image: "https://glyphin.example/og/lesson.png",
				},
				twitter: {
					card: "summary_large_image",
					title: "Lesson — Glyphin",
					description: "Read a Thai word.",
					image: "https://glyphin.example/og/lesson.png",
				},
			},
		});
	});

	it("uses noindex, follow and omits learner-utility descriptions and social metadata", () => {
		assert.deepEqual(
			buildPageMetadata({
				title: "Thai alphabet progress",
				description: "This must not be emitted.",
				canonicalPath: "/alphabet",
				imagePath: "/og/ignored.png",
				origin,
				robots: "noindex, follow",
			}),
			{
				title: "Thai alphabet progress — Glyphin",
				canonicalUrl: "https://glyphin.example/alphabet",
				robots: "noindex, follow",
			},
		);
	});

	it("uses noindex, nofollow and omits all preview social metadata", () => {
		assert.deepEqual(
			buildPageMetadata({
				title: "Lesson complete preview",
				description: "This must not be emitted.",
				canonicalPath: "/test/lesson-complete",
				origin,
				robots: "noindex, nofollow",
			}),
			{
				title: "Lesson complete preview — Glyphin",
				canonicalUrl: "https://glyphin.example/test/lesson-complete",
				robots: "noindex, nofollow",
			},
		);
	});

	it("omits optional metadata fields instead of producing empty tags", () => {
		assert.deepEqual(buildPageMetadata({ title: "Learn Thai", origin, social: false }), {
			title: "Learn Thai — Glyphin",
		});
	});
});

describe("validateProductionOrigin", () => {
	it("normalizes a valid HTTPS origin", () => {
		assert.equal(
			validateProductionOrigin("HTTPS://Glyphin.Example:443/"),
			"https://glyphin.example",
		);
	});

	it("rejects missing and non-HTTPS production origins", () => {
		for (const value of [undefined, "http://glyphin.example", "https://glyphin.example/path"]) {
			assert.throws(() => validateProductionOrigin(value), /valid https:\/\/ origin/);
		}
	});

	it("rejects a standard username-and-password origin", () => {
		assert.throws(
			() => validateProductionOrigin("https://username:password@glyphin.example"),
			/valid https:\/\/ origin/,
		);
	});

	it("rejects query-string origins, including an empty query", () => {
		for (const value of [
			"https://glyphin.example?source=preview",
			"https://glyphin.example?",
		]) {
			assert.throws(() => validateProductionOrigin(value), /valid https:\/\/ origin/);
		}
	});

	it("rejects fragment origins, including an empty fragment", () => {
		for (const value of ["https://glyphin.example#preview", "https://glyphin.example#"]) {
			assert.throws(() => validateProductionOrigin(value), /valid https:\/\/ origin/);
		}
	});
});
