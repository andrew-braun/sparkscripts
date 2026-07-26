import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { readLessonCompletionAttempts } from "./learner-sync-input.ts";

const VALID_PUBLICATION_ID = "123e4567-e89b-12d3-a456-426614174000";

function validAttempt(overrides: Record<string, unknown> = {}) {
	return {
		clientAttemptId: "attempt-1",
		publicationId: VALID_PUBLICATION_ID,
		lessonId: 1,
		score: 80,
		completedAt: "2026-07-26T00:00:00.000Z",
		...overrides,
	};
}

function body(attempts: unknown) {
	return { attempts };
}

describe("readLessonCompletionAttempts", () => {
	it("accepts a minimal valid batch and preserves fields", () => {
		const result = readLessonCompletionAttempts(body([validAttempt()]));
		assert.deepEqual(result, [
			{
				clientAttemptId: "attempt-1",
				publicationId: VALID_PUBLICATION_ID,
				lessonId: 1,
				score: 80,
				completedAt: "2026-07-26T00:00:00.000Z",
			},
		]);
	});

	it("includes optional timeSpentMs only when present", () => {
		const withTime = readLessonCompletionAttempts(body([validAttempt({ timeSpentMs: 1000 })]));
		assert.equal(withTime?.[0].timeSpentMs, 1000);

		const withoutTime = readLessonCompletionAttempts(body([validAttempt()]));
		assert.equal("timeSpentMs" in (withoutTime?.[0] ?? {}), false);
	});

	it("rejects a non-record body or a missing attempts array", () => {
		assert.equal(readLessonCompletionAttempts(null), null);
		assert.equal(readLessonCompletionAttempts("nope"), null);
		assert.equal(readLessonCompletionAttempts({}), null);
		assert.equal(readLessonCompletionAttempts({ attempts: "x" }), null);
	});

	it("enforces attempt-count bounds", () => {
		assert.equal(readLessonCompletionAttempts(body([])), null);
		const tooMany = Array.from({ length: 51 }, (_, i) =>
			validAttempt({ clientAttemptId: `attempt-${i}` }),
		);
		assert.equal(readLessonCompletionAttempts(body(tooMany)), null);
		const exactlyMax = Array.from({ length: 50 }, (_, i) =>
			validAttempt({ clientAttemptId: `attempt-${i}` }),
		);
		assert.equal(readLessonCompletionAttempts(body(exactlyMax))?.length, 50);
	});

	it("rejects duplicate client attempt ids", () => {
		const dupe = [validAttempt(), validAttempt()];
		assert.equal(readLessonCompletionAttempts(body(dupe)), null);
	});

	it("rejects malformed client attempt ids", () => {
		assert.equal(
			readLessonCompletionAttempts(body([validAttempt({ clientAttemptId: "" })])),
			null,
		);
		assert.equal(
			readLessonCompletionAttempts(body([validAttempt({ clientAttemptId: "has space" })])),
			null,
		);
		assert.equal(
			readLessonCompletionAttempts(body([validAttempt({ clientAttemptId: "a".repeat(65) })])),
			null,
		);
	});

	it("rejects non-UUID publication ids", () => {
		assert.equal(
			readLessonCompletionAttempts(body([validAttempt({ publicationId: "not-a-uuid" })])),
			null,
		);
	});

	it("rejects invalid lesson ids", () => {
		assert.equal(readLessonCompletionAttempts(body([validAttempt({ lessonId: 0 })])), null);
		assert.equal(readLessonCompletionAttempts(body([validAttempt({ lessonId: 1.5 })])), null);
		assert.equal(readLessonCompletionAttempts(body([validAttempt({ lessonId: "1" })])), null);
	});

	it("rejects out-of-range or non-integer scores", () => {
		assert.equal(readLessonCompletionAttempts(body([validAttempt({ score: -1 })])), null);
		assert.equal(readLessonCompletionAttempts(body([validAttempt({ score: 101 })])), null);
		assert.equal(readLessonCompletionAttempts(body([validAttempt({ score: 80.5 })])), null);
	});

	it("rejects unparseable completedAt timestamps", () => {
		assert.equal(
			readLessonCompletionAttempts(body([validAttempt({ completedAt: "not-a-date" })])),
			null,
		);
		assert.equal(
			readLessonCompletionAttempts(body([validAttempt({ completedAt: 123 })])),
			null,
		);
	});

	it("rejects out-of-range timeSpentMs but allows the day boundary", () => {
		assert.equal(readLessonCompletionAttempts(body([validAttempt({ timeSpentMs: -1 })])), null);
		assert.equal(
			readLessonCompletionAttempts(body([validAttempt({ timeSpentMs: 86_400_001 })])),
			null,
		);
		assert.equal(
			readLessonCompletionAttempts(body([validAttempt({ timeSpentMs: 86_400_000 })]))?.[0]
				.timeSpentMs,
			86_400_000,
		);
	});

	it("rejects the whole batch when any single attempt is invalid", () => {
		const mixed = [validAttempt(), validAttempt({ clientAttemptId: "attempt-2", score: 200 })];
		assert.equal(readLessonCompletionAttempts(body(mixed)), null);
	});
});
