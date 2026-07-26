# Automated Test Suites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use $superpowers-subagent-driven-development (recommended) or $superpowers-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add layered automated tests that protect curriculum logic, learner state, server trust boundaries, accessible interactions, database contracts, and core user journeys.

**Architecture:** Introduce the smallest useful test layer first and add later layers only when their prerequisites are stable. Use Vitest for pure and component tests, a local Supabase instance for database integration, and Playwright for browser journeys and deployment smoke tests.

**Tech Stack:** Vitest, Testing Library for Svelte, Playwright, axe-core, local Supabase CLI, SvelteKit

## Status (updated 2026-07-26)

First slice landed — runner + boundary coverage + fast CI:

- **Task 1 (runner):** done. Vitest 4 configured in the `test` block of
  `vite.config.ts` (Node env, `sveltekit()` resolves aliases). All 16 existing
  `node --test` suites migrated to Vitest (`node:test` import → `vitest`,
  `node:assert` kept). `pnpm test` → `vitest run`; added `pnpm test:watch`.
  `docs/testing.md` written.
- **Task 2 (curriculum/delivery):** partial. `src/lib/server/delivery-payload.test.ts`
  (tip mapping + payload validation, folding in the old standalone tips script,
  now deleted) and `src/lib/utils/publication.test.ts` (cache-key/filename
  determinism). Fixture is inlined rather than a shared `__fixtures__/lesson.ts`.
- **Task 3 (learner/auth boundaries):** partial. Extracted the sync route's pure
  parser to `src/lib/server/learner-sync-input.ts` + full test; `src/lib/server/auth.test.ts`
  covers the redirect allow-list, email/OTP normalization, and form readers. The
  **progress-store** behavior tests (Step 3) are NOT done yet.
- **Task 7 Step 1 (fast CI):** done — `.github/workflows/quality.yml`.
- **Not started:** Task 4 (component/DOM tests — needs Testing Library + jsdom,
  the current component `*.test.js` only assert on `.svelte` source text), Task 5
  (local Supabase integration), Task 6 (Playwright E2E + smoke), Task 7 Step 2
  (opt-in integration CI jobs).

Test count: 54 → 85. `pnpm quality:check` is green end-to-end. Commits remain the
user's (repo rule) — the `git commit` steps below are not run by the AI.

## Global Constraints

- This plan is post-launch and does not block the initial production deploy.
- Tests must assert public behavior, not private implementation details.
- Every suite must run independently and have a documented environment contract.
- Database tests use disposable local data and never target production.
- Browser tests must not depend on a real third-party inbox.
- Keep fixture content minimal and typed; do not duplicate the full Thai curriculum.

---

### Task 1: Establish The Unit-Test Runner

**Files:**

- Modify: `package.json`
- Modify: `vite.config.ts` or create `vitest.config.ts`
- Create: `src/lib/utils/thai.test.ts`
- Create: `docs/testing.md`

**Interfaces:**

- Produces: `pnpm test`, `pnpm test:watch`, and `pnpm test:unit`

- [ ] **Step 1: Install current compatible test packages**

  Add Vitest and the minimal Svelte/Vite integration recommended by current
  first-party SvelteKit documentation. Record exact versions in the lockfile.

- [ ] **Step 2: Add scripts and isolated configuration**

  Configure a Node environment by default, include `src/**/*.test.ts`, and keep
  browser/component setup out until Task 4.

- [ ] **Step 3: Add the first characterization tests**

  Test stable pure behavior in `src/lib/utils/thai.ts`, including representative
  Thai segmentation/normalization cases and malformed input behavior already
  supported by the utility.

- [ ] **Step 4: Validate**

  ```bash
  pnpm test:unit
  pnpm check:all
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add package.json pnpm-lock.yaml vite.config.ts vitest.config.ts src/lib/utils/thai.test.ts docs/testing.md
  git commit -m "test: establish unit test runner"
  ```

  Stage only the configuration path selected during implementation.

### Task 2: Cover Curriculum And Delivery Mapping

**Files:**

