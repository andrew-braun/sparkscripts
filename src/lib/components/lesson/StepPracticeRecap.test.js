import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { describe, it } from "vitest";

const source = readFileSync(new URL("./StepPracticeRecap.svelte", import.meta.url), "utf8");

describe("StepPracticeRecap completion choices", () => {
	it("explains the card interaction and lets learners skip directly to the scored check", () => {
		assert.match(source, /Try each word, then tap a card to reveal its answer\./u);
		assert.match(
			source,
			/<Button[^>]*variant="secondary"[^>]*onclick=\{onComplete\}[\s\S]*?>\s*Skip recap\s*<\/Button\s*>/u,
		);
	});

	it("keeps the primary scored-check action available after every card is revealed", () => {
		assert.match(
			source,
			/\{#if allRevealed\}[\s\S]*?<Button[^>]*variant="primary"[^>]*onclick=\{onComplete\}[\s\S]*?Start the scored check[\s\S]*?<\/Button>[\s\S]*?\{\/if\}/u,
		);
	});
});
