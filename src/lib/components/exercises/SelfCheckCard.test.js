import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { describe, it } from "vitest";

const source = readFileSync(new URL("./SelfCheckCard.svelte", import.meta.url), "utf8");

describe("SelfCheckCard flip affordance", () => {
	it("formats isolated focus marks with a visible typographic base", () => {
		assert.match(source, /formatLetterGlyph\(letter\.character\)/u);
	});

	it("attaches a layered dog-ear fold directly to the card corner", () => {
		assert.match(
			source,
			/&__fold\s*\{[\s\S]*?bottom:\s*0;[\s\S]*?right:\s*0;[\s\S]*?&::before[\s\S]*?&::after/u,
		);
	});

	it("lifts the dog-ear when the card is hovered or keyboard-focused", () => {
		assert.match(source, /&:(?:hover|focus-visible)[\s\S]*?\.self-check-card__fold/u);
	});
});