- Create: `src/lib/server/delivery-payload.test.ts`
- Create: `src/lib/utils/publication.test.ts`
- Create: `src/lib/data/__fixtures__/lesson.ts`

**Interfaces:**

- Consumes: Minimal valid and invalid published lesson payload fixtures
- Produces: Regression protection for payload validation and publication cache keys

- [ ] **Step 1: Write mapping boundary tests**

  Cover one minimal valid lesson, missing required fields, invalid drill options,
  mismatched lesson ordinals, invalid tip attachments, and stable error messages
  that routes intentionally expose.

- [ ] **Step 2: Write publication helper tests**

  Cover deterministic cache keys, artifact filenames, and unsafe publication IDs.

- [ ] **Step 3: Run and fix only discovered contract defects**

  ```bash
  pnpm test:unit src/lib/server/delivery-payload.test.ts src/lib/utils/publication.test.ts
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add src/lib/server/delivery-payload.test.ts src/lib/utils/publication.test.ts src/lib/data/__fixtures__/lesson.ts
  git commit -m "test: cover curriculum delivery contracts"
  ```

### Task 3: Cover Learner State And Server Validation

**Files:**

- Create: `src/lib/stores/progress.test.ts`
- Create: `src/lib/server/auth.test.ts`
- Extract and test: `src/lib/server/learner-sync-input.ts`
- Modify: `src/routes/api/learner/sync/+server.ts`

**Interfaces:**

- Produces: `readLessonCompletionAttempts(value: unknown): LessonCompletionSyncInput[] | null`
- Consumes: Fake storage adapter or controlled browser-storage shim

- [ ] **Step 1: Test auth helpers**

  Cover exact redirect allow-list behavior, hostile redirect input, email
  normalization, OTP normalization, missing clients, and verified-user failures.

- [ ] **Step 2: Extract and test sync parsing**

  Move the pure parsing logic out of the route. Cover malformed JSON shapes,
  attempt-count bounds, duplicate IDs, UUID validation, lesson bounds, score
  bounds, timestamps, and time-spent bounds.

- [ ] **Step 3: Test learner progress behavior**

  Cover initialization, corrupted storage recovery, completion idempotency,
  known-letter/word derivation, and reconciliation with a newer server projection.

- [ ] **Step 4: Validate and commit**

  ```bash
  pnpm test:unit
  pnpm check:all
  git add src/lib/stores/progress.test.ts src/lib/server/auth.test.ts src/lib/server/learner-sync-input.ts src/lib/server/learner-sync-input.test.ts src/routes/api/learner/sync/+server.ts
  git commit -m "test: cover learner and auth boundaries"
  ```

### Task 4: Add Accessible Component Tests

**Files:**

- Modify: `package.json`
- Modify: test configuration
- Create: `src/lib/components/ui/*.test.ts`
- Create: `src/lib/components/lesson/*.test.ts`

**Interfaces:**

- Produces: `pnpm test:components`

- [ ] **Step 1: Add the Svelte component test environment**

  Install current compatible Svelte Testing Library, DOM environment, user-event,
  and axe integration. Keep configuration separate from Node-only tests.

- [ ] **Step 2: Test reusable interactive primitives**

  Cover Button link/button semantics, Disclosure keyboard/open state,
  HelpPopover focus return, RadioButtons labels and keyboard selection, and
  ThemeToggle accessible name/state.

- [ ] **Step 3: Test one representative lesson flow**

  Render the learn flow with a minimal typed fixture and verify forward/back
  navigation, answer reveal, reduced-motion behavior, and final completion
  callback without asserting internal state variables.

- [ ] **Step 4: Validate and commit**

  ```bash
  pnpm test:components
  pnpm check:all
  git add package.json pnpm-lock.yaml vitest.config.ts src/lib/components
  git commit -m "test: add accessible component coverage"
  ```

### Task 5: Add Local Supabase Integration Tests

**Files:**

- Create: `tests/integration/learner-projection.test.ts`
- Create: `tests/integration/learner-sync.test.ts`
- Create: `scripts/run-db-tests.mjs`
- Modify: `package.json`
- Modify: `docs/testing.md`

