# Task: Practice Vocabulary Expansion

- Start date: 2026-06-13
- Owner: Codex
- **Status: CLOSED 2026-07-14 by product decision.** The anchor/core/extension
  practice-tier contract defined here **shipped and stands**. The follow-on
  scored flip-card rebuild is **dropped** — `StepPracticeCheckpoint.svelte` was
  kept instead and given the two-column answer grid
  (`.ai/2026-07-11-practice-answer-grid.md`, since completed). Do not resume the
  "next phase" sections below.

## Goal

Shift Glyphin lessons from one anchor plus a tiny support-word sample to a
practice-first model: each lesson should teach one anchor word and then give
learners at least ten fresh, decodable practice words or short phrases before
scored drills. Later lessons will also include an optional extension set.

## Scope

- In scope:
  - Define the curriculum contract for anchor, core practice, and extension
    practice vocabulary.
  - Plan changes to Thai lesson authoring artifacts, runtime TypeScript data,
    delivery DTO mapping, and database publication.
  - Plan a rework of Lesson 1 so practice targets are not revealed before the
    learner has tried to decode them.
  - Identify validation rules that prevent future courses from regressing to
    too little practice.
- Out of scope:
  - Shipping the full vocabulary expansion in this planning pass.
  - Changing authentication, learner sync, or production deployment behavior.
  - Treating low-confidence or sensitive Thai items as final without review.

## Current Findings

- `src/lib/data/types.ts` already has `Lesson.vocabulary`, but it only supports
  `role: "anchor" | "support"` and no explicit practice tier.
- `src/lib/data/thai.ts` currently gives every Thai lesson exactly two support
  words through `supportingVocabularyByLessonId`.
- `src/lib/components/lesson/StepSameLettersNewWords.svelte` already has the
  right reveal pattern for transfer practice: the learner sees the word first,
  then checks pronunciation and meaning.
- `src/routes/learn/[id]/+page.svelte` inserts the transfer step only when
  support vocabulary exists.
- `src/lib/server/delivery-payload.ts` maps published DB vocabulary, but it
  currently accepts only `anchor` and `support` role keys.
- The database is already ahead of runtime: `curriculum.vocabulary_items`,
  `curriculum.vocabulary_segments`, and `curriculum.lesson_vocabulary` exist,
  and `lesson_vocabulary.role_key` is text rather than an enum. The DB can carry
  richer roles without a schema change.
- `docs/database-dto-spec.md` already describes `lesson_vocabulary` as supporting
  anchor, taught, review, and extension vocabulary, but the runtime and Thai
  docs have not caught up.

## Implementation Update

- Updated `src/lib/data/types.ts` so lesson vocabulary now carries
  `tier: "core" | "extension"` and `sourceType: "real" | "phrase" | "nonsense"`.
- Reworked `src/routes/learn/[id]/+page.svelte` and
  `src/lib/components/lesson/StepSameLettersNewWords.svelte` so the lesson flow
  distinguishes core practice from optional extension practice and lets the
  learner skip extension before drills.
- Updated `src/lib/components/lesson/StepComplete.svelte` to summarize practice
  reads instead of the older support-word concept.
- Expanded Thai Lesson 1 in `src/lib/data/thai.ts` to `10` core practice
  targets, including tagged phrase and nonsense items.
- Added the implied-short-o rule to Lesson 1 and audited rule examples so
  current lessons no longer reveal their own practice targets before the
  transfer step.
- Updated `src/lib/stores/progress.ts` so nonsense targets do not enter
  `knownWords`, while anchors and lexical practice items do.
- Updated `src/lib/server/delivery-payload.ts`,
  `scripts/generate-thai-seed.mjs`, and `supabase/seed.sql` so publication and
  seed data now use `anchor`, `practice_core`, and `practice_extension` role
  keys plus `sourceType` metadata.
- Updated durable docs to describe the new practice-first lesson contract and
  the required later-lesson extension set.
- Replaced the ad hoc Thai lesson practice map in `src/lib/data/thai.ts` with a
  reviewed 13-lesson inventory based on the 2026-06-27 corpus-backed audit.
  Early lessons now use smaller but cleaner pools when the letter inventory is
  genuinely constrained, while later lessons promote overflow review words and
  phrases into optional extension practice.

## 2026-06-27 Vocabulary Refresh Notes

