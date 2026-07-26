import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { describe, it } from "vitest";

const source = readFileSync(new URL("./MainNav.svelte", import.meta.url), "utf8");

describe("MainNav logo sizing", () => {
	it("constrains the SVG image inside its flex logo mark", () => {
		assert.match(
			source,
			/&-mark\s*\{[\s\S]*img\s*\{[\s\S]*height:\s*100%;[\s\S]*width:\s*100%;/u,
		);
		assert.match(
			source,
			/&-mark\s*\{[\s\S]*img\s*\{[\s\S]*max-height:\s*100%;[\s\S]*max-width:\s*100%;/u,
		);
	});
});
