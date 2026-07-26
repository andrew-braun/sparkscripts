import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LessonCatalogEntry } from "$lib/data/types";

const STORAGE_KEY = "glyphbridge_progress";

const catalog: LessonCatalogEntry[] = [
	{
		id: 1,
		stage: 1,
		title: "First letters",
		anchorWord: {
			thai: "กา",
			meaning: "crow",
			pronunciation: "gaa",
			category: "daily",
			syllables: [{ thai: "กา", sound: "gaa" }],
		},
		vocabulary: [],
		newLetters: [
			{
				character: "ก",
				romanization: "g",
				pronunciation: "hard g",
				type: "consonant",
				mnemonic: "a chicken",
			},
			{
				character: "า",
				romanization: "aa",
				pronunciation: "long a",
				type: "vowel",
				mnemonic: "a long stroke",
			},
		],
		drills: [],
	},
	{
		id: 2,
		stage: 1,
		title: "Second lesson",
		anchorWord: {
			thai: "ตา",
			meaning: "eye",
			pronunciation: "dtaa",
			category: "daily",
			syllables: [{ thai: "ตา", sound: "dtaa" }],
		},
		vocabulary: [],
		newLetters: [
			{
				character: "ต",
				romanization: "dt",
				pronunciation: "hard t",
				type: "consonant",
				mnemonic: "a turtle",
			},
		],
		drills: [],
	},
];

// The progress store is a module-level singleton with an init-once guard, so
// each scenario resets the module registry and re-imports for a clean instance.
async function loadStore() {
	vi.resetModules();
	return import("./progress.ts");
}

beforeEach(() => {
	localStorage.clear();
});

describe("progress store — initialization", () => {
	it("starts from empty progress when storage is empty", async () => {
		const store = await loadStore();
		store.initProgress(catalog);

		const value = get(store.progress);
		expect(value.currentLessonId).toBe(1);
		expect(value.knownLetters).toEqual([]);
		expect(value.knownWords).toEqual([]);
		expect(value.lessonProgress).toEqual([]);
	});

	it("recovers to empty progress when stored JSON is corrupted", async () => {
		localStorage.setItem(STORAGE_KEY, "{not valid json");
		const store = await loadStore();
		store.initProgress(catalog);

		const value = get(store.progress);
		expect(value.currentLessonId).toBe(1);
		expect(value.lessonProgress).toEqual([]);
	});

	it("rehydrates completed lessons from a valid v3 snapshot", async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				version: 3,
				progress: {
					lessonProgress: [
						{
							lessonId: 1,
							learningCompleted: true,
							practicePassed: true,
							practicePassedAt: "2026-01-01T00:00:00.000Z",
							practiceAttempts: 1,
							bestPracticeScore: 90,
							latestPracticeScore: 90,
						},
					],
				},
			}),
		);
		const store = await loadStore();
		store.initProgress(catalog);

		const value = get(store.progress);
		expect(value.knownLetters).toContain("ก");
		expect(value.knownWords.map((word) => word.thai)).toContain("กา");
		expect(value.currentLessonId).toBe(2);
	});
});

describe("progress store — mutations", () => {
	it("derives known letters after completing lesson learning", async () => {
		const store = await loadStore();
		store.initProgress(catalog);
		store.completeLessonLearning(1);

		const value = get(store.progress);
		expect(value.knownLetters).toEqual(expect.arrayContaining(["ก", "า"]));
		expect(get(store.knownLetters)).toEqual(expect.arrayContaining(["ก", "า"]));
	});

	it("is idempotent when learning completion is recorded twice", async () => {
		const store = await loadStore();
		store.initProgress(catalog);
		const first = store.completeLessonLearning(1);
		const second = store.completeLessonLearning(1);

		const value = get(store.progress);
		expect(value.lessonProgress).toHaveLength(1);
		expect(value.lessonProgress[0].learningCompleted).toBe(true);
		expect(second?.learningCompletedAt).toBe(first?.learningCompletedAt);
	});

	it("marks a word known and advances the current lesson on a passing practice attempt", async () => {
		const store = await loadStore();
		store.initProgress(catalog);
		const result = store.recordLessonPracticeAttempt(1, 80);

		expect(result?.practicePassed).toBe(true);
		expect(result?.shouldSync).toBe(true);

		const value = get(store.progress);
		expect(value.knownWords.map((word) => word.thai)).toContain("กา");
		expect(value.currentLessonId).toBe(2);
	});

	it("does not pass practice below the threshold", async () => {
		const store = await loadStore();
		store.initProgress(catalog);
		const result = store.recordLessonPracticeAttempt(1, 40);

		expect(result?.practicePassed).toBe(false);
		expect(get(store.progress).currentLessonId).toBe(1);
	});

	it("persists progress to localStorage", async () => {
		const store = await loadStore();
		store.initProgress(catalog);
		store.recordLessonPracticeAttempt(1, 80);

		const raw = localStorage.getItem(STORAGE_KEY);
		expect(raw).not.toBeNull();
		const stored = JSON.parse(raw as string);
		expect(stored.version).toBe(3);
		expect(stored.progress.lessonProgress[0].practicePassed).toBe(true);
	});
});

describe("progress store — server reconciliation", () => {
	it("merges a newer server projection that completes a lesson", async () => {
		const store = await loadStore();
		store.initProgress(catalog);
		store.applyLearnerProjection({
			publicationId: "pub-1",
			courseVersionId: "ver-1",
			enrollmentId: "enr-1",
			currentLessonId: 2,
			resumeLessonId: 2,
			completedLessonIds: [1],
			lessons: [
				{
					lessonId: 1,
					lessonSlug: "first",
					status: "completed",
					bestScore: 95,
					latestScore: 95,
					attemptCount: 2,
					firstCompletedAt: "2026-01-01T00:00:00.000Z",
					lastAttemptAt: "2026-01-02T00:00:00.000Z",
				},
			],
			syncedAt: "2026-01-02T00:00:00.000Z",
		});

		const value = get(store.progress);
		const entry = value.lessonProgress.find((lesson) => lesson.lessonId === 1);
		expect(entry?.practicePassed).toBe(true);
		expect(entry?.bestPracticeScore).toBe(95);
		expect(value.knownWords.map((word) => word.thai)).toContain("กา");
		expect(value.currentLessonId).toBe(2);
	});
});