- Lesson 1 was intentionally pruned from the earlier speculative ten-item set
  down to four real targets plus one flagged nonsense drill. The attached audit
  made a stronger case for quality over padding at that stage.
- Lesson 2 now expands beyond `มี` and `ดีมาก` with `ดีด`, `มีด`, and earlier
  review words, which resolves the most obvious runtime underfill.
- Lessons 3-13 now follow the attached ordering rule more closely: new-letter
  targets first, then review words, then phrases at the end.
- Later lessons now use the existing `extension` tier for overflow items such as
  review phrases and secondary decodable words, instead of forcing every item
  into scored core practice.

## 2026-06-27 Publication Push

- Regenerated `supabase/seed.sql` from `scripts/generate-thai-seed.mjs` after the
  Thai runtime vocabulary refresh, so both `curriculum.lesson_vocabulary` and
  `delivery.course_publication_lessons` now reflect the expanded lesson sets.
- Updated generator release metadata to use `anchor-plus-practice` instead of
  the stale `anchor-plus-support` label.
- The regenerated Thai seed now publishes `122` unique vocabulary items across
  the current `13` lessons.

## Target Curriculum Contract

- Every lesson keeps exactly one featured anchor.
- Every standard lesson should have at least ten core practice targets that are
  decodable from prior lessons plus the current lesson's new graphemes and
  rules.
- Later lessons will include an optional extension set after the core set.
  The extension set can scale with available vocabulary, but it is part of the
  intended lesson shape rather than a maybe-later bonus.
- Practice targets may be standalone words, high-frequency compounds, or short
  phrases.
- Nonsense words are explicitly allowed as a pressure-release valve when the real
  word and phrase pool is too small. A nonsense word is a pronounceable grapheme
  combination that maps to a possible sound in the target language but has no
  lexical meaning.
- Nonsense targets must be clearly tagged so they do not pollute learned-word
  lists as ordinary vocabulary.
- Practice targets should be hidden from pre-practice lesson copy, rule examples,
  drill prompts, and answer options unless the learner has already attempted
  them in the transfer step.
- Rule examples should use the anchor, non-target examples, or already completed
  vocabulary. They should not accidentally reveal upcoming core practice words.

## Thai Lesson 1 Draft Inventory

Lesson 1 anchor remains:

- `มาก` — very / a lot

Candidate core practice set from known graphemes `ม`, `า`, `ก`:

- `มา` — to come
- `กา` — crow; also kettle/teapot or to mark/check
- `กาม` — sensuality
- `กาก` — residue, dregs; casual "trash/useless" slang
- `กก` — reeds; also to cuddle/incubate
- `กากมาก` — very bad / really trashy, casual
- `มามาก` — comes a lot / heavy flow, gloss should stay neutral
- `กามา` — sensuality or sensual matters, formal/poetic register
- review-needed slot 9: real phrase preferred; nonsense target acceptable if
  tagged
- review-needed slot 10: real phrase preferred; nonsense target acceptable if
  tagged

Sensitive-language guidance:

- Prefer toned-down glosses such as "sensuality" over explicit sexual phrasing.
- Avoid unnecessary body-product context for `มามาก`; keep the learner-facing
  note neutral.
- Label `กากมาก` as casual and potentially rude so it is useful without being
  normalized as polite speech.

## Step-By-Step Strategy

### 1. Establish The Durable Authoring Rule

- Update `docs/curriculum/authoring-framework.md` so "support word" evolves into
  a practice vocabulary model:
  - anchor: one featured lesson word;
  - core practice: minimum ten read-before-reveal targets;
  - optional extension: required for later lessons, with size based on available
    decodable vocabulary;
  - nonsense target: pronounceable but meaning-free decoding practice, allowed
    only when marked and reviewed.
- Update `docs/curriculum/authoring-tools.md` to make lesson sequences and
  review packets report practice counts.
- Update `docs/curriculum/thai-reading-v1/lesson-sequence.md` so every row has a
  practice-vocabulary count target, not only "drill focus."
- Update `docs/curriculum/thai-reading-v1/db-ingestion-strategy.md` to state
  that Thai ingestion must populate all anchor, core practice, extension
  practice, nonsense/review metadata, and later-lesson extension sets before
  publication.

### 2. Update The Data Contract

- Extend `LessonVocabularyEntry` in `src/lib/data/types.ts` to distinguish
  practice role and tier. Recommended shape:
  - `role: "anchor" | "practice"`;
  - `tier: "core" | "extension"` for practice entries;
  - `sourceType: "real" | "phrase" | "nonsense"`;
  - `drillTarget: boolean`.
