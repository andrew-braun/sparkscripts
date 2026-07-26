# Route SEO contracts

This document is the source of truth for document-level search metadata. It
records the intended contract and the gaps in the implementation as audited on
2026-07-11.

## Global policy

- Index only public pages whose useful primary content is stable without local
  progress, authentication, or a development environment.
- Emit `noindex, follow` for learner utilities and account pages. Development
  previews use `noindex, nofollow` because they are not navigable product
  surfaces.
- Omit meta descriptions from `noindex` learner-private, account, and preview
  routes unless this inventory documents a concrete sharing use case. No
  current `noindex` route has such a use case.
- Every document emits one unique `h1`. A heading that appears only after a
  client-side state transition does not satisfy this requirement.
- Every document emits an absolute, query-free canonical URL. One centralized,
  server-only SEO configuration/helper boundary owns the production origin,
  validates that the final production value is an `https://` origin, and joins
  it to the canonical path below. Route components do not read environment
  variables or construct absolute canonical URLs independently. Tracking and
  state query parameters never change the canonical.
- `og:type` is `website` for every route in the current product. Indexable pages
  use `/og/glyphin-reading-thai.png` as a 1200 by 630 pixel default image until a
  route-specific image is listed in the table. `noindex` pages omit social-image
  metadata.
- Titles use an em dash before the `Glyphin` brand. Dynamic lesson titles use
  the published lesson title. Published lesson titles must be unique across the
  active publication, and publication validation must reject duplicate titles
  before routes or metadata are generated.

## Route inventory

| Route                  | Search intent                                          | Index?                     | Title                                            | Description                                                                                                                             | Canonical                     | H1                                                       | OG type/image                             |
| ---------------------- | ------------------------------------------------------ | -------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| `/`                    | Learn to read Thai script through real words           | Yes                        | Learn to Read Thai Through Real Words — Glyphin  | Learn to read Thai script through high-frequency real words, guided letter lessons, and progressive reading practice.                   | `/`                           | Learn to read Thai through real words.                   | `website`; `/og/glyphin-reading-thai.png` |
| `/about`               | Understand Glyphin's reading-first method and evidence | Yes                        | How Glyphin Teaches Thai Reading — Glyphin       | See how Glyphin teaches Thai script through real words, progressive decoding, retrieval practice, and evidence-informed lesson design.  | `/about`                      | Read a new script. Fast.                                 | `website`; `/og/glyphin-reading-thai.png` |
| `/learn`               | Browse structured Thai reading lessons                 | Yes                        | Thai Reading Lessons — Glyphin                   | Browse step-by-step Thai reading lessons that introduce useful words, letters, and rules in a progressive learning path.                | `/learn`                      | Thai reading lessons                                     | `website`; `/og/glyphin-reading-thai.png` |
| `/learn/[id]`          | Learn the letters and rules for a specific Thai word   | Yes                        | `{lesson.title} — Thai Reading Lesson — Glyphin` | `Learn to read {lesson.anchorWord.thai}, meaning {lesson.anchorWord.meaning}, with guided Thai letter, sound, and reading instruction.` | `/learn/{lesson.id}`          | `{lesson.title}`                                         | `website`; `/og/glyphin-reading-thai.png` |
| `/learn/[id]/practice` | Complete scored practice for a specific lesson         | No; learner workflow       | `{lesson.title} — Practice — Glyphin`            | Omit                                                                                                                                    | `/learn/{lesson.id}/practice` | `Practice {lesson.title}`                                | Omit image; `website` may be omitted      |
| `/alphabet`            | Review the Thai characters unlocked by this learner    | No; local-progress utility | Thai Alphabet Progress — Glyphin                 | Omit                                                                                                                                    | `/alphabet`                   | Your Thai alphabet progress                              | Omit image; `website` may be omitted      |
| `/words`               | Review the Thai words unlocked by this learner         | No; local-progress utility | Your Thai Words — Glyphin                        | Omit                                                                                                                                    | `/words`                      | Your Thai words                                          | Omit image; `website` may be omitted      |
| `/practice`            | Run a randomized review from completed lessons         | No; local-progress utility | Thai Reading Practice — Glyphin                  | Omit                                                                                                                                    | `/practice`                   | Thai reading practice                                    | Omit image; `website` may be omitted      |
| `/auth`                | Sign in or manage the current learner account          | No; account utility        | Sign In or Manage Your Account — Glyphin         | Omit                                                                                                                                    | `/auth`                       | `Sign in` when signed out; `Account` when signed in      | Omit image; `website` may be omitted      |
| `/test/**`             | Development-only component previews                    | No; development preview    | `{preview name} — Preview — Glyphin`             | Omit                                                                                                                                    | `/test/{preview-path}`        | A unique preview name, such as `Lesson complete preview` | Omit image and `og:type`                  |

