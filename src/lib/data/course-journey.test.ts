import assert from "node:assert/strict";

import { describe, it } from "vitest";

import {
	appProgressFromLearnerProjection,
	buildCourseJourney,
	buildCourseProgressStats,
	countsAsKnownWord,
	getCourseJourneyLesson,
	isSoundPractice,
	SOUND_PRACTICE_EXPLANATION,
} from "./course-journey.ts";
import type {
	AppProgress,
	LanguagePack,
	Lesson,
	LessonProgress,
	LessonVocabularyEntry,
} from "./types.ts";

function lesson(id: number, stage: number): Lesson {
	return {
		id,
		stage,
		title: `Lesson ${id}`,
		anchorWord: {
			thai: `คำ${id}`,
			meaning: `Word ${id}`,
			pronunciation: `word ${id}`,
			category: "daily",
			syllables: [],
		},
		vocabulary: [],
		newLetters: [],
		rulesIntroduced: [],
		drills: [],
	};
}

const pack: LanguagePack = {
	id: "thai",
	name: "Thai",
	nativeName: "ภาษาไทย",
	direction: "ltr",
	stages: [
		{ ordinal: 1, title: "First reads", summary: "Decode useful words." },
		{ ordinal: 2, title: "Reusable frames", summary: "Build on known patterns." },
		{ ordinal: 3, title: "Leading vowels", summary: "Read around the consonant." },
	],
	lessons: [lesson(1, 1), lesson(2, 1), lesson(3, 2), lesson(4, 3)],
};

function progress(entries: LessonProgress[] = []): AppProgress {
	return {
		knownLetters: [],
		knownWords: [],
		lessonProgress: entries,
		currentLessonId: 1,
	};
}

function passed(lessonId: number): LessonProgress {
	return {
		lessonId,
		learningCompleted: true,
		practiceAttempts: 1,
		practicePassed: true,
	};
}

describe("buildCourseJourney", () => {
	it("derives an individual lesson gate from a catalog without stage display data", () => {
		const catalog = { stages: [], lessons: pack.lessons };
		const lesson = getCourseJourneyLesson(
			catalog,
			progress([
				{
					lessonId: 1,
					learningCompleted: true,
					practiceAttempts: 1,
					practicePassed: true,
				},
			]),
			1,
		);

		assert.deepEqual(
			{
				learnUnlocked: lesson?.learnUnlocked,
				practiceUnlocked: lesson?.practiceUnlocked,
				practicePassed: lesson?.practicePassed,
			},
			{
				learnUnlocked: true,
				practiceUnlocked: true,
				practicePassed: true,
			},
		);
	});

	it("opens only the first stage for a new learner", () => {
		const journey = buildCourseJourney(pack, progress());

		assert.deepEqual(
			journey.stages.map((stage) => ({
				ordinal: stage.ordinal,
				state: stage.state,
				showLessons: stage.showLessons,
			})),
			[
				{ ordinal: 1, state: "current", showLessons: true },
				{ ordinal: 2, state: "locked", showLessons: false },
				{ ordinal: 3, state: "locked", showLessons: false },
			],
		);
		assert.deepEqual(journey.resumeTarget, {
			lessonId: 1,
			phase: "learn",
			href: "/learn/1",
		});
	});

	it("collapses completed stages and opens the current stage", () => {
		const journey = buildCourseJourney(pack, progress([passed(1), passed(2)]));

		assert.equal(journey.stages[0].state, "complete");
		assert.equal(journey.stages[0].showLessons, true);
		assert.equal(journey.stages[0].defaultExpanded, false);
		assert.equal(journey.stages[1].state, "current");
		assert.equal(journey.stages[1].defaultExpanded, true);
		assert.equal(journey.stages[2].showLessons, false);
	});

	it("resumes practice after the learning phase is complete", () => {
		const journey = buildCourseJourney(
			pack,
			progress([
				{
					lessonId: 1,
					learningCompleted: true,
					practiceAttempts: 0,
					practicePassed: false,
				},
			]),
		);

		assert.deepEqual(journey.resumeTarget, {
			lessonId: 1,
			phase: "practice",
			href: "/learn/1/practice",
		});
	});

	it("sends a learner who passed every lesson to review", () => {
		const journey = buildCourseJourney(
			pack,
			progress(pack.lessons.map((entry) => passed(entry.id))),
		);

		assert.equal(journey.isComplete, true);
		assert.ok(journey.stages.every((stage) => stage.state === "complete"));
		assert.deepEqual(journey.resumeTarget, {
			lessonId: 4,
			phase: "review",
			href: "/practice",
		});
	});
});