- Keep `anchorWord` for the current page contract, but ensure the anchor is also
  present in vocabulary when publication data is generated.
- Decide whether learned-word collection should include nonsense targets. The
  conservative default is no: nonsense targets should train decoding, not
  become saved vocabulary.

### 3. Align Delivery DTOs And Database Publication

- Update `docs/database-dto-spec.md` role-key examples to match the runtime
  contract: `anchor`, `practice_core`, `practice_extension`, and optionally
  `review`.
- Update `src/lib/server/delivery-payload.ts` so published payloads accept the
  new role keys and map them into runtime `LessonVocabularyEntry` values.
- Keep the DB schema unless implementation proves we need constraints; current
  `lesson_vocabulary.role_key text` and `metadata jsonb` are flexible enough.
- Store source/type metadata in `lesson_vocabulary.metadata` or
  `vocabulary_items.metadata` for nonsense/sensitive/register notes.
- Add publication smoke checks that fail when a lesson has fewer than ten core
  practice targets, except for explicitly approved early-lesson exceptions.

### 4. Rework Static Thai Runtime Content

- Replace `supportingVocabularyByLessonId` with a practice vocabulary structure
  that can hold core and extension targets.
- Expand Lesson 1 first using the reviewed candidate pool above.
- Expand Lessons 2-13 by allowing each lesson to reuse all previously taught
  graphemes plus current graphemes. This keeps new lessons feeling cumulative
  and makes later practice pools much easier to fill.
- For later lessons, target:
  - one anchor;
  - ten core practice targets;
  - a skippable extension set, ideally ten more targets when quality is high
    enough.
- Keep transliteration, tone marking, segmentation, and context notes consistent
  with existing Thai lesson voice.

### 5. Prevent Practice Spoilers In The Lesson Flow

- Audit Lesson 1 before editing:
  - `rulesIntroduced[].examples`;
  - `drills[].prompt`;
  - `drills[].options`;
  - intro/breakdown/letters copy.
- Remove unrevealed practice targets from rule examples and drill options before
  the transfer step. For Lesson 1, `กา` currently appears in rule examples and
  `กาม` appears in a spot drill option; those should move out of pre-practice
  exposure if they become core practice targets.
- Keep the anchor visible throughout the lesson; it is the taught object, not a
  spoiler.
- After the practice step, drills may refer to already attempted practice words,
  but they should still test a fair, deterministic skill.

### 6. Upgrade The Transfer Practice UI For Larger Sets

- Keep the existing read-before-reveal interaction.
- Add pacing for 10-20 targets:
  - core/extension progress labels;
  - "continue core practice" and "extension practice" transitions;
  - compact completion summary;
  - no long scrolling list that reveals answers prematurely.
- Let learners skip optional extension practice after the ten core targets.
- Preserve mobile ergonomics: one target at a time, stable button sizing, and no
  dense table of hidden answers.

### 7. Update Drills Around The New Vocabulary Model

- Keep scored drills short enough to finish, but source choices from practice
  targets that have already been attempted.
- Add drill authoring guidance:
  - match drills can use anchor and attempted practice targets;
  - spot drills should avoid using unseen core targets as distractors;
  - sound drills should prefer grapheme/rule transfer, not pure memorization.
- Add validation that any drill option matching a lesson's core practice target
  is not shown before that target is attempted in the flow.

### 8. Validate And Review

- Run static checks after implementation: `pnpm check`.
- Run `pnpm check:all` if SCSS, formatting, or lint-sensitive UI files change.
- Run `pnpm build` if delivery payloads, route data, or publication behavior
  changes.
- Manually walk Lesson 1 in `pnpm dev` to confirm:
  - practice words are not revealed early;
  - the transfer step shows at least ten core targets;
  - sensitive glosses are appropriately toned;
  - completion and known-word collection behave as intended.
- Have Thai content reviewed before treating low-frequency, slang, sensitive, or
  nonsense targets as final shipped content.

## Implementation Order

1. Documentation and authoring-contract updates.
2. Runtime type update and mapper update.
3. Lesson 1 static data expansion plus spoiler audit.
4. Transfer-step UI pacing for ten-plus targets.
5. Thai Lessons 2-13 expansion.
6. DB/DTO spec and publication smoke-check updates.
7. Validation and manual lesson review.

