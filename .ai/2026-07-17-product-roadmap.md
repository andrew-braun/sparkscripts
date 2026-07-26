# Product Roadmap — Post-Alpha

- Start date: 2026-07-17
- Owner: Andri
- Status: active
- Supersedes the forward-looking half of
  `.ai/2026-07-14-backlog-clearing-plan.md` (which was about clearing the
  pre-launch backlog; most of it is now done). Use this as the near/mid/long-term
  queue.

## Context

The alpha is live at `glyphin.app` and stable: 46 Thai lessons, learner
dashboard + stage journey, security headers + CSP, per-route metadata, two-column
scored practice, and the `thaiPack` client retirement all shipped. The launch
gaps from the July backlog are essentially closed. This roadmap is what comes
next, reprioritized with Andri on 2026-07-17.

## Priority ordering (agreed 2026-07-17)

1. **h1 gaps** — do now (in progress, this session).
2. **Stronger testing setup** — elevated; the biggest engineering-durability gap.
3. **Monetization / subscriptions** — new; start sooner rather than later.
   Full plan: `.ai/2026-07-17-monetization-subscriptions.md`.
4. **Audio pronunciation** — backlog but _important_; research how to **source**
   recordings rather than record them ourselves.
5. **Thai L22–46 native review** — backlog, reasonable priority; still needs a
   human reviewer.
6. **Mobile app** — long-term horizon; after several languages are solid. Expected
   to drive the majority of users and revenue.

## Near term

### h1 gaps — done (2026-07-26)

The stale SEO contract in `docs/seo.md` (audited 2026-07-11, before the dashboard
redesign) said several routes had no `h1`. Re-audited against source and closed:

- **Utility pages:** visible `h1` added to `/alphabet`
  ("Your Thai alphabet progress"), `/words` ("Your Thai words"), `/practice`
  ("Thai reading practice").
- **Homepage `/` (SEO-critical):** the prerendered anonymous HTML rendered only a
  loading skeleton, so crawlers/no-JS visitors got no `h1` and no marketing copy.
  Now server-renders `HomeHero` by default and swaps to the dashboard on
  hydration. Andri accepted the resulting hero→dashboard flash for
  anonymous-with-local-progress learners as a fine tradeoff for SEO (2026-07-26).
- **Lesson-flow pages `/learn/[id]` + `/learn/[id]/practice`:** the shared
  `Step*` components emitted `h1`s that appeared/disappeared/changed per step.
  Fixed with one stable `visually-hidden` page-level `h1` (`{lesson.title}` /
  `Practice {lesson.title}`) present in every step and locked state, and the
  per-step `h1`s (`StepIntro`, `StepPracticeComplete`) demoted to `h2`.
- **`docs/seo.md` reconciled** — the "Current implementation gaps" table now
  reflects the 2026-07-26 h1 state.
- **Still open (copy, not presence):** `/` reads "Skip the drills. Start
  reading." vs contract "Learn to read Thai through real words."; `/learn` reads
  "Your Thai course" vs contract "Thai reading lessons." Both are copy decisions
  for Andri, not blocking gaps.

### Stronger testing setup — first slice done (2026-07-26)

Was: ~16 `node --test` files and **no CI at all**. First slice landed:

- **Runner:** migrated all 16 suites from `node --test` to **Vitest 4** (unified
  runner; `pnpm test` → `vitest run`, `pnpm test:watch`). Config lives in the
  `test` block of `vite.config.ts`; the `sveltekit()` plugin resolves `$lib` and
  the custom aliases so tests import like app code. Node environment (no DOM yet).
- **Boundary coverage added** (the monetization-adjacent trust boundaries): the
  learner-sync input parser (extracted from the route into
  `src/lib/server/learner-sync-input.ts`), the auth redirect allow-list +
  email/OTP normalization, published-payload delivery mapping, and publication
  cache-key integrity. 54 → **85 tests**.
- **CI:** `.github/workflows/quality.yml` — fast PR gate (frozen install with
  pnpm cache, then format, ESLint, Stylelint, markdownlint, svelte-check, Vitest),
  each check independent so one push reports every failure. This is the repo's
  first CI.
- **Repo hygiene to make the gate green:** `.prettierignore` now excludes
  generated/tool dirs; markdownlint globs exclude `.pnpm-store`/`.generated`/tool
  dirs; `MD010` no longer fights Prettier over code-block indentation. Pre-existing
  `.ai` doc drift was formatted. `pnpm quality:check` is now green end-to-end.
- **Reference:** `docs/testing.md`.

