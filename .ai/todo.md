# Backlog

Last audited: 2026-07-31 (re-derived from source — route greps, `static/`,
`src/lib/server/`, and a live `pnpm audit` — not from tracker self-reporting).

**The working queue is
[`.ai/2026-07-17-product-roadmap.md`](./2026-07-17-product-roadmap.md).** That
file supersedes the forward-looking half of
[`.ai/2026-07-14-backlog-clearing-plan.md`](./2026-07-14-backlog-clearing-plan.md),
whose pre-launch backlog is now cleared. This page is only a map of what is open
and where it is tracked — do not duplicate task detail here.

## The state of things

The app is **live at `glyphin.app`** on Cloudflare Workers with all 46 Thai
lessons published. The three launch gaps that the 2026-07-14 audit flagged as
live are **all closed** — this page asserted otherwise for two weeks:

- **Security headers ship.** `src/lib/server/security-headers.ts` is applied in
  `src/hooks.server.ts:117` for Worker-rendered responses, `_headers` covers
  prerendered pages and static assets, and `security-headers.test.ts` enforces
  parity between the two.
- **`static/robots.txt` is hardened** — disallows `/api/`, `/auth`, `/test/`,
  `/alphabet`, `/words`, `/practice`, `/learn/*/practice`, and carries the
  `Sitemap:` directive. `src/routes/sitemap.xml/+server.ts` generates the sitemap
  from the lesson publication; `static/llms.txt` is published.
- **`PageMetadata.svelte` is adopted in all 20 route files**, emitting canonical,
  `og:*`, and `twitter:*`.

## Checkbox state is unreliable — re-derive before picking anything up

Five plans read **0/N complete but are fully shipped**. Each now carries a
`Status: COMPLETE` header explaining what was verified; the unticked boxes below
those headers are abandoned bookkeeping, not work.

| Plan                                       | Checkboxes | Reality                                          |
| ------------------------------------------ | ---------- | ------------------------------------------------ |
| `2026-07-11-security-headers.md`           | 0/22       | Shipped + verified live 2026-07-14.              |
| `2026-07-11-seo-foundation.md`             | 0/19       | `PageMetadata` in all 20 routes.                 |
| `2026-07-11-search-indexing-readiness.md`  | 0/19       | robots + sitemap + canonical all live.           |
| `2026-07-11-practice-answer-grid.md`       | 0/4        | `columns={2}` at `StepPracticeCheckpoint:132`.   |
| `2026-07-15-thaipack-client-retirement.md` | 0/10       | Self-declares complete; server-only import left. |

Treat any checkbox in `.ai/` as a hint, never as a record.

## Open plans

| Plan                                                       | What is left                                                     |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `2026-07-17-product-roadmap.md`                            | **Start here.** The ordered queue: testing, monetization, audio. |
| `2026-07-17-monetization-subscriptions.md`                 | Design + approval gate. No implementation yet.                   |
| `2026-06-28-thai-curriculum-completion.md`                 | Thai-speaker/corpus review of L22-46. Needs a human reviewer.    |
| `2026-07-11-db-security-hardening.md`                      | 12/16. SSL enforcement + 2 flagged checks outstanding.           |
| `2026-07-14-learner-dashboard-design-pass-plan.md`         | 2/5. Unverified against source.                                  |
| `2026-07-14-production-stage-publication-migration-fix.md` | 7/8. One residual step.                                          |
| `2026-07-11-pre-rollout-tasks.md`                          | 8/21, overtaken by the launch. Needs rewriting or archiving.     |
| `2026-04-30-caching-offline-performance.md`                | Service worker / PWA / IndexedDB. Deferred, no action.           |

## Closed since the last audit

- `2026-07-11-dependency-refresh-framework-ui.md` — **done 2026-07-31.** Five
  transitive dev/build advisories pinned via `pnpm-workspace.yaml` `overrides:`
  (pnpm 11 no longer reads `package.json` > `pnpm.overrides`). Audit went 7
  findings → 1 accepted low (`cookie`, deliberately not overridden).
- `2026-07-26-testing-expansion.md` — **done 2026-07-26.** Vitest 4, two
  projects, 25 files / 107 tests, Dependabot, smoke script, `docs/testing.md`.
- `2026-07-15-thaipack-client-retirement.md` — **done 2026-07-15.** `thaiPack` is
  gone from the client bundle; `src/lib/server/published-lessons.ts` is the only
  remaining importer and that is the intended server-side fallback.
- `2026-04-30-db-single-source-of-truth.md` — **superseded** by the retirement
  plan above. The old "4 runtime files import `thaiPack`" claim is obsolete.
- `2026-06-13-practice-vocabulary-expansion.md` — **dropped 2026-07-14** by
  product decision. Its practice-tier contract already shipped and stands; the
  scored flip-card rebuild is not happening.

## Open decisions

- **Homepage + `/learn` copy.** `/` reads "Skip the drills. Start reading." vs the
  `docs/seo.md` contract "Learn to read Thai through real words."; `/learn` reads
  "Your Thai course" vs "Thai reading lessons." Copy calls for Andri, not gaps.
- **Drizzle vs. hand-written SQL.** Still no urgency.

## Deferred, no action

- Multi-course architecture (`.ai/tasks/curriculum-and-architecture/`) — until a
  second language ships.
- Curriculum authoring template revisions from the 61-system bootstrap pass.
- Playwright browser E2E, axe integration, local-Supabase integration CI —
  explicitly out of scope in the testing-expansion plan.

## Archive candidates

These are done and could move to `.ai/archive/` to shrink the root: the five
stale-checkbox plans above plus `2026-07-11-practice-answer-grid-design.md`,
`2026-07-14-recap-skip-implementation-plan.md` (6/6) and its design doc,
`2026-07-14-compact-transfer-practice-card-plan.md` (8/8) and its design doc,
`2026-07-26-testing-expansion.md`, and
`2026-07-11-dependency-refresh-framework-ui.md`. Left in place pending a call
from Andri. Note: the compact-transfer-practice-card plan reads 8/8 but no
distinct component appears in `src/` — verify where it landed before archiving.
