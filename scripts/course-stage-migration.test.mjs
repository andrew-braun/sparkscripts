import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = resolve(repoRoot, "supabase", "migrations");

describe("course stage migration", () => {
	it("adds private curriculum stages and active-publication-only delivery stages", () => {
		const migrationName = readdirSync(migrationsDir).find((name) =>
			name.endsWith("_course_stage_publication.sql"),
		);
		assert.ok(migrationName, "course stage migration is missing");

		const sql = readFileSync(resolve(migrationsDir, migrationName), "utf8");
		assert.match(sql, /create table curriculum\.course_stages/u);
		assert.match(sql, /create table delivery\.course_publication_stages/u);
		assert.match(sql, /revoke all on curriculum\.course_stages/u);
		assert.match(sql, /enable row level security/u);
		assert.match(sql, /cp\.is_active = true/u);
		assert.match(sql, /expected 46 lessons/u);
		assert.doesNotMatch(sql, /update curriculum\.course_versions/u);
		assert.doesNotMatch(sql, /set content_hash = stage_content_hash/u);
		assert.match(sql, /update delivery\.course_publications/u);
	});
});