The aggregate `/words` and `/practice` pages do not have stable public search
value today. Both are empty before local progress is hydrated and their useful
content differs per learner, so they remain `noindex`. `/alphabet` has the same
constraint: it exposes only unlocked characters and is not yet a complete public
Thai alphabet reference. These routes can become indexable only after their
server-rendered default experience provides a useful, stable reference without
learner state.

## Endpoint classification

The following are non-document surfaces and receive neither document metadata
nor sitemap entries:

- `/api/learner/projection`
- `/api/learner/sync`
- `/auth/sign-out`

Any future `+server.ts` endpoint is presumed non-document unless it deliberately
returns an HTML page.

## Current implementation gaps

The audit found no duplicate static page titles. Dynamic lesson titles include
the published lesson title, but their current suffixes need the contract changes
listed above.

**h1 reconciliation (2026-07-26):** Every route below now emits exactly one `h1`
in server-rendered HTML, satisfying the "no client-transition-only heading"
policy. The homepage no longer prerenders an empty skeleton — it server-renders
`HomeHero` by default and swaps to the learner dashboard on hydration (an
accepted hero→dashboard flash for anonymous learners with local progress). The
two lesson-flow routes use a single stable, `visually-hidden` page-level `h1`
that is present in every step and locked state, with the former per-step `h1`s
(`StepIntro`, `StepPracticeComplete`) demoted to `h2`. Remaining h1 work is copy
alignment, not presence: `/` still reads "Skip the drills. Start reading."
(contract: "Learn to read Thai through real words.") and `/learn` reads "Your
Thai course" (contract: "Thai reading lessons"). Those copy decisions are open.

| Route                   | Current title/description                                                   | Current heading                                                                                 | Other missing contract fields                   |
| ----------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `/`                     | Both missing                                                                | Server-rendered `h1` “Skip the drills. Start reading.” (2026-07-26); copy differs from contract | Canonical, robots policy, Open Graph type/image |
| `/about`                | Present; title and description need contract copy                           | One `h1` is present and already matches the contract                                            | Canonical, robots policy, Open Graph type/image |
| `/learn`                | Present; title and description need contract copy                           | `h1` “Your Thai course” present; copy differs from contract                                     | Canonical, robots policy, Open Graph type/image |
| `/learn/[id]`           | Present; title and description need contract copy                           | Stable `visually-hidden` page `h1` `{lesson.title}` in all states (2026-07-26); steps use `h2`  | Canonical, robots policy, Open Graph type/image |
| `/learn/[id]/practice`  | Present; existing description must be removed                               | Stable `visually-hidden` page `h1` `Practice {lesson.title}` in all states (2026-07-26)         | Canonical and `noindex, follow`                 |
| `/alphabet`             | Present; title needs contract copy and existing description must be removed | `h1` “Your Thai alphabet progress” present (2026-07-26)                                         | Canonical and `noindex, follow`                 |
| `/words`                | Present; title needs contract copy and existing description must be removed | `h1` “Your Thai words” present (2026-07-26)                                                     | Canonical and `noindex, follow`                 |
| `/practice`             | Present; title needs contract copy and existing description must be removed | `h1` “Thai reading practice” present (2026-07-26)                                               | Canonical and `noindex, follow`                 |
| `/auth`                 | Title needs contract copy; existing description must be removed             | Exactly one conditional `h1` is rendered in each state; copy already matches the contract       | Canonical and `noindex, follow`                 |
| `/test/lesson-complete` | Title and `noindex, nofollow` are present; description is correctly omitted | The child component renders “Lesson complete.”, which needs preview-specific contract copy      | Canonical; no social metadata should be added   |

No route currently emits a canonical link, `og:type`, or `og:image`. The shared
image required by this contract does not yet exist at
`static/og/glyphin-reading-thai.png`; it must be created before social metadata
references it. The root layout now defaults to server-first rendering
(`prerender = true`, SSR on), so `/`, `/about`, and the other public routes emit
real server HTML and are prerendered to static assets; dynamic routes (`/auth`,
`/api/**`) opt out explicitly. See
`.ai/2026-07-11-server-first-rendering-migration.md`. Indexable `/`, `/about`,
and their future peers still need their server-rendered metadata (canonical,
robots, Open Graph, structured data) authored before production indexing is
enabled — the server is now capable of rendering it; the content is tracked
separately in the SEO foundation plan.
