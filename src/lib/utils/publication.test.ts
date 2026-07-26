import assert from "node:assert/strict";

import { describe, it } from "vitest";

import {
	GENERATED_PUBLICATION_MANIFEST_FILE,
	getPublicationArtifactFileName,
	getPublicationCacheKey,
} from "./publication.ts";

const PUBLICATION_ID = "05ef7f1d-533e-5a74-afe1-17d35390fa15";

describe("publication artifact naming", () => {
	it("derives a deterministic artifact filename from the publication id", () => {
		assert.equal(
			getPublicationArtifactFileName(PUBLICATION_ID),
			`published-lessons.${PUBLICATION_ID}.json`,
		);
	});

	it("derives a deterministic, prefixed cache key from the publication id", () => {
		assert.equal(
			getPublicationCacheKey(PUBLICATION_ID),
			`glyphbridge-publication-${PUBLICATION_ID}`,
		);
	});

	it("produces distinct keys and filenames for distinct publication ids", () => {
		const other = "11111111-2222-4333-8444-555555555555";
		assert.notEqual(
			getPublicationArtifactFileName(PUBLICATION_ID),
			getPublicationArtifactFileName(other),
		);
		assert.notEqual(getPublicationCacheKey(PUBLICATION_ID), getPublicationCacheKey(other));
	});

	it("exposes a stable manifest filename constant", () => {
		assert.equal(GENERATED_PUBLICATION_MANIFEST_FILE, "published-lessons-manifest.json");
	});
});
