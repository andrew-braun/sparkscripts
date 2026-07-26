# Testing Expansion — progress store, component/DOM, Dependabot, smoke

- Start date: 2026-07-26
- Owner: Andri (impl: assistant)
- Status: active
- Parent plan: `.ai/2026-07-11-automated-test-suites.md` (this advances Task 3
  Step 3, Task 4, Task 6 Step 5, and Task 7 dependency hygiene).
- Roadmap context: `.ai/2026-07-17-product-roadmap.md` — testing net before
  monetization.

## Scope

Andri picked four follow-ups after the first testing slice landed:

1. **Progress-store behavior tests** (`src/lib/stores/progress.ts`) — the
   localStorage learner state the entitlement gate will read. Cover init from
   empty, corrupted-storage recovery, completion idempotency, known-letter/word
   derivation, and reconciliation with a newer server projection.
2. **Component/DOM layer** — Testing Library for Svelte 5 + jsdom. Render real
   components and assert accessible behavior for a representative set of UI
   primitives.
3. **Dependabot** — weekly pnpm + GitHub Actions update PRs (supply-chain
   hygiene ahead of payments work).
4. **Deployment smoke check** — a plain-fetch script hitting the deployed Worker
   (homepage, a lesson, projection endpoint, robots/sitemap, security headers),
   run against a supplied base URL. Not wired into the fast PR gate.

## Decisions

- **Runner topology:** Vitest `test.projects` with two isolated projects:
  - `node` — existing server/util/script suites, `environment: "node"`, no
    browser resolve conditions. Excludes `*.dom.test.ts`.
  - `dom` — `environment: "jsdom"`, adds `svelteTesting()` (browser resolve
    conditions + auto-cleanup), includes `*.dom.test.ts`. Isolation matters: the
    browser `resolve.conditions` that Svelte client rendering needs must NOT
    leak into the node project (would change how `@supabase/ssr` etc. resolve).
- **DOM test suffix:** `*.dom.test.ts` routes a file to the jsdom project. Chosen
  over `*.svelte.test.ts` to avoid colliding with Svelte's `.svelte.`-infix runes
  convention.
- **Progress store test env:** jsdom (needs `localStorage`); named
  `progress.dom.test.ts`. The store is a module-level singleton with an
  init-once guard, so each scenario uses `vi.resetModules()` + dynamic `import()`
  for a clean instance, and clears `localStorage` in `beforeEach`.
- **New deps (dev):** `@testing-library/svelte`, `@testing-library/user-event`,
  `jsdom`. Skipping `@testing-library/jest-dom` for now — assert with Vitest
  `expect` + Testing Library queries to keep the surface minimal; can add later
  for axe work (Task 4 follow-on).
- **Smoke script:** `scripts/smoke-deployment.mjs`, `pnpm test:smoke -- <url>`.
  Read-only GETs, non-2xx or missing security header → non-zero exit. Never
  mutates learner data; never targets a hardcoded prod URL (URL is required arg).

## Validation

- `pnpm test` (both projects green), `pnpm quality:check` green end-to-end.
- `pnpm test:smoke -- <preview-or-local-url>` run manually against a built Worker.

## Progress

- [x] Deps installed (`@testing-library/svelte`, `@testing-library/user-event`,
      `jsdom`), `vite.config.ts` two-project setup + `src/test/setup-dom.ts`
- [x] `progress.dom.test.ts` — 9 cases (init/recovery/rehydrate/idempotency/
      derivation/persistence/reconciliation)
- [x] Component DOM tests — `Button`, `ThemeToggle`, `Disclosure`, `RadioButtons`
      (13 cases). `HelpPopover` deferred to a real-browser layer (portaled Bits UI
      overlays are flaky under jsdom).
- [x] `.github/dependabot.yml` (pnpm + github-actions, weekly, grouped)
- [x] `scripts/smoke-deployment.mjs` + `test:smoke` script
- [x] `docs/testing.md` + roadmap/plan trackers updated
- [x] Full gate green — `pnpm quality:check`: 107 tests, prettier/markdownlint/
      eslint/stylelint clean, svelte-check 0 errors

Status: **done (2026-07-26)**. No CI change needed — the existing
`quality.yml` `test` step runs `pnpm test`, which now covers both projects; the
new devDeps come in via the frozen install. Smoke + Dependabot are intentionally
outside the PR gate.

Test count: 85 → 107 (both projects). Node project unchanged; new coverage all in
the `dom` project.

## Out of scope (stays deferred)

Local-Supabase integration (Task 5), Playwright browser E2E (Task 6 Steps 1-4),
axe integration, opt-in integration CI jobs (Task 7 Step 2).