## Learning / Practice Split Plan

### Current Regression Hypothesis

- The product needs two distinct learner intents:
  - learn the new graphemes, rule, anchor, and a tiny amount of guided transfer;
  - practice the full lesson vocabulary set until mastery is strong enough to
    unlock the next lesson.
- The current route treats the whole lesson as a single linear completion flow.
  That made it easy for the new practice vocabulary model to become metadata
  instead of a mandatory mastery gate.
- `StepSameLettersNewWords.svelte` already implements a useful read-before-reveal
  interaction, but it should become either a small guided Learning-phase preview
  or a reusable card primitive for the standalone Practice phase.
- `scripts/generate-thai-seed.mjs` still reads `entry.role`, which no longer
  exists on `LessonVocabularyEntry`. The checked-in seed has practice role keys,
  but the generator is a drift risk and should be fixed before relying on
  regenerated publications.

### Product Definition

- Split each lesson into two phases:
  - **Learning**: unscored, linear instruction. It teaches the anchor, graphemes,
    rules, and two of the simplest practice reads.
  - **Practice**: scored mastery work. It uses the full core practice vocabulary
    set, plus optional extension targets when available.
- The lesson is not complete, and the next lesson is not unlocked, until the
  learner passes the scored Practice phase.
- Practice unlock threshold: require at least `6/10` on Lesson 1 practice before
  Lesson 2 unlocks. Model this as a `60%` default threshold so future lessons can
  keep the same rule even when practice item counts vary.
- A failed or below-threshold Practice attempt should preserve the latest score
  and best score, then offer immediate retry and targeted review without
  rewinding the learner through Learning.
- Lesson cards expose two actions:
  - **Learn**: available when the lesson itself is unlocked.
  - **Practice**: locked until Learning is complete; after unlock, goes directly
    to the Practice phase.
- Required read-before-reveal sequence for Practice preparation cards:
  1. Show the script target only, plus any new-letter highlighting.
  2. Prompt the learner to attempt the read.
  3. On explicit action, reveal transliteration, definition, segmentation, and
     context.
  4. Advance to the next target only after the reveal state has been seen.
- The scored portion may reference only the anchor and practice targets that were
  taught or previewed in Learning/Practice preparation.

### Progress Model

- Replace the binary lesson-complete concept with phase-aware progress:
  - `learningCompletedAt`: set when the Learning phase is finished.
  - `practiceAttempts`: or server-backed attempt records, including score,
    item count, passed flag, and timestamp.
  - `bestPracticeScore` and `latestPracticeScore`.
  - `practiceCompletedAt` or `masteredAt`: set when score meets the threshold.
- Derive:
  - Learning unlocked: previous lesson has passed Practice, except Lesson 1.
  - Practice unlocked: this lesson's Learning phase is complete.
  - Lesson complete/mastered: this lesson's Practice score meets threshold.
  - Next lesson unlocked: previous lesson is complete/mastered.
- Known letters can unlock after Learning because the graphemes have been taught.
- Known lexical practice words should unlock after passed Practice so the words
  list represents tested reading wins. Nonsense targets remain excluded.

### Implementation Steps

1. Add route structure:
   - `/learn/[id]` for Learning.
   - `/learn/[id]/practice` for standalone Practice.
   - Preserve direct route validation so locked practice routes redirect or show
     a clear locked state.
2. Rework Learning phase:
   - keep intro, breakdown, letters, and rules;
   - include exactly two simple core practice targets as guided read-before-reveal
     transfer;
   - end with a Learning-complete screen and a primary CTA to Practice.
3. Build Practice phase:
   - start with a flip-card stack for the full core practice set;
   - include a mini-batch recap that shows all targets Thai-only with tap-to-review
     answers;
   - finish with a scored `10` item check for Lesson 1, passing at `6/10`;
   - allow retry from the score screen without sending the learner back through
     Learning.
4. Update lesson list cards:
   - show separate Learn and Practice buttons;
   - lock Practice until Learning is complete;
   - badge states should distinguish current learning, practice unlocked, passed,
     and locked.
5. Update progress and sync boundaries:
   - add phase-aware local progress fields and migration from the current binary
     progress shape;
   - update learner projection/sync DTOs if server-backed completion starts
     distinguishing learning completion from practice mastery;
   - derive next-lesson unlocks from passed Practice, not from entering Practice.