Second slice (2026-07-26, `.ai/2026-07-26-testing-expansion.md`): added the
**progress-store behavior tests** (the localStorage learner state the entitlement
gate will read) and a **component/DOM layer** (Testing Library + jsdom, via a new
isolated Vitest project) covering `Button`/`ThemeToggle`/`Disclosure`/
`RadioButtons`; plus a **deployment smoke script** (`pnpm test:smoke -- <url>`)
and **Dependabot** (weekly pnpm + actions PRs). 85 → **107 tests**.

Still deferred (staged in `.ai/2026-07-11-automated-test-suites.md`):
local-Supabase integration (RLS/projection/sync), Playwright browser E2E, axe
integration, portaled-overlay component tests (`HelpPopover`), and the heavier
opt-in CI jobs (Task 7 Step 2). These can follow, but the free/paid **entitlement
gate** should get integration coverage as it is built.

## Mid term

### Monetization / subscriptions — new, start sooner

Freemium: first 5–10 lessons free per language, ~$2.99/language unlock, plus
one-time beta redemption codes for all-language access. Full architecture,
Stripe-vs-IAP analysis, entitlement model, and phasing in
`.ai/2026-07-17-monetization-subscriptions.md`. High-risk (payments/auth) — needs
the Phase 0 design + sign-off gate before code. Phases 1–2 (server-side free/paid
gate + redemption codes) deliver enforceable freemium and beta access _without_
taking payments and are the fastest safe start. The testing setup above should
land first so the entitlement gate is covered.

### Audio pronunciation — important, sourcing-first

Strategy exists (`.ai/tasks/curriculum-and-architecture/thai-audio-pronunciation-strategy.md`):
learner-triggered playback on letters, syllables, and anchor words; a small
recorded corpus with stable content IDs beats device TTS for a tonal language.
**Andri's steer (2026-07-17): find a way to source recordings without recording
them ourselves.** Research angles to pursue before implementation planning:

- Freelance native-speaker VO (e.g. per-clip marketplaces) for the taught
  inventory — small fixed corpus, near-zero recurring cost.
- Licensed/open Thai pronunciation datasets or CC-licensed audio with attribution
  terms that permit product use.
- High-quality cloud TTS (verify Thai tonal quality + license) as a _backfill_ for
  breadth, kept as fallback per the strategy, not the core.
- Community/partner sourcing once a second language exists.

Deliverable of the research: a sourcing recommendation + rough cost, then an audio
key schema mapping onto lesson data and a minimal playback UI plan.

### Thai L22–46 native review — reasonable priority

The one true content gate still open: native-speaker or corpus-backed review of
lessons 22–46 (tone marks, romanization, glosses, register, segmentation, and the
8 accepted weak-band anchors). Learners are using this material now. Needs a
reviewer sourced — still no owner. Tracked in
`.ai/2026-06-28-thai-curriculum-completion.md`.

## Long term

### Mobile app

Where Andri expects most users and revenue. Gate: several languages live and the
core loop's kinks ironed out first. Hard dependency: the **multi-course
architecture** refactor (course-aware progress, language-agnostic runtime fields,
script-aware styling) documented in
`.ai/tasks/curriculum-and-architecture/multi-course-architecture.md` and the
61-script `.ai/curriculum/app-expansion-matrix.md`. Monetization must be
IAP-ready by then (see the mobile/IAP section of the monetization plan — store
fees and provider-agnostic entitlements).

Rough long-term sequence: multi-course refactor → publish a 2nd language (Korean
is already authored) → harden the loop → mobile shell + IAP grant source.

## Still-open launch tail (carried from the July backlog)

Not new, but not done — keep visible:

- **`/sitemap.xml`** + the `robots.txt` `Sitemap:` line (backlog Task 1.3
  remainder). Reconcile `docs/search-indexing.md` with Cloudflare's managed
  robots.txt.
- **Hosted DB hardening** (backlog Task 3): enforce SSL, migrate to
  publishable/secret API keys + disable legacy JWT keys, verify the publication
  write path is privileged, decide on `graphql_public`.
- **Authenticated production smoke test** (OTP → complete lesson → sync →
  sign-out through live Turnstile). Needs Andri + a real inbox; never walked on
  prod.
- **Human security review** against `docs/security-review-checklist.md`.

## Deferred (no action)

- PWA / offline writes + IndexedDB (`.ai/2026-04-30-caching-offline-performance.md`)
  — only once offline writes are a requirement.
- Curriculum authoring template revisions from the 61-system bootstrap.
