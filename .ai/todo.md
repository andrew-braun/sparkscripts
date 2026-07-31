# Backlog

Last audited: 2026-07-14 (full `.ai` audit, verified against source and a live
`pnpm audit` rather than tracker self-reporting).

**The working backlog now lives in
[`.ai/2026-07-14-backlog-clearing-plan.md`](./2026-07-14-backlog-clearing-plan.md).**
That file is the single ordered queue. This page is only a map of what is open
and where it is tracked — do not duplicate task detail here.

## The state of things

The app is **live at `glyphin.app`** on Cloudflare Workers with all 46 Thai
lessons published. The launch, however, ran ahead of the trackers: three
pre-launch gates never landed and the site shipped without them.

- **No security headers** (no CSP, nothing in `wrangler.jsonc` or `hooks.server.ts`).
- **`static/robots.txt` allows crawling everything**, including `/test/**` and
  `/auth`, which `docs/seo.md` marks `noindex`.
- **`PageMetadata.svelte` is wired into zero routes** — the helper is built and
  committed, just never adopted. No canonical, no `og:*`, no sitemap on the live site.

Those three are Task 1 and are the highest priority in the backlog plan.

## Open plans

| Plan                                            | What is left                                                    |
| ----------------------------------------------- | --------------------------------------------------------------- |
| `2026-07-14-backlog-clearing-plan.md`           | **Start here.** The ordered queue for everything below.         |
| `2026-06-28-thai-curriculum-completion.md`      | Thai-speaker/corpus review of L22-46. Needs a human reviewer.   |
| `2026-07-11-db-security-hardening.md`           | SSL enforcement, publishable/secret API keys, 2 flagged checks. |
| `2026-07-11-dependency-refresh-framework-ui.md` | Done 2026-07-31. Audit is 1 low (accepted `cookie`).            |
| `2026-07-11-pre-rollout-tasks.md`               | Overtaken by the launch; needs rewriting as a post-launch list. |
| `2026-06-13-practice-vocabulary-expansion.md`   | Blocked on a product decision — see below.                      |
| `2026-04-30-db-single-source-of-truth.md`       | 4 runtime files still import `thaiPack`. Not started.           |
| `2026-04-30-caching-offline-performance.md`     | Service worker / PWA / IndexedDB. Deferred, no action.          |

Six implementation plans and two design specs were moved out of
`docs/superpowers/` into `.ai/` on 2026-07-14, and `docs/superpowers/` is gone.
`AGENTS.md` now carries a hard rule against planning documents in `docs/`. Their
checkbox state is still unreliable in both directions — re-derive it from source
as you pick each one up.

| Moved plan                                | What it covers                                          |
| ----------------------------------------- | ------------------------------------------------------- |
| `2026-07-11-security-headers.md`          | CSP + Worker/static headers. **Live gap.**              |
| `2026-07-11-seo-foundation.md`            | Route metadata adoption. Helper built, unwired.         |
| `2026-07-11-search-indexing-readiness.md` | robots, sitemap, canonical. **Live gap.**               |
| `2026-07-11-practice-answer-grid.md`      | Two-column answer grid. **Decided — build it.**         |
| `2026-07-11-dependency-refresh-full.md`   | Full dependency plan (renamed to avoid the name clash). |
| `2026-07-11-automated-test-suites.md`     | Post-launch test layers.                                |

## Open decisions

- ~~**Practice flow.**~~ **Decided 2026-07-14:** keep `StepPracticeCheckpoint.svelte`
  and give it the two-column answer grid (`2026-07-11-practice-answer-grid.md`).
  The scored flip-card rebuild in `2026-06-13-practice-vocabulary-expansion.md` is
  dropped; its practice-tier contract already shipped and stands.
- **Drizzle vs. hand-written SQL.** Still no urgency.

## Deferred, no action

- Multi-course architecture (`.ai/tasks/curriculum-and-architecture/`) — until a
  second language ships.
- Curriculum authoring template revisions from the 61-system bootstrap pass.
- Automated test suites — post-launch hardening.
