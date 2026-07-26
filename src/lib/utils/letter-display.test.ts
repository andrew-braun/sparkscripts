import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { formatLetterGlyph } from "./letter-display.ts";

describe("formatLetterGlyph", () => {
	it("adds a dotted-circle base to an isolated Thai combining mark", () => {
		assert.equal(formatLetterGlyph("ี"), "◌ี");
	});

	it("preserves spacing letters and already contextualized graphemes", () => {
		assert.equal(formatLetterGlyph("ด"), "ด");
		assert.equal(formatLetterGlyph("เ◌ีย"), "เ◌ีย");
	});
});
