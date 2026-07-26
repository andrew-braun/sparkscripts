import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { resolveLetterTips } from "../data/tips.ts";
import { DeliveryPayloadError, mapPublishedLessonPayload } from "./delivery-payload.ts";

function buildLessonPayload(lessonOverrides: Record<string, unknown> = {}) {
	return {
		course: {
			id: "course-1",
			slug: "thai",
			versionId: "version-1",
			displayVersion: "1.0.0",
		},
		lesson: {
			id: "lesson-1",
			slug: "sample",
			lessonOrdinal: 1,
			stage: 1,
			title: "Sample",
			anchor: {
				id: "anchor-1",
				slug: "sample",
				text: "กา",
				meaning: "crow",
				pronunciation: "gaa",
				categoryKey: "daily",
				segments: [{ text: "กา", sound: "gaa" }],
			},
			vocabulary: [],
			tips: [
				{
					id: "sound-romanization",
					title: "Romanization",
					body: "Popover body",
				},
				{
					id: "consonant-class-tones",
					title: "Consonant class & tone",
					body: "Modal lead",
					display: "modal",
					sections: [{ heading: "Section", body: "More detail" }],
				},
			],
			newGraphemes: [
				{
					id: "grapheme-1",
					text: "ก",
					kind: "consonant",
					romanization: "g/k",
					pronunciationHint: "hard g/k sound",
					mnemonic: "A mnemonic",
					position: "standalone",
					details: { class: "mid" },
					tipRefs: { sound: "sound-romanization", type: "consonant-class-tones" },
					tags: [],
				},
			],
			reviewGraphemes: [],
			rules: [],
			drills: [],
			...lessonOverrides,
		},
	};
}

describe("mapPublishedLessonPayload — tip mapping", () => {
	it("resolves grapheme tip refs into full tip objects", () => {
		const lesson = mapPublishedLessonPayload(buildLessonPayload());
		const tips = lesson.newLetters[0].tips;
		assert.equal(tips?.sound?.id, "sound-romanization");
		assert.equal(tips?.type?.display, "modal");
		assert.equal(tips?.type?.sections?.[0]?.heading, "Section");
		assert.equal(tips?.type?.sections?.[0]?.body, "More detail");
	});

	it("throws when a grapheme references a tip id that does not exist", () => {
		assert.throws(
			() =>
				mapPublishedLessonPayload(
					buildLessonPayload({
						newGraphemes: [
							{
								id: "grapheme-1",
								text: "ก",
								kind: "consonant",
								romanization: "g/k",
								pronunciationHint: "hard g/k sound",
								mnemonic: "A mnemonic",
								position: "standalone",
								details: { class: "mid" },
								tipRefs: { type: "missing-tip" },
								tags: [],
							},
						],
					}),
				),
			DeliveryPayloadError,
		);
	});
});

describe("mapPublishedLessonPayload — payload validation", () => {
	it("throws DeliveryPayloadError for a non-record payload", () => {
		assert.throws(() => mapPublishedLessonPayload(null), DeliveryPayloadError);
		assert.throws(() => mapPublishedLessonPayload("nope"), DeliveryPayloadError);
	});

	it("throws when a required lesson field is missing", () => {
		assert.throws(
			() => mapPublishedLessonPayload(buildLessonPayload({ title: "" })),
			DeliveryPayloadError,
		);
	});

	it("throws when a required field has the wrong type", () => {
		assert.throws(
			() => mapPublishedLessonPayload(buildLessonPayload({ lessonOrdinal: "1" })),
			DeliveryPayloadError,
		);
	});
});

describe("resolveLetterTips", () => {
	it("applies a local tip override by id", () => {
		const resolved = resolveLetterTips({
			character: "ก",
			romanization: "g/k",
			pronunciation: "hard g/k sound",
			type: "consonant",
			class: "mid",
			mnemonic: "A mnemonic",
			position: "standalone",
			tipOverrides: { type: "sound-romanization" },
		});
		assert.equal(resolved.type?.id, "sound-romanization");
	});
});
