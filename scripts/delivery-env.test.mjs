import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { resolveDeliveryCredentials } from "./delivery-env.mjs";

describe("resolveDeliveryCredentials", () => {
	it("uses the server-side delivery variables shared by builds and smoke tests", () => {
		assert.deepEqual(
			resolveDeliveryCredentials(
				{},
				{
					SUPABASE_DELIVERY_URL: "http://delivery.test",
					SUPABASE_DELIVERY_ANON_KEY: "delivery-key",
				},
			),
			{ url: "http://delivery.test", anonKey: "delivery-key" },
		);
	});

	it("retains public and local CLI variable fallbacks", () => {
		assert.deepEqual(
			resolveDeliveryCredentials(
				{ PUBLIC_SUPABASE_URL: "http://public.test" },
				{ PUBLISHABLE_KEY: "public-key" },
			),
			{ url: "http://public.test", anonKey: "public-key" },
		);
	});
});
