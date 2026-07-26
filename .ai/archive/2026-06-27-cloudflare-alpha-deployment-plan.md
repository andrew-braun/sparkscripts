# Cloudflare Workers Alpha Deployment Plan

- Status: **done — archived 2026-07-14.** The deployment shipped: the app is live
  at `https://glyphin.app` on Cloudflare Workers with `@sveltejs/adapter-cloudflare`,
  `wrangler.jsonc`, the production Supabase project, Resend SMTP, and Turnstile.
  The `LEARNER_SYNC_RATE_LIMITER` Rate Limiting binding is wired and
  `src/lib/server/rate-limit.ts` uses it (in-memory fallback for local dev only),
  which also closes the rate-limiter follow-up in
  `.ai/2026-07-11-db-security-hardening.md`. **One residual item, carried to
  `.ai/2026-07-14-backlog-clearing-plan.md` (Task 3):** the authenticated Step 11
  smoke checks (real OTP sign-in through Turnstile, lesson-completion sync
  persistence, sign-out, cookie attributes) still need a human — they require
  solving a live captcha and receiving real email. Historical detail below.

- Status at pause (2026-07-12): Supabase production bootstrap is complete and
  verified, the SvelteKit app is Worker-compatible (committed), local
  validation (Step 8) passed end-to-end, and Cloudflare Workers Builds is
  deploying the `glyphin` Worker from `main` (Step 9;
  Version ID `886ba2cc-7c57-4bbf-a3f6-876b6e0c7f37`). The user deployed
  straight to production and attached the custom domain directly from `main`,
  ahead of the plan's original preview-first sequencing. Step 10 is now fully
  done: custom domain live, Supabase Auth Site URL set, Resend SMTP
  configured, OTP expiry mirrored to `1200`, email templates set, rate limits
  tuned, and Cloudflare Turnstile CAPTCHA live on `/auth` (after fixing a
  dashboard-var-wiped-by-deploy issue — set as a Secret, not a plain Text
  var). Public/unauthenticated Step 11 smoke checks passed against
  `https://glyphin.app`. Remaining: the authenticated Step 11 checks (real
  OTP sign-in through Turnstile, lesson-completion sync/refresh persistence,
  sign-out, cookie attribute verification) still need to be run by the user
  directly, since they require solving a live captcha and receiving real
  email — not something this agent can do. See
  `.ai/archive/2026-07-04-cloudflare-deployment-plan-review.md` for the
  earlier plan review.

## Current Pause State

- Branch: `deploy/cloudflare-alpha`.
- Supabase project: `Glyphin`, ref `mtpkjcvbhkxbmqpreblp`, region
  `eu-west-1`, linked and active.
- Remote DB bootstrap: completed with linked reset, all migrations applied, and
  `supabase/seed.sql` seeded.
- Remote DB verification: `pnpm db:prod:lint` passed, `pnpm db:prod:advisors`
  passed, linked content check found `1` course, `1` course version, `46`
  lessons, `418` vocabulary items, `46` delivery lesson bundles, and all `3`
  expected learner RPCs.
- Supabase CLI note: use `pnpm exec supabase` or `pnpm db:prod:*`; avoid bare
  `supabase` because it resolves to an older global CLI on this machine. The
  stale `~/.supabase/profile` marker was moved aside during setup to fix
  `failed to read profile: Unsupported Config Type ""`.
