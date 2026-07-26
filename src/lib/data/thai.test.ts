import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { thaiPack } from "./thai.ts";

describe("thai course stages", () => {
	it("publishes one complete, ordered definition for every lesson stage", () => {
		assert.equal(thaiPack.stages.length, 14);
		assert.deepEqual(
			thaiPack.stages.map((stage) => stage.ordinal),
			Array.from({ length: 14 }, (_, index) => index + 1),
		);

		const authoredStageOrdinals = new Set(thaiPack.stages.map((stage) => stage.ordinal));
		for (const lesson of thaiPack.lessons) {
			assert.ok(
				authoredStageOrdinals.has(lesson.stage),
				`lesson ${lesson.id} references missing stage ${lesson.stage}`,
			);
		}

		for (const stage of thaiPack.stages) {
			assert.ok(stage.title.trim().length > 0);
			assert.ok(stage.summary.trim().length > 0);
		}
	});
});
