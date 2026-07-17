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

### h1 gaps — in progress (this session)

The stale SEO contract in `docs/seo.md` (audited 2026-07-11, before the dashboard
redesign) said several routes had no `h1`. Re-audited against source 2026-07-17:

- **Done this session:** visible `h1` added to `/alphabet`
  ("Your Thai alphabet progress"), `/words` ("Your Thai words"), `/practice`
  ("Thai reading practice"). `pnpm check` clean.
- **Already fixed by the redesign, not gaps:** `/learn` emits
  `<h1>Your Thai course</h1>`; `/about` already matched.
- **Still open — needs a heading-hierarchy pass, not a blind add:**
  - `/learn/[id]` and `/learn/[id]/practice`: the shared `Step*` components emit
    `h1`s that _appear, disappear, and change per step_ — `StepIntro` →
    `<h1>{lesson.title}</h1>`, `StepComplete` → `<h1>Lesson complete.</h1>`,
    `StepPracticeComplete` → `<h1>`, while `LessonGateState` (locked states) and
    the deck/recap/checkpoint steps emit no `h1`. A page-level `h1` would collide
    on the intro step. Fix = one stable page `h1` + demote the per-step `h1`s to
    `h2`, and give `LessonGateState` an `h1`. Small, careful, cross-component.
  - **Homepage `/` — the SEO-critical one.** The prerendered anonymous HTML
    renders only a loading skeleton (`{:else}` branch, pre-hydration), so crawlers
    and no-JS visitors get **no `h1` and no marketing content**; the hero only
    appears after JS. The dashboard redesign deliberately used the skeleton to
    avoid a hero→dashboard flash for returning learners. Fixing it properly
    (default to the server-rendered hero, swap to dashboard on hydration)
    reintroduces that flash for anonymous-with-local-progress learners. **This is
    a UX/SEO tradeoff for Andri to decide, not a silent change.**
  - Reconcile `docs/seo.md` with reality afterward (its `h1` column and "current
    gaps" table are stale post-redesign).

### Stronger testing setup — elevated

Today: ~16 `node --test` files and **no CI at all**. A regression in curriculum
mapping, learner sync, auth redirects, or the (coming) entitlement gate would ship
silently. Plan already exists: `.ai/2026-07-11-automated-test-suites.md` (staged
Vitest → component → local-Supabase integration → Playwright → CI gates).

Recommended first slice: stand up the Vitest runner + a GitHub Actions
`quality.yml` (install, format, lint, typecheck, unit) on the tests that already
exist, then add learner-sync/auth boundary tests. This becomes the safety net for
the monetization work, so it should lead.

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
