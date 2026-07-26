# Testing

Glyphin uses [Vitest](https://vitest.dev) as its single test runner. This
document is the durable reference for how tests are organized and run today. The
staged rollout plan (which layers still to add) lives in
`.ai/2026-07-11-automated-test-suites.md`.

## Runner and environment

- **Runner:** Vitest 4 (`pnpm test` → `vitest run`, `pnpm test:watch` → `vitest`).
- **Config:** the `test` block in `vite.config.ts`. The `sveltekit()` plugin is
  present, so tests resolve `$lib` and the `svelte.config.js` aliases exactly as
  app code does — no separate alias map to keep in sync.
- **Environment:** `node`. There is no DOM/browser environment yet. The existing
  component `*.test.js` files assert on `.svelte` **source text** (regex over the
  file), not on a rendered DOM, so they need no DOM. A Testing Library / jsdom
  layer is a later addition (see the plan, Task 4).
- **Assertions:** tests use `node:assert/strict` with Vitest's `describe`/`it`.
  Vitest's `expect` is available too; match the surrounding file's style.

## Conventions

- Co-locate unit tests next to the module: `foo.ts` → `foo.test.ts`.
- Included globs: `src/**/*.{test,spec}.{js,ts}` and `scripts/**/*.test.mjs`.
- Test public behavior at trust boundaries, not private implementation details.
- Keep fixtures minimal and typed. Do not duplicate the full Thai curriculum.
- When a route holds pure validation/parsing logic worth testing, extract it into
  a plain module (e.g. `src/lib/server/learner-sync-input.ts`, extracted from the
  `/api/learner/sync` route) and test that in isolation.

## What is covered today

- **Curriculum/delivery mapping:** `delivery-payload`, `delivery-lesson-catalog`,
  `delivery-stage-payload` — published-payload validation and mapping.
- **Publication integrity:** `utils/publication` — deterministic artifact
  filenames and cache keys.
- **Auth boundary:** `server/auth` — the redirect allow-list (open-redirect
  rejection), email/OTP normalization, and form-field readers.
- **Learner-sync input:** `server/learner-sync-input` — the untrusted-payload
  parser for the sync endpoint (attempt bounds, UUID/score/timestamp validation,
  duplicate rejection).
- **Learner state & content:** `stores/progress-catalog`, `data/course-journey`,
  `data/thai`, display/formatting utils, `seo/metadata`, `server/security-headers`,
  `server/sitemap`, plus build-tooling scripts under `scripts/`.

## Running

```bash
pnpm test          # run once
pnpm test:watch    # watch mode
pnpm check:all     # full local gate: test + format + markdown + lint + style + type-check
```

## Continuous integration

`.github/workflows/quality.yml` runs the fast gate on every pull request and on
pushes to `main`: frozen install (pnpm cache keyed by `pnpm-lock.yaml`), then
`format:check`, `lint`, `stylelint`, `markdownlint`, `check` (svelte-check), and
`test`. Each check runs independently after install so one push surfaces every
failure at once.

Heavier suites (local Supabase integration, Playwright E2E, deployment smoke)
are not wired into CI yet; they are staged in the plan as separate, opt-in jobs.

## Flake policy

Do not silently retry or quarantine a failing test. Record an owner and a repair
issue before temporarily disabling any check.
