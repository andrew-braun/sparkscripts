# Retire `thaiPack` from the client runtime

Created 2026-07-15. Status: **complete (2026-07-15).**

Supersedes `.ai/2026-04-30-db-single-source-of-truth.md`, whose core mechanism
(a live DB read via `+layout.server.ts` with `prerender` deleted) is
architecturally stale: the app went server-first-and-prerendered afterwards, so a
live layout read would break the build. This plan reads the **build-time
publication artifact** instead. Mark the April doc superseded when this lands.

## Goal

Stop the client bundle from importing the hand-authored curriculum
(`src/lib/data/thai.ts`). After this, every runtime consumer — server routes and
client stores alike — reads the same published course version, so they cannot
disagree.

## The problem, precisely

Curriculum flows through a pipeline:

```text
thai.ts (hand-authored, the AUTHORING source)
  → scripts/generate-thai-seed.mjs → supabase/seed.sql
  → DB: published to the `delivery` schema as immutable course versions
  → scripts/generate-publication-artifact.mjs reads the DB → .generated/*.json
  → src/lib/server/published-lessons.ts reads .generated/ → routes (+page.server.ts)
```

The client **bypasses the entire pipeline**. `progress.ts`, `/alphabet`,
`/practice`, `LessonList`, and the homepage import `thaiPack` directly from stage
one. So there are two runtime paths:

- **Server/routes** serve the _published_ version (from the artifact).
- **Client** computes progress, known-words, known-letters, drills, and the
  alphabet from _raw `thai.ts`_.

Because the DB publishes **immutable** course versions (protected by commit
`4e2aeb7 fix: preserve immutable published course versions`), the two paths drift
whenever `thai.ts` is edited without republishing, or when the active published
version is deliberately an older snapshot. The server then renders one version
while the client's progress store reasons about another — different vocabulary,
letters, and drills on the client vs. what the server delivered.

## What "single source of truth" means after this change

Stated exactly, so it is not overclaimed:

- **`thai.ts` is not deleted and remains the _authoring_ source of truth.** It is
  still the hand-edited origin the seed script consumes. It stops being a
  _runtime import_ only.
- **The _runtime_ source of truth becomes the published DB course version,
  captured in the `.generated/` artifact**, read by both server and client.

One authoring source (`thai.ts`) → one runtime source (the published artifact),
read by everyone. Today the client shortcuts straight to the authoring source,
skipping the publish step.

## Measured impact (2026-07-15, against the existing client build)

The `.svelte-kit/output/client` build has a 165 KB (43 KB gzip) chunk
(`BUfAyTSe.js`) containing the full curriculum. It is imported by node `0` (the
root layout) and the app entry, so it loads on **every page** — the path is
layout → `MainNav` → `progress.ts` → static `thaiPack` import.

| Payload                                                                           | gzip  |
| --------------------------------------------------------------------------------- | ----- |
| Current thai chunk, every page                                                    | 43 KB |
| Minimal client catalog (`id,stage,title,anchorWord,newLetters,vocabulary,drills`) | 36 KB |
| Progress-store-only fields                                                        | 29 KB |

**Honest tradeoff:** most of the 43 KB is genuinely used client-side (vocabulary
for known-words, letters for the alphabet, drills for practice). The catalog
still ships (~36 KB gzip, baked into cached layout data), so the bundle win is
only ~7–14 KB gzip plus faster hydration (data parses faster than a JS module).
**The primary payoff is architectural**: the drift bug is closed and an ESLint
guard keeps it closed. Size is secondary. Do not sell this as a big bundle win.

## Current `thaiPack` consumers

Confirmed 2026-07-15 with `grep -rn thaiPack src` (excluding tests).

**Client (ships in the browser bundle — the target of this work):**