6. Fix publication generation:
   - derive role keys from `entry.tier`
     (`core -> practice_core`, `extension -> practice_extension`);
   - preserve `sourceType` in vocabulary metadata;
   - keep anchors materialized separately as `roleKey: "anchor"`.
7. Add focused validation:
   - static lesson lint: every non-exempt lesson has at least one core practice
     target now and targets ten core reads as the curriculum is filled out;
   - publication lint: generated payloads include `practice_core` entries;
   - route/component test: Learning completion unlocks Practice but does not
     unlock Lesson 2;
   - route/component test: Practice score below threshold keeps Lesson 2 locked;
   - route/component test: Practice score at or above threshold unlocks Lesson 2.
8. Manual QA Lesson 1:
   - walk Learning and confirm only the two guided practice words appear there;
   - finish Learning and confirm Practice unlocks;
   - score `5/10` and confirm Lesson 2 remains locked with retry available;
   - score `6/10` or higher and confirm Lesson 2 unlocks;
   - confirm transliteration and meaning stay hidden until reveal in the flip-card
     stack.

### Layout Options

1. **Flip-card stack, recommended for Practice.**
   - Show the target as a tactile card with a reveal face, plus a compact
     progress rail for the ten core reads.
   - Best fit for engagement because the learner gets a clear attempt/reveal loop
     without seeing the whole answer list too early.
   - Requires keyboard support, semantic buttons, screen-reader labels, and
     reduced-motion handling.
2. **Mini-batch recap, recommended before scoring.**
   - After the flip-card stack, show all Thai targets again without answers and
     let the learner tap any card to re-open the answer.
   - Gives a retention bump before scoring while preserving learner control.
3. **Confidence self-rating, later enhancement.**
   - After reveal, ask "Got it" / "Shaky" before moving on. Store only local
     transient state at first, then use it later for review selection.
   - Strong for retention signals, but it should wait until the threshold-gated
     Practice flow is stable.

Recommended first pass: Learning gets two simple guided read-before-reveal cards.
Practice gets the flip-card stack, mini-batch recap, and a scored `10` item check
with a `6/10` pass threshold for Lesson 1.

## Progress

- [x] Discovery and research
- [x] Planning artifact created
- [x] Documentation updates
- [x] Runtime data/model implementation
- [x] Database/DTO publication alignment
- [x] Lesson Learning/Practice split implementation
- [x] Lesson list and home CTA updates
- [ ] Full Thai practice vocabulary expansion
- [x] Focused validation

## Implementation Notes

- Local progress is now schema version `3` and stores:
  - `learningCompleted` / `learningCompletedAt`
  - `practiceAttempts`
  - `bestPracticeScore` / `latestPracticeScore`
  - `practicePassed` / `practicePassedAt`
- Old binary lesson-complete snapshots migrate forward by treating prior lesson
  completion as both Learning-complete and Practice-passed.
- Known letters now unlock after Learning. Known words still unlock only after
  passed Practice.
- `/learn/[id]` is now the unscored Learning route.
- `/learn/[id]/practice` is now the scored Practice route.
- Practice currently uses:
  - a flip-card stack across core plus extension targets;
  - a mini-batch recap across the same set;
  - a scored checkpoint over core `drillTarget` entries only.
- The blank Practice regression on stale publication artifacts was fixed in
  `src/lib/server/published-lessons.ts` by normalizing legacy generated lessons
  back onto the current canonical `thaiPack` lesson shape at runtime.
- The practice pass gate is currently modeled as a fixed `60%` threshold via the
  progress store helper. Lesson 1 therefore requires `6/10`.
- Server sync is intentionally conservative for now:
  - failed first-time Practice attempts stay local only;
  - passed attempts, and any later attempts after a lesson is already passed,
    continue to use the existing lesson-completion sync pipe;
  - this avoids falsely completing lessons on the current backend contract,
    which only supports `completed: true` lesson attempts.

## Next Phase: Scored Multiple-Choice Practice Cards — **DROPPED 2026-07-14**

