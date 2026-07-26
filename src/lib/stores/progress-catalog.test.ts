import assert from "node:assert/strict";

import { describe, it } from "vitest";

import type { LessonCatalogEntry } from "../data/types.ts";
import { createProgressCatalog } from "./progress-catalog.ts";

const catalog: LessonCatalogEntry[] = [
	{
		id: 7,
		stage: 3,
		title: "Read a familiar word",
		anchorWord: {
			thai: "ไทย",
			meaning: "Thai",
			pronunciation: "thai",
			category: "daily",
			syllables: [{ thai: "ไทย", sound: "thai" }],
		},
		vocabulary: [],
		newLetters: [
			{
				character: "ท",
				romanization: "th",
				pronunciation: "t as in stop",
				type: "consonant",
				mnemonic: "flag",
			},
		],
		drills: [],
	},
];

describe("createProgressCatalog", () => {
	it("derives progress lookups and a journey source from the published catalog", () => {
		const progressCatalog = createProgressCatalog(catalog);

		assert.equal(progressCatalog.firstLessonId, 7);
		assert.equal(progressCatalog.lastLessonId, 7);
		assert.deepEqual(progressCatalog.lessonIds, [7]);
		assert.deepEqual(progressCatalog.knownLetterCharacters, new Set(["ท"]));
		assert.equal(progressCatalog.lessonById.get(7)?.title, "Read a familiar word");
		assert.deepEqual(progressCatalog.journeySource, { stages: [], lessons: catalog });
	});
});