| File                                                  | Uses                                                                             |
| ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/lib/stores/progress.ts`                          | `thaiPack.lessons` for 5 module-level lookups; `buildCourseJourney(thaiPack, …)` |
| `src/lib/components/content/lesson/LessonList.svelte` | `thaiPack.lessons` for the sidebar list                                          |
| `src/routes/alphabet/+page.svelte`                    | `thaiPack.lessons.flatMap(newLetters)`                                           |
| `src/routes/practice/+page.svelte`                    | `thaiPack.lessons.filter(completed).flatMap(drills)`                             |
| `src/routes/+page.svelte`                             | `thaiPack.lessons[0]?.id`; `{ …thaiPack, stages }`                               |

**Server-only (no client-bundle cost — out of scope, may stay):**

| File                                              | Note                                                 |
| ------------------------------------------------- | ---------------------------------------------------- |
| `src/lib/server/published-lessons.ts`             | Legacy-shape normalization fallback + stage fallback |
| `src/routes/+page.server.ts`                      | `thaiPack.stages`; `buildCourseProgressStats`        |
| `src/routes/test/lesson-complete/+page.server.ts` | Dev-only preview route                               |
| `scripts/generate-thai-seed.mjs`                  | The authoring→seed path; **must keep** reading it    |

Server files carry no bundle cost. Converting them to the artifact is optional
purity, tracked as follow-up, not a blocker.

## Architecture decision

Deliver the catalog through a **build-time `+layout.server.ts`**, not a live
per-request read. The root layout is `prerender = true`; a server `load` there
runs at build time and bakes its result into the prerendered layout data, fetched
once and cached by the browser (immutable URL) exactly like today's JS chunk.
Keep `prerender = true`. Do **not** reintroduce `ssr = false`.

The progress store cannot take props (it initializes at module scope), so it gets
a lazy `initProgress(catalog)` seeded from the layout data on mount. During SSR
there is no localStorage anyway, so the store correctly renders the empty-progress
state server-side and hydrates on the client — no SSR regression.

## Implementation steps

### 1 — Client-safe catalog type

In `src/lib/data/types.ts`:

```ts
/** Minimal lesson descriptor the client runtime needs. Structurally satisfied
 *  by the server's PublishedLessonCatalogEntry. */
