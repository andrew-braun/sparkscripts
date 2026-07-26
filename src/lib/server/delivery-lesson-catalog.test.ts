import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { mapPublishedLessonCatalogEntry } from "./delivery-payload.ts";

describe("mapPublishedLessonCatalogEntry", () => {
	it("maps the client catalog fields and excludes the anchor vocabulary entry", () => {
		const catalogEntry = mapPublishedLessonCatalogEntry({
			lesson: {
				lessonOrdinal: 7,
				stage: 3,
				title: "Read a familiar word",
				anchor: {
					text: "ไทย",
					meaning: "Thai",
					pronunciation: "thai",
					categoryKey: "daily",
					segments: [{ text: "ไทย", sound: "thai" }],
				},
				vocabulary: [
					{
						roleKey: "anchor",
						isDrillTarget: true,
						item: {
							text: "ไทย",
							meaning: "Thai",
							pronunciation: "thai",
							categoryKey: "daily",
							segments: [{ text: "ไทย", sound: "thai" }],
						},
					},
					{
						roleKey: "practice_extension",
						isDrillTarget: false,
						item: {
							text: "มา",
							meaning: "come",
							pronunciation: "maa",
							categoryKey: "daily",
							segments: [{ text: "มา", sound: "maa" }],
							metadata: { sourceType: "real" },
						},
					},
				],
				newGraphemes: [
					{
						text: "ท",
						romanization: "th",
						pronunciationHint: "t as in stop",
						kind: "consonant",
						mnemonic: "flag",
					},
				],
				drills: [
					{
						type: "recognize",
						prompt: "Find ท",
						options: [
							{ text: "ท", isCorrect: true },
							{ text: "ย", isCorrect: false },
						],
					},
				],
				reviewGraphemes: [],
			},
		});

		assert.deepEqual(catalogEntry, {
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
			vocabulary: [
				{
					tier: "extension",
					sourceType: "real",
					drillTarget: false,
					word: {
						thai: "มา",
						meaning: "come",
						pronunciation: "maa",
						category: "daily",
						syllables: [{ thai: "มา", sound: "maa" }],
					},
				},
			],
			newLetters: [
				{
					character: "ท",
					romanization: "th",
					pronunciation: "t as in stop",
					type: "consonant",
					mnemonic: "flag",
				},
			],
			drills: [
				{
					type: "recognize",
					prompt: "Find ท",
					options: ["ท", "ย"],
					correctIndex: 0,
				},
			],
		});
	});
});
