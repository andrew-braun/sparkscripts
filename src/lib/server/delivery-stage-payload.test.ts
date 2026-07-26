import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { DeliveryPayloadError, mapPublishedStagePayload } from "./delivery-payload.ts";

describe("mapPublishedStagePayload", () => {
	it("maps a complete stage payload", () => {
		assert.deepEqual(
			mapPublishedStagePayload({
				ordinal: 3,
				title: "Before Vowels And Tone Marks",
				summary: "Scan left and above before reading.",
			}),
			{
				ordinal: 3,
				title: "Before Vowels And Tone Marks",
				summary: "Scan left and above before reading.",
			},
		);
	});

	it("rejects incomplete and non-positive stage payloads", () => {
		assert.throws(
			() => mapPublishedStagePayload({ ordinal: 0, title: "Stage", summary: "Summary" }),
			DeliveryPayloadError,
		);
		assert.throws(
			() => mapPublishedStagePayload({ ordinal: 1, title: "Stage" }),
			DeliveryPayloadError,
		);
	});
});
