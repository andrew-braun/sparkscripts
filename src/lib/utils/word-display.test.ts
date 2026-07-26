import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { hasMeaningfulSyllableBreakdown } from "./word-display.ts";

describe("hasMeaningfulSyllableBreakdown", () => {
	it("hides a single syllable that repeats the word and its reading", () => {
		assert.equal(
			hasMeaningfulSyllableBreakdown({
				thai: "มา",
				pronunciation: "maa",
				syllables: [{ thai: "มา", sound: "maa" }],
			}),
			false,
		);
	});

	it("keeps a multi-syllable breakdown", () => {
		assert.equal(
			hasMeaningfulSyllableBreakdown({
				thai: "ภาษา",
				pronunciation: "phaa-sǎa",
				syllables: [
					{ thai: "ภา", sound: "phaa" },
					{ thai: "ษา", sound: "sǎa" },
				],
			}),
			true,
		);
	});

	it("keeps a one-syllable breakdown when its reading adds information", () => {
		assert.equal(
			hasMeaningfulSyllableBreakdown({
				thai: "ไหม",
				pronunciation: "mǎi",
				syllables: [{ thai: "ไหม", sound: "mai" }],
			}),
			true,
		);
	});
});
