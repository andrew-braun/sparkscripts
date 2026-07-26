# Task: Multi-course script architecture

- Start date: 2026-04-22
- Owner: GitHub Copilot
- Status: planned

## Related Docs

- `README.md` for the bundle index and redundancy assessment
- `thai-curriculum-strategy.md` for Thai-specific sequencing strategy
- `thai-audio-pronunciation-strategy.md` for the pronunciation workstream
- `../supabase-db-foundation/foundation-plan.md` for the database-side architecture this plan now depends on

## Goal

Define a simple, scalable architecture for evolving Glyphin from a Thai-only app into a multi-course reading app that can launch with Thai, Georgian, Greek, Ukrainian, and Korean, while making future script and course additions standardized and low-friction.

## Scope

- In scope:
  - Product/domain model for multi-course support
  - Route and UI architecture for course-aware navigation
  - Database-first curriculum and progress model, assuming PostgreSQL
  - Migration path from current Thai-only content and storage
  - Content authoring and scaling approach
- Out of scope:
  - Implementation work
  - Database provisioning
  - Authentication and user-account implementation
  - Admin CMS design

## Constraints

- Technical:
  - Keep the front-end architecture simple and avoid pushing SQL concerns into route or component code.
  - Preserve the current lesson flow shape unless a concrete course requires otherwise.
  - Avoid over-normalizing script metadata before a real reuse case exists.
- Product:
  - The product teaches reading through real words, not abstract alphabet charts alone.
  - Launch courses should feel consistent in structure while leaving room for script-specific teaching details.
  - Adding a new course should be mostly content work, not app rewiring.
- Security:
  - Database-backed reads and writes should stay behind server-only boundaries.
  - Any later auth, database, or storage rollout requires explicit review before deployment.

## Summary Recommendation

Treat each launch offering as a `course`, not just a raw `script`.

- `course` is the public-facing learning unit: Thai, Georgian, Greek, Ukrainian, Korean.
- `script_system` is supporting metadata for rendering and shared writing-system facts.
- PostgreSQL should become the canonical runtime source for curriculum and progress once the database is ready.
- Routes and components should consume a stable course-shaped DTO through a single server-side curriculum mapping layer.
- Canonical learner state should store only course-scoped lesson progress; known letters, words, counts, and unlock state should be derived.

This is the simplest architecture that still scales cleanly.

## Why This Model

The current app is not just teaching a script. It teaches real words, meanings, breakdowns, rules, and drills in a specific language context. That makes `course` the correct product abstraction.

Separating `script_system` from `course` still matters because rendering concerns, grapheme grouping, font preferences, and some writing-system metadata may be reusable later. But those concerns should support the course model, not replace it.

## Current Coupling To Remove

The current codebase is mostly generic at the container level, but several important surfaces are hard-bound to Thai:

- [src/lib/data/types.ts](/home/andri/code/projects/glyphbridge/src/lib/data/types.ts) uses Thai-named fields like `Word.thai` and `SyllableBreakdown.thai`.
- [src/lib/stores/progress.ts](/home/andri/code/projects/glyphbridge/src/lib/stores/progress.ts) imports `thaiPack` directly, uses a single global localStorage key, and stores redundant derived state.
- [src/routes/+page.svelte](/home/andri/code/projects/glyphbridge/src/routes/+page.svelte) and [src/lib/components/content/home/HomeHero.svelte](/home/andri/code/projects/glyphbridge/src/lib/components/content/home/HomeHero.svelte) market a Thai-only product.
- [src/routes/learn/+page.svelte](/home/andri/code/projects/glyphbridge/src/routes/learn/+page.svelte), [src/routes/learn/[id]/+page.ts](/home/andri/code/projects/glyphbridge/src/routes/learn/[id]/+page.ts), and [src/routes/learn/[id]/+page.svelte](/home/andri/code/projects/glyphbridge/src/routes/learn/[id]/+page.svelte) assume one curriculum and numeric lesson IDs.
- [src/routes/alphabet/+page.svelte](/home/andri/code/projects/glyphbridge/src/routes/alphabet/+page.svelte) assumes only consonants and vowels and hardcodes Thai-specific letter detail fields.
- [src/app.html](/home/andri/code/projects/glyphbridge/src/app.html) assumes Thai-specific font loading.