**Interfaces:**

- Produces: `pnpm test:db` against local Supabase only

- [ ] **Step 1: Add environment safety checks**

  Abort unless the Supabase URL resolves to the documented local host and a
  disposable test user namespace is selected. Never accept a production URL.

- [ ] **Step 2: Test RLS and projection behavior**

  Cover anonymous denial, cross-user isolation, automatic enrollment,
  publication projection ordering, and no leakage of another learner's state.

- [ ] **Step 3: Test sync behavior**

  Cover idempotent client attempt IDs, score aggregation, timestamp bounds,
  invalid publication/lesson pairs, oversized batches, and rollback on invalid rows.

- [ ] **Step 4: Validate and commit**

  ```bash
  pnpm db:start
  pnpm test:db
  pnpm db:stop
  git add tests/integration scripts/run-db-tests.mjs package.json docs/testing.md
  git commit -m "test: add learner database integration suite"
  ```

### Task 6: Add End-To-End Journeys And Deployment Smoke Tests

**Files:**

- Modify: `package.json`
- Create: `playwright.config.ts`
- Create: `tests/e2e/anonymous-learning.spec.ts`
- Create: `tests/e2e/authentication.spec.ts`
- Create: `tests/e2e/progress-sync.spec.ts`
- Create: `tests/e2e/accessibility.spec.ts`
- Create: `tests/e2e/deployment-smoke.spec.ts`
- Modify: `docs/testing.md`

**Interfaces:**

- Produces: `pnpm test:e2e` and `pnpm test:smoke -- "$BASE_URL"`

- [ ] **Step 1: Configure Playwright projects**

  Cover desktop Chromium and one mobile viewport initially. Add Firefox/WebKit
  only after the core suite is stable. Capture trace and screenshot on first retry.

- [ ] **Step 2: Test anonymous learning**

  Start a lesson, complete learning and practice, verify resume/progress after
  reload, and verify corrupted local state recovers safely.

- [ ] **Step 3: Test auth without a real inbox**

  Use local Supabase/Mailpit or a controlled test-only OTP seam. Test request,
  invalid code, valid code, sign-out, and safe redirects. Never add a production
  OTP bypass.

- [ ] **Step 4: Test synchronization and accessibility**

  Verify local completion merges once, another session sees projected progress,
  keyboard navigation works, and representative pages pass axe checks with
  documented exceptions only.

- [ ] **Step 5: Add deployed smoke coverage**

  Against a supplied base URL, check homepage, lesson catalog, one lesson,
  auth page, projection endpoint, robots, sitemap, and security headers without
  mutating production learner data.

- [ ] **Step 6: Validate and commit**

  ```bash
  pnpm test:e2e
  pnpm check:all
  git add package.json pnpm-lock.yaml playwright.config.ts tests/e2e docs/testing.md
  git commit -m "test: add end-to-end and smoke suites"
  ```

### Task 7: Define Continuous Integration Gates

**Files:**

- Create: `.github/workflows/quality.yml`
- Modify: `docs/testing.md`
- Modify: `.ai/2026-07-11-pre-rollout-tasks.md`

**Interfaces:**

- Consumes: Unit, component, DB integration, and E2E scripts
- Produces: Required pull-request checks with staged runtime cost

- [ ] **Step 1: Add fast pull-request checks**

  Run frozen install, formatting, linting, type checks, unit tests, and component
  tests on every pull request with dependency caching keyed by `pnpm-lock.yaml`.

- [ ] **Step 2: Add controlled integration jobs**

  Run local Supabase integration tests and Playwright on main-branch changes or
  labeled pull requests until runtime and flake rates justify making them universal.

- [ ] **Step 3: Document ownership and flake policy**

  Do not silently retry or quarantine a failing test. Record an owner and repair
  issue before temporarily disabling any check.

- [ ] **Step 4: Close the post-launch task and commit**

  ```bash
  git add .github/workflows/quality.yml docs/testing.md .ai/2026-07-11-pre-rollout-tasks.md
  git commit -m "ci: enforce automated quality suites"
  ```
