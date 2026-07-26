# Testing

Glyphin uses [Vitest](https://vitest.dev) as its single test runner. This
document is the durable reference for how tests are organized and run today. The
staged rollout plan (which layers still to add) lives in
`.ai/2026-07-11-automated-test-suites.md`.

## Runner and environment

- **Runner:** Vitest 4 (`pnpm test` → `vitest run`, `pnpm test:watch` → `vitest`).
- **Config:** the `test.projects` block in `vite.config.ts`. The `sveltekit()`
  plugin is inherited by both projects (`extends: true`), so tests resolve `$lib`
  and the `svelte.config.js` aliases exactly as app code does — no separate alias
  map to keep in sync.
- **Two projects, deliberately isolated:**
  - **`node`** — `environment: "node"`. Server trust boundaries, utilities,
    curriculum/delivery mapping, and build-tooling scripts. The component
    `*.test.js` files here assert on `.svelte` **source text** (regex over the
    file), not a rendered DOM.
  - **`dom`** — `environment: "jsdom"`, adds the `svelteTesting()` plugin
    (Testing Library auto-cleanup + the browser `resolve` conditions Svelte
    client rendering needs). Renders real components and exercises the
    localStorage-backed progress store. Setup lives in `src/test/setup-dom.ts`
    (minimal `matchMedia`/`ResizeObserver` stubs jsdom lacks).
  - The split exists so the browser resolve conditions in the `dom` project do
    **not** leak into `node`, where they would change how server deps like
    `@supabase/ssr` resolve. A file joins the `dom` project by using the
    `*.dom.test.ts` suffix.
- **Assertions:** `node` tests use `node:assert/strict` with Vitest's
  `describe`/`it`; `dom` tests use Vitest `expect` with Testing Library queries.
  Match the surrounding file's style.

## Conventions

- Co-locate unit tests next to the module: `foo.ts` → `foo.test.ts`. A test that
  needs a DOM (component render, `localStorage`) uses `foo.dom.test.ts` so it
  lands in the jsdom project.
- Included globs: `src/**/*.{test,spec}.{js,ts}` + `scripts/**/*.test.mjs`
  (node project), and `src/**/*.dom.test.{js,ts}` (dom project).
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
- **Progress store behavior (jsdom):** `stores/progress` — init from empty,
  corrupted-storage recovery, v3 snapshot rehydration, completion idempotency,
  known-letter/word derivation, localStorage persistence, and reconciliation with
  a newer server projection.
- **Component/DOM (jsdom):** representative UI primitives rendered with Testing
  Library — `Button` (button/anchor semantics, disabled), `ThemeToggle`
  (accessible name + pressed state + callback), `Disclosure` (native
  details/summary), `RadioButtons` (roles, click + arrow-key selection). Portaled
  Bits UI overlays (`HelpPopover`) are deferred to a real browser test layer
  rather than asserted against jsdom.

## Running

```bash
pnpm test          # run once (both projects)
pnpm test:watch    # watch mode
pnpm check:all     # full local gate: test + format + markdown + lint + style + type-check
```

## Deployment smoke test

`pnpm test:smoke -- <base-url>` (or `SMOKE_BASE_URL=<url> pnpm test:smoke`) runs
`scripts/smoke-deployment.mjs` — read-only GETs against a running deployment
(homepage h1 + security headers, first lesson, the unauthenticated projection
endpoint, `sitemap.xml`, `robots.txt`, `llms.txt`). It only performs GETs, never
mutates learner data, and takes the base URL as a required argument so it is
never pointed at a hardcoded production URL by accident. Run it against a
Cloudflare preview or a local `wrangler dev` build. It exits non-zero on any
failure, so it can gate a deploy step. It is **not** part of the fast PR gate.

## Continuous integration

`.github/workflows/quality.yml` runs the fast gate on every pull request and on
pushes to `main`: frozen install (pnpm cache keyed by `pnpm-lock.yaml`), then
`format:check`, `lint`, `stylelint`, `markdownlint`, `check` (svelte-check), and
`test`. Each check runs independently after install so one push surfaces every
failure at once.

Heavier suites (local Supabase integration, Playwright E2E) and the deployment
smoke test are not wired into the PR gate; they are staged in the plan as
separate, opt-in jobs.

`.github/dependabot.yml` opens weekly update PRs for the pnpm dependency tree and
the GitHub Actions used in CI, with routine minor/patch bumps grouped to keep
review load low. This is supply-chain hygiene ahead of the payments work.

## Flake policy

Do not silently retry or quarantine a failing test. Record an owner and a repair
issue before temporarily disabling any check.