## Target Architecture

### 1. Domain model

Use the following core concepts:

- `script_system`
  - Writing-system metadata used for rendering and grouping.
  - Examples: Thai, Hangul, Georgian, Greek, Cyrillic.
- `course`
  - A learner-facing curriculum built around a specific language and its real words.
  - Examples: Thai, Korean, Ukrainian.
- `lesson`
  - Ordered unit in a course.
  - Anchored on one real word or tightly related reading target.
- `grapheme`
  - The smallest teachable script unit surfaced in the app.
  - Covers letters, vowel signs, jamo, diacritics, tone marks, or other script-specific pieces.
- `word`
  - Anchor vocabulary item with meaning, pronunciation, and ordered segment breakdown.
- `rule`
  - Human-readable orthographic or phonetic teaching point.
- `drill`
  - Standardized practice item attached to a lesson.

### 2. Front-end DTOs

Routes and components should consume a generic DTO layer instead of raw SQL rows.

Recommended front-end type direction:

- `Word.thai` -> `Word.text`
- `SyllableBreakdown.thai` -> `WordSegment.text`
- `Lesson.id: number` -> `Lesson.slug: string`
- `Letter` -> `Grapheme`
- `reviewLetters` -> `reviewGraphemes`

Recommended DTO shape direction:

```ts
type CourseSummary = {
	id: string;
	slug: string;
	name: string;
	nativeName: string;
	scriptSystemSlug: string;
	direction: "ltr" | "rtl";
	heroTitle: string;
	heroSubtitle: string;
	seoTitle: string;
	seoDescription: string;
	fontClass?: string;
};

type Grapheme = {
	id: string;
	text: string;
	romanization: string;
	pronunciation: string;
	kind: string;
	groupKey: string;
	groupLabel: string;
	mnemonic?: string;
	details?: Array<{ label: string; value: string }>;
	tags?: string[];
};

type WordSegment = {
	text: string;
	sound: string;
};

type CourseWord = {
	id: string;
	text: string;
	meaning: string;
	pronunciation: string;
	category?: string;
	segments: WordSegment[];
	contextNote?: string;
};

type Lesson = {
	id: string;
	slug: string;
	stage: number;
	title: string;
	anchorWord: CourseWord;
	newGraphemes: Grapheme[];
	rulesIntroduced: Rule[];
	drills: DrillQuestion[];
	reviewGraphemes?: string[];
};
```

Important point: do not try to standardize every script-specific nuance into top-level fields. Use `details[]`, `tags[]`, and tightly owned metadata where needed.

### 3. Route strategy

Use course-slug URLs.

- `/`
  - Course directory or featured-course landing page.
- `/:course/learn`
  - Course lesson index.
- `/:course/learn/:lesson`
  - Lesson detail page.
- `/:course/alphabet`
  - Grapheme inventory page for that course.
- `/:course/words`
  - Known words page for that course.
- `/:course/practice`
  - Practice surface for that course.

Reasons:

- Clear course scoping for navigation and progress.
- Better bookmarking and SEO.
- Makes it obvious when the user is in Thai versus Korean.
- Avoids ambiguous global state.

### 4. Server-side curriculum boundary

Do not let route files or components know database table structure.

Add one server-only curriculum layer that exposes a small set of functions such as:

- `listCourses()`
- `getCourseSummary(courseSlug)`
- `listLessons(courseSlug)`
- `getLesson(courseSlug, lessonSlug)`
- `getAlphabet(courseSlug)`
- `getKnownWords(courseSlug, progress)`

This boundary should be the only place that:

- Joins curriculum tables
- Applies ordering rules
- Maps rows into front-end DTOs
- Hides whether the backing source is static TS data or PostgreSQL