describe("countsAsKnownWord", () => {
	it("excludes sound-only targets while retaining real words and phrases", () => {
		const entry = (sourceType: LessonVocabularyEntry["sourceType"]) =>
			({ sourceType }) as LessonVocabularyEntry;

		assert.equal(countsAsKnownWord(entry("real")), true);
		assert.equal(countsAsKnownWord(entry("phrase")), true);
		assert.equal(countsAsKnownWord(entry("nonsense")), false);
		assert.equal(isSoundPractice(entry("nonsense")), true);
		assert.equal(isSoundPractice(entry("real")), false);
		assert.equal(
			SOUND_PRACTICE_EXPLANATION,
			"Made for reading practice — not a real Thai word.",
		);
	});
});

describe("buildCourseProgressStats", () => {
	it("counts learned letters and real lexical targets without sound practice", () => {
		const firstLesson = pack.lessons[0];
		firstLesson.newLetters = [
			{
				character: "ก",
				romanization: "g",
				pronunciation: "g",
				type: "consonant",
				mnemonic: "chicken",
			},
		];
		firstLesson.vocabulary = [
			{
				tier: "core",
				sourceType: "nonsense",
				drillTarget: false,
				word: {
					thai: "กม",
					meaning: "sound practice",
					pronunciation: "gom",
					category: "daily",
					syllables: [],
				},
			},
		];

		assert.deepEqual(buildCourseProgressStats(pack, progress([passed(1)])), {
			knownLetterCount: 1,
			knownWordCount: 1,
		});
	});
});

describe("appProgressFromLearnerProjection", () => {
	it("turns completed server lessons into passed local journey state", () => {
		const mapped = appProgressFromLearnerProjection({
			publicationId: "publication",
			courseVersionId: "version",
			enrollmentId: "enrollment",
			currentLessonId: 2,
			resumeLessonId: 2,
			completedLessonIds: [1],
			lessons: [
				{
					lessonId: 1,
					lessonSlug: "one",
					status: "completed",
					bestScore: 100,
					latestScore: 100,
					attemptCount: 1,
					firstCompletedAt: "2026-07-14T00:00:00.000Z",
					lastAttemptAt: "2026-07-14T00:00:00.000Z",
				},
			],
			syncedAt: "2026-07-14T00:00:00.000Z",
		});

		assert.equal(mapped.currentLessonId, 2);
		assert.equal(mapped.lessonProgress[0].learningCompleted, true);
		assert.equal(mapped.lessonProgress[0].practicePassed, true);
	});

	it("resumes practice when a server lesson has an unsuccessful attempt", () => {
		const mapped = appProgressFromLearnerProjection({
			publicationId: "publication",
			courseVersionId: "version",
			enrollmentId: "enrollment",
			currentLessonId: 1,
			resumeLessonId: 1,
			completedLessonIds: [],
			lessons: [
				{
					lessonId: 1,
					lessonSlug: "one",
					status: "in_progress",
					bestScore: 40,
					latestScore: 40,
					attemptCount: 1,
					firstCompletedAt: null,
					lastAttemptAt: "2026-07-14T00:00:00.000Z",
				},
			],
			syncedAt: "2026-07-14T00:00:00.000Z",
		});

		assert.equal(mapped.lessonProgress[0].learningCompleted, true);
		assert.equal(mapped.lessonProgress[0].practicePassed, false);
		assert.deepEqual(buildCourseJourney(pack, mapped).resumeTarget, {
			lessonId: 1,
			phase: "practice",
			href: "/learn/1/practice",
		});
	});
});
