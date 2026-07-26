import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { generateThaiSeedSql } from "./generate-thai-seed.mjs";

describe("Thai seed generator", () => {
	it("publishes all stage metadata through curriculum and delivery tables", () => {
		const sql = generateThaiSeedSql();

		assert.match(sql, /insert into curriculum\.course_stages/u);
		assert.match(sql, /insert into delivery\.course_publication_stages/u);
		assert.match(sql, /Runtime First Decoding Wins/u);
		assert.match(sql, /Historical Glyphs/u);
	});
});