This keeps migration cheap and implementation boring.

## PostgreSQL Content Model

The database should be normalized enough to query and validate well, but not turned into a generic CMS.

### Core tables

- `script_systems`
  - `id`
  - `slug`
  - `name`
  - `native_name`
  - `direction`
  - `metadata jsonb`

- `courses`
  - `id`
  - `slug`
  - `name`
  - `native_name`
  - `script_system_id`
  - `hero_title`
  - `hero_subtitle`
  - `seo_title`
  - `seo_description`
  - `ui_config jsonb`
  - `is_published`

- `graphemes`
  - `id`
  - `course_id`
  - `slug`
  - `text`
  - `romanization`
  - `pronunciation`
  - `kind`
  - `group_key`
  - `group_label`
  - `mnemonic`
  - `details jsonb`
  - `tags text[]`
  - `sort_order`

- `words`
  - `id`
  - `course_id`
  - `slug`
  - `text`
  - `meaning`
  - `pronunciation`
  - `category`
  - `context_note`

- `word_segments`
  - `id`
  - `word_id`
  - `segment_order`
  - `text`
  - `sound`

- `rules`
  - `id`
  - `course_id`
  - `slug`
  - `name`
  - `short_description`
  - `explanation`

- `rule_examples`
  - `id`
  - `rule_id`
  - `example_order`
  - `text`

- `lessons`
  - `id`
  - `course_id`
  - `slug`
  - `lesson_order`
  - `stage`
  - `title`
  - `anchor_word_id`

- `lesson_graphemes`
  - `lesson_id`
  - `grapheme_id`
  - `introduced_order`
  - `is_review`

- `lesson_rules`
  - `lesson_id`
  - `rule_id`
  - `rule_order`

- `drills`
  - `id`
  - `lesson_id`
  - `drill_order`
  - `type`
  - `prompt`
  - `hint`
  - `correct_option_index`

- `drill_options`
  - `id`
  - `drill_id`
  - `option_order`
  - `text`

### Notes on database design

- Scope most curriculum tables to `course_id` unless a concrete reuse case exists.
- Prefer explicit ordered child rows over burying important sequence data in `jsonb`.
- Use `jsonb` only for tightly owned optional metadata, such as grapheme detail rows or course UI config.
- Keep all slugs stable and unique within their parent scope.

## Progress Model

Redesign learner state to store only canonical progress facts.

### Canonical stored state

- `user_course_progress`
  - `user_id`
  - `course_id`
  - `current_lesson_id`
  - `started_at`
  - `updated_at`

- `user_lesson_progress`
  - `user_id`
  - `course_id`
  - `lesson_id`
  - `completed`
  - `drill_score`
  - `completed_at`

### Derived state

Do not store these canonically:

- known graphemes
- known words
- total counts
- unlocked lessons

Those values should be computed from completed lessons and the curriculum mapping layer.

### Local fallback before auth exists

Until database-backed user progress is active, keep a localStorage fallback keyed by course slug.

Example:

- `glyphbridge_progress_thai`
- `glyphbridge_progress_korean`

Even in local storage, persist only lesson progress and active lesson pointer.

## UI and Content Implications

### Landing and navigation

- Convert the home page into a multi-course entry surface.
- Make navigation course-aware so links preserve the active course.
- Pull hero copy, SEO title, and description from course metadata rather than hardcoding Thai copy.

### Alphabet page

The current alphabet page assumes two fixed groups: consonants and vowels.

Replace that with data-driven grapheme groups:

- `groupKey`
- `groupLabel`
- ordered grapheme list per group

That supports Thai consonants and vowels, Korean jamo grouping, Georgian letter groups, and any future script variation without rewriting the page.

### Lesson detail surfaces

The current lesson letter UI hardcodes Thai-specific details such as consonant class and writing position.

Replace those hardcoded rows with generic labeled facts from the data layer.

That keeps the UI simple while still supporting Thai tone-class facts, Korean articulation notes, or other course-specific teaching details.