> **This section is superseded and will not be implemented.** Andri decided on
> 2026-07-14 to **keep `StepPracticeCheckpoint.svelte`** and improve it in place
> with a two-column answer grid instead of rebuilding the practice flow around
> scored flip-cards. The replacement work is `.ai/2026-07-11-practice-answer-grid.md`;
> the decision is recorded in `.ai/2026-07-14-backlog-clearing-plan.md` (Task 4).
>
> Everything **above** this line — the anchor/core/extension practice-tier
> contract, the DB role keys, and the 10+ core-words-per-lesson rule — shipped and
> still stands. Only the flow rework below is dropped, along with its two open
> questions (cross-device sync of failed attempts, extension-set placement), which
> can be reopened on their own merits if they resurface. Kept for history.

### Product Direction Captured On 2026-06-13

- The current split between an unscored flip-card deck and a later scored
  checkpoint is too indirect.
- The main Practice interaction should itself become the scored activity.
- Keep the flip-card animation, but make the answer choice trigger the reveal.
- Each practice item should:
  - show the Thai word first;
  - present `6` multiple-choice options below the card;
  - flip to the answer face as soon as the learner chooses an option;
  - lock that item's score on first choice;
  - allow the learner to flip back and forth before advancing;
  - require an explicit `Next` button to move to the next question.

### Planned UI / Flow Update

1. Replace the separate `StepPracticeCheckpoint` phase with a scored
   `StepPracticeDeck` flow.
2. Use the current core `drillTarget` items as the scored question set so the
   lesson gate still passes at `6/10` for Lesson 1.
3. Generate up to `6` deterministic answer options per item, with the correct
   pronunciation/definition plus lesson-appropriate distractors.
4. Auto-flip the card when an answer is chosen, then expose:
   - a flip toggle so the learner can review front/back freely;
   - a `Next question` / `See score` button for progression.
5. Keep the mini-batch recap as a lightweight review surface, but move it out of
   the role of "real scoring happens later."
6. Update copy, progress labels, and lesson docs so Practice is described as a
   scored card run rather than "deck, recap, checkpoint."

### Planned Implementation Notes

- Route/state machine:
  - simplify `/learn/[id]/practice/+page.svelte` from
    `deck -> recap -> checkpoint -> complete` to a flow where the deck emits the
    scored result directly before completion.
- Component work:
  - rebuild `StepPracticeDeck.svelte` around multiple choice state, answer
    locking, flip toggling, and explicit next-button navigation;
  - retire or remove `StepPracticeCheckpoint.svelte` once the new deck is live.
- Scoring:
  - continue recording percent score through `recordLessonPracticeAttempt`;
  - preserve the current lesson-unlock contract based on passing Practice.
- Validation:
  - manually verify one full Lesson 1 practice run, including wrong-answer and
    right-answer states, back-and-forth flipping, next-button progression, and
    the final unlock threshold.

## Open Questions

- Do we want first-time failed Practice attempts to sync cross-device, which
  would require a backend contract that can distinguish `completed: false`
  attempts from passed mastery attempts?
- Should the Practice checkpoint remain tied to authored `core` `drillTarget`
  entries, or should it eventually become a separately authored `practiceCheck`
  payload with explicit distractors?
- Should extension targets remain mixed into the Practice deck/recap by default,
  or move behind an explicit "extra reps" branch after the core set?
- Do we want a hard validator that blocks every published lesson below ten core
  practice targets, or a warning with explicit exceptions for early lessons?
- Should the mini-batch recap stay between the scored deck and the score screen,
  or move to a post-score review surface once the scored-card flow is in place?

## Validation Notes

- `git diff --check` passed.
- `pnpm prettier --check` passed for the touched Svelte/TS lesson files after
  local formatting.
- `pnpm check` now only fails on the pre-existing repo-wide Node typings issue:
  `tsconfig.json` references the `node` type library, but this workspace does
  not currently resolve Node typings for `src/lib/server/published-lessons.ts`.
- `pnpm build` failed in `pnpm publication:generate` because
  `scripts/generate-publication-artifact.mjs` could not reach its delivery
  source (`fetch failed`) in this sandbox.
- `pnpm check:all` failed at repo-wide formatting before reaching lint/stylelint
  because there are unrelated existing Prettier issues in files outside this
  task, including historical `.ai/`, `.kilo/`, and `docs/database-dto-spec.md`
  entries.

## Follow-Up

- Expand Lessons 2+ so each checkpoint has a more robust core practice pool.
- Decide whether incomplete Practice attempts need first-class server support.
- Consider adding a reusable curriculum lint command once the first expanded
  post-Lesson-1 checkpoint lands.
- Implement the scored multiple-choice flip-card Practice flow captured in the
  "Next Phase" section above.