- Production Data API exposed schemas: `delivery` and `learner` were added via
  Project Settings > Data API in the Supabase dashboard on 2026-07-12 (matching
  `supabase/config.toml`'s `[api].schemas`). This only makes PostgREST route to
  those schemas; it does not by itself grant access — `learner` still has all
  table privileges revoked from `anon`/`authenticated` (only `SECURITY DEFINER`
  RPCs are reachable), and `delivery` read access is scoped by RLS to
  `is_active = true` rows. `internal_api` was not added to the exposed list.
- Cloudflare app work complete and committed (`3a5ca61`): `@sveltejs/adapter-cloudflare`,
  `wrangler`, `@cloudflare/workers-types`, `wrangler.jsonc`, and the Cloudflare
  Rate Limiting binding path for learner sync have all been added.
- Step 8 local validation completed on 2026-07-12:
  - `pnpm check`, `pnpm lint`, `pnpm stylelint` all pass clean. (`pnpm
check:all`'s `format:check` step fails only on pre-existing, unrelated
    files outside this work — `.pnpm-store/`, `.kilo/`, `.superpowers/`, and
    other untouched `.ai/*.md` docs are not covered by `.prettierignore`; not
    fixed here, out of scope.)
  - `pnpm build` ran successfully against the real production Supabase project
    (temporarily pointing local `.env` at
    `https://mtpkjcvbhkxbmqpreblp.supabase.co` with the production publishable
    key, then restoring local dev values afterward — `.env` is gitignored so
    this left no tracked changes). Verified `.svelte-kit/cloudflare/_worker.js`
    and all 46 prerendered `/learn/<id>` and `/learn/<id>/practice` routes were
    emitted as static output.
  - Added a local `.dev.vars` file (gitignored, new pattern — added
    `.dev.vars`/`.dev.vars.*` to `.gitignore`) holding `SUPABASE_AUTH_URL` and
    `SUPABASE_AUTH_PUBLISHABLE_KEY` so `wrangler dev` has runtime secrets, the
    same two values that go into Cloudflare's Settings > Variables & Secrets
    later. Documented this pattern in `AGENTS.md`'s Validation Workflow.
  - Ran `pnpm exec wrangler dev .svelte-kit/cloudflare/_worker.js` locally and
    smoke tested `/`, `/learn`, `/learn/1`, `/learn/1/practice`,
    `/api/learner/projection` (returned the expected unauthenticated
    projection), and `/auth` — all `200`; an unknown route correctly returned
    `404`. The `LEARNER_SYNC_RATE_LIMITER` binding, `ASSETS` binding, and both
    runtime secrets bound correctly in the local simulation with no errors in
    the Wrangler log.
- Cloudflare Workers Builds connected on 2026-07-12; see Step 9 for the full
  account of the first preview build, the branch/build-var/Worker-name issues
  hit and fixed (including recreating the Worker once, since Cloudflare
  Workers cannot be renamed), and the resulting `wrangler.jsonc` changes
  (`name` -> `glyphin`, explicit `workers_dev`/`preview_urls: true`).
- Verification still pending: confirming the dashboard's production-branch
  mapping matches intent (see Step 9's note — the latest build ran the
  production `wrangler deploy` command, not the preview
  `wrangler versions upload` command), Step 11 smoke tests against the live
  URL, and custom domain + Resend SMTP (Step 10).
- Current code state: this plan file, `AGENTS.md`, `.gitignore`,
  `docs/deployment-cloudflare.md`, `package.json` (`devEngines.packageManager`
  addition), and `wrangler.jsonc` (Worker name/`workers_dev`/`preview_urls`
  fixes) are modified and uncommitted; everything else from this session was
  either already committed or is a local gitignored file (`.env`,
  `.dev.vars`). Start the next session with `git status --short`.

## Summary

Deploy Glyphin as a Cloudflare Workers Static Assets app backed by a fresh
production Supabase project. Bootstrap Supabase first: the SvelteKit build
prerenders public curriculum from Postgres delivery reads, and the runtime
Worker depends on Supabase auth and learner-state RPCs. Use Workers as the
long-term Cloudflare target instead of Cloudflare Pages, with Git-based
deployment (Cloudflare Workers Builds) as the deployment workflow from day one.
The repo already lives on GitHub, so there is no separate manual-deploy
bootstrap phase: local validation plus a non-production preview deploy proves
the Worker before the production branch goes live.

The deployment model is:

- A fresh production Supabase project is created, linked, migrated/seeded, and
  verified before the first Cloudflare Worker build is configured.
- Public, stable curriculum pages are built from Supabase at deploy time and
  prerendered into static assets.
- Personalized/session-aware routes run in the Cloudflare Worker.
- Supabase remains the source of truth for curriculum, auth, and learner state.
- The deployed Worker must not depend on runtime Node filesystem access.

Reference docs:

- [Cloudflare SvelteKit Workers guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/sveltekit/)
- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Cloudflare Workers GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)
- [Cloudflare Workers Node.js compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
- [SvelteKit Cloudflare adapter](https://svelte.dev/docs/kit/adapter-cloudflare)
- [Supabase SvelteKit auth](https://supabase.com/docs/guides/auth/server-side/sveltekit)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)

## Architectural Principle: Keep The Backend Contract Mobile-Ready

The long-term goal is a mobile app running in parallel with the web app, so
phase-1 choices must not entrench web-only patterns.

- The durable cross-platform contract is the Postgres RPC / security-definer
  layer (the functions `src/lib/server/learner-projection.ts` already calls),
  not the SvelteKit routes. Both clients sit thinly on top of the same DB
  contract under RLS.
- Web (now): SvelteKit BFF with cookie-based auth via `@supabase/ssr`.
- Mobile (phase 2): a Supabase client using bearer-token auth, calling the same
  RPCs directly under RLS. Native apps cannot reuse the cookie-based SvelteKit
  routes, so treating those routes as the contract would force a rebuild.
- Keep learner sync/projection business logic in the database (RPC / security
  definer), not in `+server.ts` handlers, so logic added during the alpha stays
  reusable from mobile.
- For phase-2 mobile/native code, use `@supabase/supabase-js` with the native
  client's bearer-token/session model and call the same RPCs under RLS.
  `@supabase/ssr` remains the web BFF package for cookie-backed SvelteKit
  server clients; do not invent a web-route contract just because the first
  client is the web app.

## Implementation Steps

### 1. Prepare A Deployment Branch And Tracker

- Work on `deploy/cloudflare-alpha`. Confirmed active branch on 2026-07-12.
- Continue updating this plan during implementation; this review is tracked in
  `.ai/2026-07-04-cloudflare-deployment-plan-review.md`.
- Treat Supabase project creation, auth, env vars, DNS, and production deploy as
  security-sensitive sign-off gates.
- Use Workers Static Assets as the deployment target; do not create a Cloudflare
  Pages project for this alpha.
- Deploy via Cloudflare Workers Builds (GitHub integration) from the start. The
  `deploy/cloudflare-alpha` branch (or another non-production branch) acts as the
  preview/verification branch via the non-production branch deploy command
  (`wrangler versions upload`); merging to the production branch is what ships.
  There is no separate manual `wrangler deploy` bootstrap step.

### 2. Bootstrap The Production Supabase Project Before Cloudflare

- Completed on 2026-07-12: created and linked a fresh Supabase project for
  alpha before configuring the Cloudflare Worker or Workers Builds.
- Default region: Europe West/Ireland if available, because the target audience
  is primarily U.S./European even though the target language is Thai. Supabase
  CLI region choice confirmed as `eu-west-1` on 2026-07-12.
- Captured project ref: `mtpkjcvbhkxbmqpreblp`. API URL is
  `https://mtpkjcvbhkxbmqpreblp.supabase.co`. Publishable/anon key still needs
  to be copied into local build env/Cloudflare dashboard surfaces before build
  verification.
- Use the dedicated Supabase CLI scripts added on 2026-07-12:
  `pnpm db:prod:login`, `pnpm db:prod:projects`, and
  `pnpm db:prod:link -- --project-ref <ref>`. Use the project-local
  `pnpm exec supabase`/package scripts rather than bare `supabase`; bare
  `supabase` resolves to an older global CLI on this machine. Do not pass
  `--profile glyphin` to linked DB commands, and move aside
  `~/.supabase/profile` if the CLI reports
  `failed to read profile: Unsupported Config Type ""`.
- Completed on 2026-07-12 for this fresh alpha only: ran the destructive linked
  reset after user-side confirmation that the project had no real user data.
  Shortcut: `pnpm db:prod:reset:fresh-alpha`.
- Run database verification before any Cloudflare configuration:
  - `pnpm db:lint` (local run on 2026-07-12 is blocked until Docker is running;
    `pnpm check` passed with 0 errors and 0 warnings)
  - `pnpm db:prod:lint` passed on 2026-07-12 after the linked reset
  - `pnpm db:prod:advisors` passed on 2026-07-12 after the linked reset
  - a linked schema/content check after reset
    - 2026-07-12 linked counts: `1` course, `1` course version, `46` lessons,
      `418` vocabulary items, `46` delivery lesson bundles, and all `3`
      expected learner RPCs present
  - a local `pnpm db:content:refresh` if needed to regenerate
    `.generated/` publication artifacts from the linked project
- Confirmed on 2026-07-12: the linked production project exposes the schemas
  and RPC surfaces the app requires:
  - `delivery` for build-time published curriculum reads — added to Data API
    exposed schemas via the dashboard.
  - `learner` for learner projection and sync — added to Data API exposed
    schemas via the dashboard; still has zero direct table grants for
    `anon`/`authenticated`, access is RPC-only.
  - auth configuration ready for the web BFF flow, with custom domain/SMTP
    settings still gated until the Cloudflare URL is known
- Record the exact values needed by the later Cloudflare phase:
  - Build env vars: `SUPABASE_DELIVERY_URL`,
    `SUPABASE_DELIVERY_ANON_KEY`
  - Runtime secrets: `SUPABASE_AUTH_URL`,
    `SUPABASE_AUTH_PUBLISHABLE_KEY`
- After real alpha users exist, stop using remote reset and switch to
  migration-only `pnpm exec supabase db push`.

### 3. Make The SvelteKit App Worker-Compatible

- Complete and committed as of 2026-07-12 (`3a5ca61`); verified via a
  production build plus local Wrangler simulation the same day (see Step 8).
- Replaced `@sveltejs/adapter-node` with `@sveltejs/adapter-cloudflare`.
- Remove unused `@sveltejs/adapter-static` if still unused after the adapter
  swap.
- Added `wrangler` as a dev dependency.
- Updated `svelte.config.js` to import and use the Cloudflare adapter.
- Added `@cloudflare/workers-types` because runtime code now reads the typed
  Cloudflare Rate Limiting binding from `event.platform.env` via SvelteKit's
  current request event. Ordinary string env vars still use SvelteKit `$env`
  modules.
- Added `wrangler.jsonc` for Workers Static Assets:
  - `name`: must match the Worker name created in Cloudflare's dashboard —
    `glyphin`, matching `package.json`'s `name`. This took two attempts: the
    dashboard's Git-import flow first auto-named the Worker `glyphbridge` from
    the repo folder, and since Cloudflare Workers cannot be renamed after
    creation, fixing it meant deleting that Worker and recreating it with the
    correct name (see Step 9). A name mismatch between `wrangler.jsonc` and
    the actual dashboard-created Worker makes every build override remote
    config and triggers Cloudflare's auto-PR flow, so keep this in sync with
    whatever the dashboard actually created, and pick the name deliberately at
    creation time to avoid repeating this.
  - `main`: `.svelte-kit/cloudflare/_worker.js`.
  - `workers_dev` / `preview_urls`: `true`, explicit rather than left to
    Wrangler's default — needed for the `workers.dev` smoke-testing URL this
    plan's Assumptions section calls for before the custom domain lands.
  - `assets.binding`: `ASSETS`.
  - `assets.directory`: `.svelte-kit/cloudflare`.
  - `compatibility_date`: the implementation date (must be `2024-09-23` or
    later so `nodejs_compat` resolves to `nodejs_compat_v2`).
  - `compatibility_flags`: use `["nodejs_compat"]` from the start. Do not start
    with `nodejs_als`. `nodejs_compat` is a superset that already includes
    `AsyncLocalStorage`, and both `@supabase/ssr` and `@supabase/supabase-js`
    pull in Node built-ins (`stream`, `buffer`, etc.) that fail on Workers
    without it. Cloudflare's own Supabase-on-Workers guidance requires
    `nodejs_compat`.
  - Reference config:

    ```jsonc
    {
    	"name": "glyphin",
    	"main": ".svelte-kit/cloudflare/_worker.js",
    	"compatibility_date": "<implementation date, >= 2024-09-23>",
    	"compatibility_flags": ["nodejs_compat"],
    	"workers_dev": true,
    	"preview_urls": true,
    	"assets": {
    		"binding": "ASSETS",
    		"directory": ".svelte-kit/cloudflare",
    	},
    }
    ```

- Keep `vite.config.ts` unchanged unless Wrangler/SvelteKit integration requires
  an explicit adjustment during implementation.
- No server code change is expected for env access: SvelteKit's `$env` modules
  are the preferred interface for environment variables, and `event.platform.env`
  is only needed for Cloudflare-specific bindings such as KV, D1, Durable
  Objects, and similar resources. Keep `src/hooks.server.ts` and
  `src/lib/server/delivery-lessons.ts` on `$env/dynamic/private`; do not rewrite
  them to read `platform.env` directly for ordinary string secrets.
- Replaced the Worker runtime rate limiter path with Cloudflare's Rate Limiting
  binding in `wrangler.jsonc`; local development still falls back to the
  in-memory token bucket when the binding is unavailable.
- Original risk addressed: the previous `src/lib/server/rate-limit.ts` store
  kept token-bucket state in process memory, which would only throttle within a
  single Worker isolate. `/api/learner/sync` now still calls
  `consumeRateLimitToken`, but the implementation uses the Cloudflare binding
  when present. Note `src/lib/server/delivery-lessons.ts` also caches a
  module-scoped client + publication id; that is safe (rebuildable per-isolate)
  but still needs build/runtime verification. Tracked in
  `.ai/2026-07-11-db-security-hardening.md` (audit #10).

### 4. Preserve Build-Time Supabase Reads And Prerendering

- Keep build-time reads from Supabase `delivery.*`; the database is the source
  of truth for published curriculum.
- Keep `pnpm build` able to generate/prerender public lesson content from the
  active Supabase publication.
- Keep or refine `publication:generate` as a build-time publication artifact
  step if it remains the cleanest way to feed SvelteKit prerendering.
- Do not remove build-time database access just to make the Worker simpler.
- Ensure Cloudflare build env vars include:
  - `SUPABASE_DELIVERY_URL`
  - `SUPABASE_DELIVERY_ANON_KEY`
- Preserve prerendering for stable public content:
  - `/learn`
  - `/learn/[id]`
  - other future public lesson/catalog routes that do not need user-specific
    state.

### 5. Remove Runtime Filesystem Dependence From The Worker

- Audit `src/lib/server/published-lessons.ts` and related publication paths.
- Ensure any `.generated` lesson artifacts are consumed during build/prerender,
  not opened from the deployed Worker at request time.
- Treat this as a load-bearing invariant: `published-lessons.ts` uses `node:fs`
  and `process.cwd()/.generated`, which only works because every route that
  imports it (`/learn`, `/learn/[id]`) is `prerender = true`, so those reads run
  at build time. No non-prerendered route may import `published-lessons.ts`.
  With `nodejs_compat` enabled, a violating import would bundle cleanly and then
  fail at request time with a missing-file error (a worse failure mode than a
  build break), so guard against it deliberately.
- Before shipping, verify with `rg` that `published-lessons.ts` is imported only
  from prerendered route modules or build-only code.
- If publication artifacts stay in the repo build flow, make them bundler-safe
  build inputs or direct prerender inputs.
- Runtime Worker code should fall back to Supabase only for routes that are not
  prerendered or are genuinely dynamic.
- Runtime auth/progress routes remain Worker-backed:
  - `/auth`
  - `/auth/sign-out`
  - `/api/learner/projection`
  - `/api/learner/sync`

### 6. Update Durable Docs And Instructions

- Update `AGENTS.md` and `.github/copilot-instructions.md` to say the deployment
  target is Cloudflare Workers Static Assets with a server-capable SvelteKit
  runtime.
- Update `docs/auth.md` to replace stale `adapter-node` wording with Cloudflare
  Workers/SvelteKit server runtime wording.
- Add a short `docs/deployment-cloudflare.md` runbook covering:
  - Worker build settings (build command, deploy command, production branch)
  - required build env vars and runtime secrets, and which dashboard section each
    lives in
  - Workers Builds/Git deployment (preview branch -> production branch flow)
  - local Wrangler simulation for pre-push verification
  - custom domain setup
  - rollback (Worker version rollback + git revert)
  - smoke tests

### 7. Configure Worker Build And Runtime Secrets

- Configure local `.env` for build-time Supabase delivery reads.
- Workers Builds separates build-time and runtime config in the dashboard. Use
  the two distinct locations deliberately:
  - Build env vars (Settings > Build, build-only, not present at runtime):
    - `SUPABASE_DELIVERY_URL`
    - `SUPABASE_DELIVERY_ANON_KEY`
  - `NODE_VERSION`/`PNPM_VERSION` dashboard vars are not needed. The first
    build against the (since-deleted) `glyphbridge` Worker did need them set
    explicitly — without them it detected `nodejs@22.16.0`/`pnpm@10.11.1`
    despite the committed `.nvmrc` (`24.15.0`) and `package.json`'s
    `packageManager`/`devEngines.packageManager` (`pnpm@11.6.0`). But the
    first build against the recreated `glyphin` Worker, with no version vars
    set at all, correctly detected `nodejs@24.15.0, pnpm@11.6.0` straight from
    committed config. Conclusion: the earlier failure was specific to that
    Worker/build-cache state, not a general Workers Builds limitation — leave
    the vars unset and rely on `.nvmrc`/`packageManager`/`devEngines`; only
    re-add them if a future build regresses to wrong detected versions.
  - Runtime secrets (Settings > Variables & Secrets):
    - `SUPABASE_AUTH_URL`
    - `SUPABASE_AUTH_PUBLISHABLE_KEY`
- Keep `SUPABASE_DELIVERY_URL` and `SUPABASE_DELIVERY_ANON_KEY` as build env vars
  only, not runtime secrets. Delivery reads happen at build (prerender) or as a
  fallback that must remain reachable only from prerendered routes, so the
  deployed Worker should not need them. Add them as runtime secrets later only if
  a non-prerendered route deliberately starts reading `delivery.*` and that
  change passes a security review.
- Set the two runtime secrets via the dashboard (or `wrangler secret put`).
  Secrets set this way persist across Git deploys; `wrangler deploy` does not
  delete them. Do not put secrets in `wrangler.jsonc`.
- Do not put runtime secrets in Workers Builds build variables; build variables
  are build-only and are the wrong surface for auth runtime configuration.
- Never use or store a Supabase service-role key in Cloudflare for this alpha.

### 8. Validate Locally Before Connecting Git

- Completed 2026-07-12. See "Current Pause State" above for full detail.
- Ran local validation:
  - `pnpm install` — already up to date.
  - `pnpm check` — 0 errors, 0 warnings.
  - `pnpm lint` / `pnpm stylelint` — clean. (`pnpm check:all`'s format step
    flags only pre-existing unrelated files; not this work's concern.)
  - `pnpm build` — succeeded against the real production Supabase project;
    confirmed `_worker.js` and all 46 prerendered lesson routes in
    `.svelte-kit/cloudflare`.
- Ran a local Worker simulation of the built Cloudflare output with Wrangler:
  `pnpm exec wrangler dev .svelte-kit/cloudflare/_worker.js`, using a new local
  `.dev.vars` file for runtime secrets. Exercised both prerendered static pages
  (`/`, `/learn`, `/learn/1`, `/learn/1/practice`) and Worker-backed routes
  (`/api/learner/projection`, `/auth`) — all `200`, unknown route `404`, no
  errors in the Wrangler log, all bindings (rate limiter, assets, both runtime
  secrets) resolved correctly.
- This caught the one real gap before connecting Git: the production Supabase
  project's Data API did not yet expose `delivery`/`learner`, which would have
  failed the very first Workers Builds build. Fixed via the dashboard (see
  Step 2).

### 9. Set Up Git-Based Deployment (Workers Builds)

- Connect the existing GitHub repo to a new Worker via Cloudflare Workers Builds.
  This creates the Worker and runs the first build/deploy; there is no separate
  manual `wrangler deploy` bootstrap.
- Configure build settings in the dashboard:
  - Build command: `pnpm build` (runs `prebuild` -> `publication:generate` ->
    `vite build`).
  - Deploy command (production branch): `pnpm exec wrangler deploy`.
  - Non-production branches: `pnpm exec wrangler versions upload` for preview
    URLs used to verify before promoting to production.
  - Git branch (production): the production branch (defaults to `main`).
- Enable non-production branch builds so Cloudflare uses the configured
  non-production deploy command for preview versions instead of promoting every
  branch push.
- Add the build env vars and runtime secrets from step 7 in their respective
  dashboard sections.
- Note: Workers Builds does not honor `[build]` custom-build config in
  `wrangler.jsonc`; the build command lives in the dashboard build settings.
- First-deploy verification flow:
  - Push `deploy/cloudflare-alpha` (non-production) to trigger a preview
    `versions upload`, and verify the Worker on its preview/`workers.dev` URL.
  - Only after preview verification passes, merge to the production branch to
    trigger the production `wrangler deploy`.
- Optional fallback (only if Workers Builds proves limiting): a GitHub Actions
  workflow running `pnpm install`, `pnpm check`, `pnpm build`, and
  `pnpm exec wrangler deploy`. Prefer native Workers Builds for the alpha.
- First preview build succeeded on 2026-07-12 (`pnpm exec wrangler versions
upload`, Worker Version ID `b264a70e-4178-42c8-9c26-50021846c799`). Two
  issues surfaced and were fixed:
  - An early build attempt failed because the dashboard's production branch
    was initially pointed at a stale branch that predated the Cloudflare
    adapter work (wrong `@sveltejs/adapter-auto`/old dependency versions in
    the build log, and a `pnpm-workspace.yaml` `allowBuilds` policy mismatch
    that made pnpm ignore `esbuild`'s postinstall). Fixed by pointing the
    dashboard's branch selection at the correct branch.
  - `NODE_VERSION`/`PNPM_VERSION` build vars appeared required against the
    original `glyphbridge` Worker: with them unset, Workers Builds detected
    `nodejs@22.16.0` and `pnpm@10.11.1` instead of reading the committed
    `.nvmrc` (`24.15.0`) or `package.json`'s
    `packageManager`/`devEngines.packageManager` (`pnpm@11.6.0`). Setting both
    dashboard vars fixed detection at the time (`nodejs@24.15.0, pnpm@11.6.0`
    in the log). This did not hold up: the first build against the recreated
    `glyphin` Worker (see below), with both vars deliberately left unset,
    still detected `nodejs@24.15.0, pnpm@11.6.0` correctly from committed
    config alone. Treat the original failure as Worker/cache-state-specific,
    not a standing Workers Builds limitation — see Step 7's updated note.
  - Wrangler warned of a Worker-name mismatch: `wrangler.jsonc` said
    `glyphin-alpha`, but the dashboard's Git-import flow had already created
    the Worker as `glyphbridge` (auto-derived from the repo folder name, not a
    deliberate choice — the app's actual name is `glyphin`, matching
    `package.json`). Workers Builds used the CI-provided name for the actual
    upload. Also made `workers_dev`/`preview_urls` explicit `true` in
    `wrangler.jsonc` (the dashboard-created Worker had both `false`; the
    preview upload's local-vs-remote config diff flipped them to `true` as a
    side effect — kept deliberately since a `workers.dev` URL is needed for
    smoke testing before the custom domain lands, now committed as an
    explicit choice instead of an implicit default).
  - Cloudflare Workers cannot be renamed after creation (no rename path in the
    dashboard, Wrangler, or the API — the name is the permanent resource
    identifier and `*.workers.dev` subdomain). Since the `glyphbridge` Worker
    was never promoted to serving traffic and no custom domain was attached
    yet, the fix was to delete it and recreate the Worker correctly named
    `glyphin` via the dashboard's Git-import flow, re-doing the rest of this
    step's dashboard configuration (build settings, build env vars, runtime
    secrets) against the new Worker. `wrangler.jsonc`'s `name` updated to
    `glyphin` to match.
- Recreated-Worker build succeeded on 2026-07-12: pushed with `NODE_VERSION`/
  `PNPM_VERSION` dashboard vars removed (see Step 7), and the build correctly
  detected `nodejs@24.15.0, pnpm@11.6.0` from committed config alone. No
  Worker-name-mismatch warning this time. Deployed as `glyphin` (production
  deploy command ran, not the preview command — see note below) at
  `https://glyphin.andrewbraundev.workers.dev`, Version ID
  `886ba2cc-7c57-4bbf-a3f6-876b6e0c7f37`.
- User deployed to production from `main` and attached the custom domain
  directly, ahead of the plan's original preview-branch-first sequencing.
  Production is live on the custom domain as of this session. Retroactively
  applying the rest of Step 10 (Supabase Auth Site URL/redirects, Resend
  SMTP) and Step 11 (smoke tests) against the live domain rather than a
  preview URL.

### 10. Attach The Custom Domain

- Done on 2026-07-12: the custom domain `https://glyphin.app` is attached to
  the `glyphin` Worker and live, deployed from `main` (see Step 9). SSL is
  provisioned — public smoke checks over HTTPS succeeded (see Step 11).
- Code check on 2026-07-12: `src/routes/auth/+page.server.ts` uses
  `signInWithOtp`/`verifyOtp` with a typed six-digit code, no
  `emailRedirectTo`/magic-link flow anywhere in the codebase. This means the
  Supabase Auth **redirect allow list is not on the sign-in code path today**
  — no click-through callback URL is ever generated. Still worth setting
  correctly (avoid wildcards) as future-proofing if magic-link/OAuth is added
  later, but it is not the blocking item; **Site URL** and **custom SMTP**
  are.
- Configure Supabase Auth URL settings (Auth > URL Configuration):
  - Site URL: `https://glyphin.app` — **done**, confirmed by the user
    2026-07-12.
  - Redirect allow list: add `https://glyphin.app` as a sane default; avoid
    wildcard entries. Not currently exercised by the app's own code, low
    priority relative to SMTP/Site URL.
- Configure custom SMTP via Resend before sharing the URL. This is a hard gate,
  not optional polish: Supabase's default email service only delivers to project
  team members and is heavily rate-limited, so external alpha testers
  cannot receive OTP codes without it. Email OTP is the entire auth flow.
  **Done** — user confirmed Resend SMTP, Site URL, OTP expiry (1200s), email
  templates, and rate limits all configured, 2026-07-12.
  - Create a Resend account, verify the sending domain (add the SPF/DKIM/DMARC
    DNS records Resend provides — `glyphin.app` is already on Cloudflare DNS,
    so add them there), and create an API key (used as the SMTP password).
  - In Supabase Auth SMTP settings (Auth > Sign In / Providers > SMTP
    Settings, or via the Management API), set (confirmed against Resend's and
    Supabase's current docs, 2026-07-12):
    - Host: `smtp.resend.com`
    - Port: `587` (explicit TLS; `465`/`2465` are implicit-TLS alternatives)
    - Username: `resend`
    - Password: the Resend API key
    - Sender/from address: an address on the verified domain, e.g.
      `noreply@glyphin.app`
    - Sender name: `Glyphin`
  - Note: Supabase still imposes a default 30 messages/hour limit even after
    custom SMTP is enabled — raise it on the Auth > Rate Limits page if alpha
    volume needs more.
  - Correction, found 2026-07-12: not "3600 or lower" as originally written
    here — `supabase/config.toml` (`[auth.email] otp_expiry = 1200`, added in
    a 2026-07-11 security audit) already documents the intended value as
    **1200 seconds (20 minutes)**, specifically to shrink the code-interception
    window, with an explicit comment that "the hosted project must mirror
    this value in the dashboard." Set the hosted project's OTP expiry to
    `1200`, not a generic `<=3600`. `config.toml` only governs the local
    `supabase start` instance — nothing pushes this to the linked hosted
    project automatically, so the dashboard value must be set by hand and can
    silently drift from `config.toml` if not checked.
  - Tune auth rate limits (sign-in, OTP initiation, token verification, refresh)
    to sane alpha values.
  - CAPTCHA (Cloudflare Turnstile). App-side implementation done on
    2026-07-12:
    - `src/routes/auth/+page.svelte` renders the Turnstile widget (script +
      `.cf-turnstile` div) inside the `requestCode` form only, reading the
      site key from `PUBLIC_TURNSTILE_SITE_KEY` via `$env/dynamic/public`
      (skips rendering if unset). Turnstile auto-injects a
      `cf-turnstile-response` hidden field into the form on submit — no
      extra client JS needed beyond Cloudflare's own script.
    - `src/routes/auth/+page.server.ts`'s `requestCode` action reads that
      field and passes it as `signInWithOtp`'s `options.captchaToken`.
      `verifyCode`/`verifyOtp` deliberately does **not** get a captcha token —
      confirmed via the installed `@supabase/auth-js@2.110.2` type
      definitions that `captchaToken` on `VerifyEmailOtpParams` is
      `@deprecated`, while `SignInWithPasswordlessCredentials` (used by
      `signInWithOtp`) still actively supports it — the abuse vector (email
      sending) is at request time, not verification time.
    - `src/lib/server/auth.ts` gained `readOptionalFormString`.
    - Local `.env` uses Cloudflare's published test sitekey
      `1x00000000000000000000AA` (always passes, visible) since local
      Supabase has no `[auth.captcha]` enforcement configured.
    - `pnpm check` passes clean (938 files, 0 errors/warnings).
    - See `docs/deployment-cloudflare.md`'s Runtime Secrets section for the
      full env var writeup.
    - Dashboard work done 2026-07-12: Turnstile widget created, site key
      added to Cloudflare Worker Settings > Variables & Secrets, secret key
      added to Supabase Auth > Bot and Abuse Protection, code committed and
      pushed (`0bef72a feat-update: Set up Cloudflare Turnstile`).
    - Bug found and fixed 2026-07-12: the site key was first added as a
      plain **Text** var, which does not survive a Git-triggered deploy —
      `wrangler deploy`'s declarative sync resets remote `vars` to match
      `wrangler.jsonc` on every deploy (same mechanism already seen wiping
      `workers_dev`/`preview_urls` in Step 9), and `wrangler.jsonc` doesn't
      (and shouldn't) declare this var. Confirmed empirically: the widget
      rendered as an empty conditional (`<!--[-1--><!--]-->` in SSR output)
      immediately after the Turnstile-code deploy went live, meaning the var
      wasn't reaching the Worker at runtime.
      Fix, sourced from Cloudflare's Worker secrets docs rather than
      guessed: set it as a **Secret** instead of a Text var. Cloudflare's
      docs state secrets are exempt from that declarative sync — "secrets
      not included in the file are preserved from the previous version" —
      so a Secret survives every future deploy without ever needing to
      appear in `wrangler.jsonc`. The "Secret" designation here is purely
      about deploy-persistence, not actual confidentiality: the value still
      ends up embedded in the public `/auth` HTML for the widget either way,
      same as before.
    - Re-verified after the fix, 2026-07-12: `curl -s https://glyphin.app/auth`
      now contains `cf-turnstile`, `challenges.cloudflare.com/turnstile/v0/api.js`,
      and a populated `data-sitekey`. Turnstile is live end-to-end — CAPTCHA
      checklist item done.
  - Treat the Resend SMTP credential as a Supabase-side secret: it is entered
    directly into the Supabase dashboard's SMTP settings only. It must never
    go into `.env`, `.dev.vars`, Cloudflare build vars, Cloudflare runtime
    secrets, `wrangler.jsonc`, or any client bundle — the app itself never
    needs this credential, only Supabase's own outbound mail sending does.
- Confirm email OTP templates still send the six-digit code flow expected by
  the current `/auth` page, delivered through Resend. Production's Auth >
  Email Templates must be checked/set to match
  `supabase/templates/magic-link.html` (used locally via
  `[auth.email.template.magic_link]` in `config.toml`) — this is not pushed
  automatically either, so the hosted project may still be on Supabase's
  generic default template until set by hand.
- Local dev does not need Resend at all: `supabase/config.toml`'s
  `[inbucket]` block (port `54324`) already captures every local auth email
  in a local fake-mail inbox at `http://localhost:54324` — that's how OTP
  codes are read during local testing today. Do not wire Resend into local
  dev; it would burn real Resend sends/reputation on local test traffic for
  no benefit.

### 11. Deploy And Smoke Test

- Ran directly against production (`https://glyphin.app`) on 2026-07-12 since
  deploy already happened out of sequence (see Step 9/10). Public,
  unauthenticated checks done via `curl`:
  - `/` -> `200`, `text/html`, served `cf-cache-status: HIT` (prerendered
    static asset).
  - `/learn` -> `200`, `text/html`.
  - `/learn/1` -> `200`, `text/html`.
  - `/learn/1/practice` -> `200`, `text/html`.
  - `/api/learner/projection` -> `200`,
    `{"auth":{"authenticated":false,"email":null},"projection":null}` — the
    correct unauthenticated shape.
  - `/auth` -> `200`, `text/html`.
  - `/does-not-exist` -> `404` as expected.
  - Response headers for `/` and `/auth`: standard Cloudflare headers
    (`server: cloudflare`, `cf-ray`, `nel`/`report-to`, `alt-svc`), no
    `Set-Cookie` on anonymous GETs (expected). No CSP, HSTS
    (`Strict-Transport-Security`), `X-Content-Type-Options`, or
    `X-Frame-Options` headers present — not part of this plan's original
    scope and not blocking, but flagged here as a gap worth a deliberate
    decision later; nothing in `svelte.config.js` or `src/` currently sets
    security headers.
- Turnstile hit `400020` ("Invalid sitekey") on the user's first real attempt
  — traced to a copy-paste mistake on the site key value, fixed by
  re-entering the correct value in the same Secret.
- Real bug found on the user's first real sign-in attempt, 2026-07-12: for a
  brand-new email address, production sent Supabase's stock **"Confirm
  signup"** email (`type=signup`, `{{ .ConfirmationURL }}`), not the custom
  Magic Link/OTP template — a completely different template slot, not a
  mispasted-template issue as first suspected. Root cause: production Auth
  still has "Confirm email" enabled (Supabase's project default), while
  `supabase/config.toml` (`[auth.email] enable_confirmations = false`, line 224) explicitly disables it locally — a dashboard-only setting, like Site
  URL/SMTP/OTP-expiry before it, that never propagates from `config.toml` to
  the hosted project. This is a real functional bug, not cosmetic: confirmed
  via `grep` that this codebase has **no route anywhere** that handles a
  `code`/`token_hash` PKCE confirmation callback (no `/auth/confirm`,
  no `exchangeCodeForSession` call), so clicking "Confirm email address"
  would land on `https://glyphin.app/?code=...` with no session ever
  established — a dead end for every brand-new signer-in until fixed.
  - Fix (two parts):
    1. **Required**: disable "Confirm email" in Supabase Dashboard >
       Authentication > Sign In / Up settings, to mirror
       `enable_confirmations = false`. This is the actual fix — without it,
       new users keep hitting the dead-end confirmation flow regardless of
       template styling.
    2. Done as defense-in-depth, 2026-07-12: added
       `supabase/templates/confirm-signup.html` (matching
       `magic-link.html`'s branding: same teal/gold palette, same card
       layout) and wired it into `config.toml`'s new
       `[auth.email.template.confirmation]` section, in case this flow is
       ever triggered again (e.g. confirmations re-enabled later). Left an
       explicit comment in `config.toml` warning not to re-enable
       `enable_confirmations` without adding the missing callback route
       first.
  - User disabled "Confirm email" and retested with a brand-new address, but
    still got a confirm-style email. Rather than keep guessing, read GoTrue's
    actual source (`internal/api/magic_link.go`, `internal/api/signup.go`
    from `github.com/supabase/auth`) to confirm the intended logic: with
    `Mailer.Autoconfirm = true`, `Signup()` confirms the user silently with
    no email, then `MagicLink()` recurses and sends the real magic-link/OTP
    email. This should have worked. Verified the live server-side truth
    directly via the Supabase Management API
    (`GET /v1/projects/mtpkjcvbhkxbmqpreblp/config/auth`, using a user
    Personal Access Token) rather than trust the dashboard UI further:
    `mailer_autoconfirm: true` was confirmed correctly set — the toggle
    fix _did_ work as expected.
  - **Actual remaining root cause**, found via that same API response,
    2026-07-12: `mailer_templates_magic_link_content` (the live "Magic
    Link" template — the one actually used for OTP delivery) contained an
    exact copy of the confirm-signup content (`{{ .ConfirmationURL }}`,
    "Confirm this email address..."), not `magic-link.html`'s content
    (`{{ .Token }}`, "Your sign-in code"). The user had pasted the
    confirm-signup HTML into both the Confirm-signup **and** Magic Link
    template slots in the dashboard. Also caught: `mailer_subjects_magic_link`
    was `"Your Glyphin sign-in link"` instead of the intended
    `"Your Glyphin sign-in code"`. Fix: re-paste the real
    `supabase/templates/magic-link.html` content into the dashboard's Magic
    Link template slot and correct the subject line.
  - **Security note**: the user pasted the full live Auth config JSON from
    the Management API into chat to share the diagnostic output, which
    included `smtp_pass` (Resend API key) and `security_captcha_secret`
    (Turnstile secret) in plaintext. Recommended rotating both as routine
    hygiene since they're meant to be write-only/private and are now in a
    chat transcript — not itself an active compromise, but shouldn't be left
    as-is.
  - **Still needed**: re-verify a brand-new-email sign-in now sends the
    correct six-digit-code email after the template slot is fixed.
- Not yet done: lesson completion sync + refresh persistence, sign-out, and
  confirming secure cookie attributes (`HttpOnly`, `Secure`, `SameSite=Lax`)
  on an authenticated session — pending a clean end-to-end sign-in once the
  Magic Link template content is fixed in production.
- Done on 2026-07-12: grepped the live homepage HTML and its core referenced
  JS bundles (`entry/app.*.js`, `entry/start.*.js`, largest vendor chunk, and
  the `/` route's node chunk) for `sb_...`/`eyJ...`-shaped key strings and the
  Supabase project ref `mtpkjcvbhkxbmqpreblp` — no matches anywhere. Confirms
  no Supabase key (anon/publishable or otherwise) or project ref is
  serialized into the client bundle, consistent with the server-side
  cookie-auth model (`@supabase/ssr`, no client-side Supabase client).

### 12. Rollout And Rollback

- Share the custom domain only after smoke tests pass.
- Record the last known good Worker version (deployment ID) after each successful
  production deploy as the rollback reference.
- Roll back Worker issues using Cloudflare Worker version rollback to the last
  known good version, or by re-running a production deploy from a known good
  commit.
- Roll back code issues by reverting the offending commit on the production
  branch, which triggers a fresh Workers Builds deploy.
- Do not delete/recreate the Supabase project during alpha unless rotating all
  Cloudflare env vars is acceptable.

## Public Interfaces And Config Changes

- No learner-facing route or API shape should change in phase 1.
- Existing server-only env var names remain unchanged.
- Deployment target changes from Node adapter output to Cloudflare Workers Static
  Assets output.
- Public lesson content should be prerendered from Supabase at build time.
- Runtime Worker routes remain responsible for auth, learner projection, learner
  sync, and other personalized behavior.

## Test Plan

- Supabase-first checks: create/link the fresh production project, run
  `pnpm db:lint`, run the confirmed-safe linked reset, verify remote `delivery`
  and `learner` schemas/RPCs exist, and confirm the delivery/auth env values are
  captured before configuring Cloudflare.
- Local checks: `pnpm install`, `pnpm check`, `pnpm check:all`, `pnpm build`.
- Cloudflare local simulation: run the built Cloudflare output through Wrangler
  with `pnpm exec wrangler dev .svelte-kit/cloudflare/_worker.js` and verify both
  static pages and Worker-backed routes.
- Build-output checks: confirm `/learn` and lesson routes are present as
  prerendered/static output where SvelteKit emits them.
- Deployed smoke tests: public lessons, lesson page, practice page, auth OTP,
  progress sync, sign-out, refresh persistence.
- Security checks: no service-role key in Cloudflare, no env values in client
  bundle, auth cookies secure, Supabase Auth redirect URLs limited to alpha
  domains.

## Assumptions

- First deployment target is Cloudflare Workers Static Assets, not Cloudflare
  Pages.
- Deployment is Git-based via Cloudflare Workers Builds from the start; the repo
  already lives on GitHub. There is no manual-Wrangler-deploy bootstrap. Local
  Wrangler simulation plus a non-production preview deploy provide verification
  before the production branch ships.
- First shared URL is a custom domain, with `workers.dev` used for internal smoke
  testing.
- Supabase production project is fresh and can be destructively rebuilt before
  real alpha data exists.
- Cloudflare Worker setup waits until Supabase is linked, reset/migrated, and
  verified because the app build and runtime auth/progress flows depend on that
  Postgres/Auth project.
- Supabase region defaults to Europe West/Ireland if available, because the
  known tester base is expected to be primarily U.S./European.
- Phase 2 will expose the reusable learner sync/projection contract through the
  Supabase RPC / security-definer layer so the parallel mobile app can call it
  with bearer-token auth under RLS, using `@supabase/supabase-js` from the native
  client or a deliberately chosen mobile backend. See "Architectural Principle:
  Keep The Backend Contract Mobile-Ready" above.