export interface LessonCatalogEntry {
	id: number;
	stage: number;
	title: string;
	anchorWord: Word;
	newLetters: Letter[];
	vocabulary: LessonVocabularyEntry[];
	drills: DrillQuestion[];
}
```

Client modules import only this type, never a server module.

### 2 — Delivery mapper + DB function

- `src/lib/server/delivery-payload.ts`: add `PublishedLessonCatalogEntry` (a
  `Pick<Lesson, …>` of the seven fields above) and
  `mapPublishedLessonCatalogEntry(payload)`, reusing `readLessonCore`, `mapWord`,
  `mapLetter`, `mapDrill`. Exclude anchor entries from `vocabulary` the same way
  `mapPublishedLessonPayload` does.
- `src/lib/server/delivery-lessons.ts`: re-export the type and add
  `getPublishedLessonCatalog()` following the `getPublishedLessonCards` pattern
  (same query, one row per lesson ordered by `lesson_ordinal`, new mapper).

### 3 — Artifact projection

In `src/lib/server/published-lessons.ts`, add `getPublishedLessonCatalog()` that
projects the seven fields from the in-memory artifact, with the existing
`import("./delivery-lessons")` DB fallback — matching the other `getPublished*`
functions in that file.

### 4 — Layout server load

Create `src/routes/+layout.server.ts`:

```ts
import { getPublishedLessonCatalog } from "$lib/server/published-lessons";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async () => {
	return { catalog: await getPublishedLessonCatalog() };
};
```

Runs at build time under `prerender = true`. Verify the build still prerenders
every route (audit output for any route forced dynamic).

**Review correction:** the root layout also participates in dynamic renders for
`/` and `/auth`. The generated manifest and matching publication artifact must
be bundled through Vite's build-time JSON imports so those dynamic Worker
requests read the same build-time publication, without a runtime delivery-DB
dependency or additional Worker secret configuration.

### 5 — Refactor the progress store (highest risk)

In `src/lib/stores/progress.ts`:

- Remove `import { thaiPack } from "$lib/data/thai"`.
- Change the five module-level constants (`lessons`, `firstLessonId`,
  `lessonIds`, `lastLessonId`, `lessonById`, `knownLetterCharacters`, …) to
  mutable `let` initialized empty.
- Add `initProgress(catalog: LessonCatalogEntry[])` that rebuilds those
  structures and re-normalizes the persisted localStorage snapshot against the
  catalog, then sets the `progress` store.
- `buildCourseJourney`/`buildCourseProgressStats` already accept a structural
  `CourseJourneySource`/`LanguagePack`; pass the catalog-derived pack.
- Do not load or persist localStorage progress until `initProgress(catalog)` has
  installed a catalog. Normalizing an existing snapshot against an empty catalog
  would discard every persisted lesson id before the layout can seed it.

### 6 — Seed the store from the layout

In `src/routes/+layout.svelte`, take `data` and call `initProgress(data.catalog)`
in `onMount` before other progress-dependent work. Confirm ordering: the store
must be seeded before any interaction reads derived progress.

### 7 — Convert the remaining client consumers

- Read the inherited `data.catalog` in `/alphabet` and `/practice`; do not add
  duplicate per-page catalog projections. The root layout data is the cached
  payload boundary for every client route.
- `LessonList.svelte`: take `lessons` as a typed prop; callers pass catalog data.
- `/+page.svelte`: derive `firstLessonId` and the journey pack from
  `data.catalog` (+ `data.stages`) instead of `thaiPack`.

**Review correction:** `buildCourseProgressStats` must accept the structural
lesson fields it reads instead of `LanguagePack`, and the dynamic homepage's
server load must use the published catalog/stages too. Otherwise its server
stats can still drift from the client catalog.

### 8 — Guard against regression

Add an ESLint `no-restricted-imports` rule forbidding `$lib/data/thai` outside
`src/lib/server/**`, `src/lib/data/**`, and `scripts/**`, message: "Import lesson
content from the published delivery catalog, not the authoring source." This is
what prevents the shortcut from silently returning.

### 9 — Mark the authoring source

Add a header comment to `src/lib/data/thai.ts`: authoring source for seed
generation only; not a runtime import.

## Out of scope / follow-up

- Converting the server-only `thaiPack` readers (`published-lessons.ts` legacy
  fallback, `/+page.server.ts`, the test route) to the artifact — purity, no
  bundle cost.
- Caching headers on the layout load; evaluating a prerendered catalog artifact.
- These belong in a follow-up, not this task.

## Verification

Type/build:

- [ ] `pnpm check` clean.
- [ ] `pnpm check:all` (lint incl. the new ESLint rule, stylelint) clean.
- [ ] `pnpm build` succeeds and still prerenders every previously-static route.
- [ ] The rebuilt client no longer contains a curriculum chunk on the layout
      node: `grep -rl "rulesIntroduced\|newLetters" .svelte-kit/output/client`
      returns nothing reachable from node `0` / the entry.

Behavioral (drive the real app — this touches the localStorage progress path):

- [ ] `/learn` renders the lesson list from delivered data.
- [ ] `/alphabet` shows all letters; unlocked state matches completed lessons.
- [ ] `/practice` shows drills for completed lessons after completing lesson 1.
- [ ] Complete a lesson, refresh: progress persists and re-normalizes correctly.
- [ ] Clear localStorage, reload: progress resets to initial; catalog still loads
      and the app renders.
- [ ] Signed-in learner: server projection still hydrates progress correctly
      alongside the catalog seed (no double-init or clobber).

## Risk

Step 5 is the exposure: `progress.ts` is the central store on the localStorage
path, imported everywhere via the layout. A wrong lazy-init ordering or a broken
re-normalization silently corrupts every learner's progress display. Verify by
driving the app with real localStorage, not by types alone.