### Fonts and script rendering

Stop assuming one Thai-oriented font setup globally.

Instead:

- keep a neutral UI font stack
- attach course or script font metadata to the course summary
- load script-specific fonts intentionally when needed
- use course-aware classes rather than `.thai` as the long-term naming pattern

## Authoring and Scaling Approach

Use the repo as the editorial source of truth even after PostgreSQL exists.

Recommended workflow:

1. Author structured course content in version-controlled files.
2. Validate it in CI.
3. Seed PostgreSQL from those files.
4. Serve runtime reads from PostgreSQL through the curriculum mapping layer.

This gives the benefits of a database without forcing authors to hand-edit SQL or requiring an admin CMS before launch.

Do not build a CMS yet.

## Migration Plan

### Phase 1: Type and naming cleanup

- Generalize Thai-named data fields in [src/lib/data/types.ts](/home/andri/code/projects/glyphbridge/src/lib/data/types.ts).
- Introduce course-shaped DTOs.
- Stop treating numeric lesson IDs as long-term identifiers.

### Phase 2: Course-aware routes and progress

- Introduce course-slug route structure.
- Refactor [src/lib/stores/progress.ts](/home/andri/code/projects/glyphbridge/src/lib/stores/progress.ts) to be course-aware.
- Persist only lesson progress and active lesson pointer.

### Phase 3: Server-side curriculum boundary

- Introduce server-only curriculum query and mapping functions.
- Keep the front-end DTO shape stable.
- Initially allow the mapping layer to read from static Thai data if needed.

### Phase 4: Database-backed curriculum

- Move runtime curriculum reads to PostgreSQL.
- Seed Thai first using the new schema.
- Add one contrasting course next, preferably Korean, to validate the abstraction.

### Phase 5: Launch content rollout

- Add Georgian, Greek, and Ukrainian once the architecture proves stable on two materially different courses.

## Validation Requirements

Before implementation begins, the database-backed plan should assume these checks will exist:

- unique course slugs
- unique lesson slugs within a course
- monotonically ordered lessons
- valid drill correct-option indexes
- valid review-grapheme references
- valid anchor word segment ordering
- required SEO and UI metadata present for each course
- route coverage for at least Thai and one non-Thai course

## Decisions

- Decision: Model the launch set as language courses rather than raw scripts.
  Reason: The product teaches real words, meanings, and language-specific reading rules.
- Decision: Keep `script_system` separate from `course`.
  Reason: It supports reusable rendering metadata without forcing shared pedagogy.
- Decision: Use course-slug URLs.
  Reason: They keep navigation, SEO, and progress scoping explicit and simple.
- Decision: Use PostgreSQL as the canonical runtime source once the database is ready.
  Reason: It supports scale and queryability while keeping runtime content centralized.
- Decision: Keep one server-side curriculum mapping layer between the DB and the UI.
  Reason: It prevents SQL and schema churn from spreading through route and component code.
- Decision: Persist only lesson progress canonically.
  Reason: Known words, graphemes, counts, and unlock state are derivable and should not be duplicated.
- Decision: Prefer data-driven detail rows and grouped grapheme metadata over widening the core schema for every script-specific edge case.
  Reason: It keeps the architecture simple and extensible.

## Open Questions

- Whether Georgian, Greek, and Ukrainian course copy should stay English-first in the UI initially or ship with localized learner-facing course metadata.
- Whether the long-term content authoring format should be TypeScript, JSON, YAML, or a spreadsheet-to-seed pipeline.
- Whether future shared-script scenarios should reuse a grapheme catalog across multiple courses or keep course-scoped duplication until reuse is proven.

## Follow-Up

- Do not begin implementation until the database direction and schema are ready.
- Once the database setup work starts, convert this plan into a concrete SQL schema spec and first-migration plan.
- First implementation target should be the curriculum DTO and route/progress seams, not feature work.

## Stop Point

This task intentionally stops at planning. No implementation should start until the database is set up and the schema direction is finalized.
