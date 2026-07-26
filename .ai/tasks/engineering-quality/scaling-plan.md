# Glyphin — Scaling Plan

Related docs: `README.md` for the bundle index and `dev-tooling-setup.md` for the concrete tooling implementation slice that already shipped.

A senior-review punch list of early flaws and scalability gaps, with a concrete
order of operations for fixing them. Work top-down: each section is ordered by
risk/impact, and the numbered PR sequence at the bottom minimizes rebase pain.

Tick items off as they ship.

---

## Verdict summary

| Area                                      | State                                                                      | Risk if unaddressed                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Documented conventions (AGENTS.md)        | Excellent                                                                  | Low                                                                       |
| Enforcement tooling (lint/format/test/CI) | Missing                                                                    | High — drift is already happening                                         |
| Design system tokens                      | Duplicated across files, no CSS variables                                  | High — can't theme, can't dark-mode, hardcoded colors already sneaking in |
| TypeScript strictness                     | Strict on, but env access bypasses `$env/*`                                | Medium                                                                    |
| Data model scalability                    | Single inline `thaiPack` array, no schema validation                       | Medium — becomes painful past ~10 lessons                                 |
| SPA vs SSR posture                        | `ssr:false` + `prerender:true` globally; docs talk about server boundaries | Medium                                                                    |
| Accessibility primitives                  | No focus-visible, no reduced-motion, locked `<a href="#">` anti-pattern    | Medium                                                                    |
| Svelte 5 store layer                      | Uses legacy `svelte/store`, has a subscription leak in `initProgress`      | Low–Medium                                                                |
| SEO / metadata                            | Titles only; no descriptions, OG tags, sitemap; fonts are render-blocking  | Medium                                                                    |
| Tests                                     | None                                                                       | High — core pedagogy has no regression net                                |
| Documentation for humans                  | `README.md` is default boilerplate                                         | Low but embarrassing                                                      |

---

## 1. Critical — do before adding new features

### 1.1 Add the lint/format/test toolchain

Evidence of drift already in the tree:

- Quote style varies across `src/lib/stores/progress.ts` (double), `src/lib/data/thai.ts` (single), `src/lib/utils/thai.ts` (single), `src/routes/+layout.ts` (single).
- Semicolons inconsistent — `progress.ts` drops them, `supabase.ts` keeps them.
- HTML entities for emojis (`&#10003;`, `&#128274;`) mixed with literal unicode.
- Hardcoded hex colors inside SCSS: `#008c6e` at `_mixins.scss:61`, `#e55655` at `_mixins.scss:66`, `#fc9f1e` at `global.scss:289`, `#009a7a` at `global.scss:232` — the "use design tokens" rule is already violated.

Actions, one PR each:

- [ ] **Prettier** with `prettier-plugin-svelte`. Pin: tabs, double quotes (TS), single quotes (HTML attrs per Svelte convention), semicolons = true, print width 100. Ship `pnpm format` and `pnpm format:check`.
- [ ] **ESLint** with `typescript-eslint`, `eslint-plugin-svelte`, `eslint-config-prettier`. Recommended preset + ban `any`, require `import type` for type-only imports, ban `@ts-ignore` without a reason, require explicit return types on exported functions. Ship `pnpm lint`.
- [ ] **Stylelint** with `stylelint-config-standard-scss` + `stylelint-config-prettier-scss`. Custom rule: ban hex/rgb literals outside `_variables.scss`. Ship `pnpm lint:style`.
- [ ] **svelte-check** already exists — wire it into CI.
- [ ] **Vitest** + `@testing-library/svelte` for unit tests. **Playwright** for E2E. Ship `pnpm test` and `pnpm test:e2e`.
- [ ] **husky + lint-staged** (or `simple-git-hooks`): prettier + eslint + stylelint on staged files pre-commit; `svelte-check` on pre-push.
- [ ] **`.editorconfig`** so editors agree on tabs/LF before Prettier runs.
- [ ] **commitlint** with conventional-commits (current style is already close: `content:`, `fix:`, `chore:` — formalize it).

### 1.2 Add CI

No `.github/workflows/` exists. Add one `ci.yml` on PR:

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm format:check`
- [ ] `pnpm lint`
- [ ] `pnpm lint:style`
- [ ] `pnpm check` (svelte-check)
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] Cache `pnpm` + Playwright browsers
- [ ] Pin Node to `24.15.0` via `actions/setup-node` reading `.nvmrc` (add it — `volta` alone doesn't cover teammates on `nvm`/`fnm`/CI).

### 1.3 Collapse the duplicated design system

Same 40+ tokens live in **both** `src/lib/styles/_variables.scss` and `src/lib/styles/global.scss:1-73`. They will drift.

- [ ] Make `_variables.scss` the sole SCSS source; delete the duplicate block in `global.scss`.
- [ ] Convert palette/typography/spacing tokens to **CSS custom properties** in `:root` inside `global.scss`. Keep SCSS variables only for compile-time needs (e.g. `rgba($color-primary, 0.05)` patterns → replace with `color-mix(in srgb, ...)` or pre-computed alpha tokens).
- [ ] Add a **semantic alias layer** on top of the palette:
  - `--color-surface` / `--color-surface-elevated` / `--color-surface-muted`
  - `--color-text-primary` / `--color-text-secondary` / `--color-text-inverse`
  - `--color-interactive` / `--color-interactive-hover` / `--color-focus-ring`
  - `--color-feedback-success` / `--color-feedback-error` / `--color-feedback-warning`
- [ ] Migrate components to semantic aliases; the palette becomes an implementation detail.

Why CSS variables now: dark mode becomes a 20-line change, per-pack theming becomes possible, and no more `additionalData` injection gotchas (see the comment block in `_mixins.scss:5-9`).

### 1.4 Resolve the "global CSS classes vs component primitives" split

Today: `.btn`, `.card`, `.badge`, `.progress-bar` are global classes in `global.scss`; `Button.svelte` re-emits those classes; no `Card.svelte`/`Badge.svelte`/`ProgressBar.svelte`. Half-finished migration.

- [ ] **Option A (recommended):** Make all UI primitives real Svelte components under `ui/`. Delete `.btn`/`.card`/`.badge`/`.progress-bar` from `global.scss`. Rewrite direct usages (~20 call sites in `LessonList.svelte`, `learn/+page.svelte`, `StepIntro.svelte`, etc.).
- [ ] **Option B:** Keep global classes as the only path and delete `Button.svelte`. Less ideal — loses type-checked variant props.

Do not keep both. The `ui/` rules in AGENTS.md imply Option A.

### 1.5 Add schema validation for curriculum data

`src/lib/data/thai.ts` is ~460 lines with no runtime or build-time safety net. Easy latent bugs:

- `correctIndex` out of `options.length` bounds.
- `reviewLetters` references a character never introduced.
- `position` typos are structurally tolerated because the field is optional.
- Cross-lesson consistency maintained by hand.

Actions:

- [ ] Introduce **Zod** (or **Valibot** — lighter) schemas mirroring `types.ts`.
- [ ] Add `validateCurriculum.ts` — runs as part of `pnpm check` and a Vitest test.
- [ ] Checks:
  - [ ] Every `correctIndex < options.length`.
  - [ ] Every `reviewLetters` char was in some prior lesson's `newLetters`.
  - [ ] No duplicate lesson IDs.
  - [ ] Lesson IDs are monotonically increasing.
  - [ ] No duplicate letter characters across `newLetters` in different lessons.
  - [ ] `anchorWord.syllables.map(s=>s.thai).join('')` roughly reconstructs `anchorWord.thai` (tolerant check for hidden vowels).

Converts "careful editing" into a compile error — the right safety net for a pedagogy dataset.

---

## 2. Important — next iteration

### 2.1 Decide SPA vs SSR and stop straddling

`src/routes/+layout.ts` sets `ssr = false` + `prerender = true` globally. AGENTS.md and the instruction files spend real estate on `+page.server.ts`, env boundaries, etc. — all theoretical today. `adapter-auto` is in devDeps alongside `adapter-static`. Dead dep.

Options:

- [ ] **Commit to SPA** — delete `adapter-auto`, retitle the rules "Future server boundaries."
- [ ] **Move to per-route SSR** — remove the global `ssr = false`, keep `prerender = true` on genuinely static pages (home, alphabet, learn index), let lesson pages hydrate. Better long-term call for an SEO-sensitive language-learning site.

### 2.2 Fix the `initProgress` subscription leak

`src/lib/stores/progress.ts:55-59`:

```ts
export function initProgress() {
	const loaded = loadProgress();
	progress.set(loaded);
	progress.subscribe(saveProgress);
}
```

Unsubscriber thrown away. HMR multiplies subscriptions; any caller importing `initProgress` elsewhere silently multiplies writes.

- [ ] Collapse to `$state` in a `.svelte.ts` rune module + a single `$effect` tied to the layout's lifecycle (preferred — Svelte 5 native), **or**
- [ ] Guard with a module-level `let initialized = false`.

### 2.3 Migrate stores to Svelte 5 runes

Runes are enabled project-wide (`svelte.config.js` sets `runes: true`), but `progress.ts` still uses `writable`/`derived`/`get` from `svelte/store`.

- [ ] Migrate to `progress.svelte.ts`:

```ts
const state = $state<AppProgress>(createInitial());
export const progress = {
	get value() {
		return state;
	},
	completeLesson(id, score) {
		/* mutate state */
	},
	// ...
};
```

- [ ] Preserve the public API so call sites don't churn.

### 2.4 Use `$env/static/public` instead of `import.meta.env`

`src/lib/supabase.ts:9-10` reads `import.meta.env.PUBLIC_SUPABASE_URL ?? ''`. Silently constructs a broken Supabase client when env is missing.

- [ ] Switch to `import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'` — type-checked, statically analyzed, fails build if expected vars are missing.

### 2.5 Accessibility fundamentals

- [ ] Add `:focus-visible` outlines to `.btn`, `.letter-tile`, `.lesson-card`, `.nav__link`. Keyboard users have no focus indicator in several places today.
- [ ] Wrap fade animation in `@media (prefers-reduced-motion: reduce) { animation: none }` at `_mixins.scss:159-162`.
- [ ] Fix "locked lesson card is a clickable `<a href='#'>`" in `LessonList.svelte:16` and `learn/+page.svelte:33` — render `<div>` or `<button disabled>` in the locked branch.
- [ ] `Button.svelte` `href` + `disabled` combo: `aria-disabled` alone doesn't prevent activation. Render a styled `<span>` or skip the anchor in the disabled branch.
- [ ] Audit `letter-tile` disabled state (40% opacity at `alphabet/+page.svelte:201`) with axe/Lighthouse — likely fails WCAG AA contrast.

### 2.6 SEO baseline

AGENTS.md says every page needs a meta description, unique title, OG cards where relevant. None of the current pages have descriptions or OG tags.

- [ ] Create `$lib/seo.ts` helper: `buildHead({ title, description, canonical, og })`.
- [ ] Call it from each page's `<svelte:head>`.
- [ ] Add `<link rel="preload" as="font" ... crossorigin>` pairs for fonts — current `<link rel=stylesheet>` from Google is render-blocking.
- [ ] Self-host Inter/Sarabun via `@fontsource/inter` + `@fontsource/sarabun` — kills the third-party request, improves LCP, complies with stricter CSPs.
- [ ] Generate a `sitemap.xml` (prerender hook or static endpoint) once route count grows.

### 2.7 Plan for curriculum scale

`thai.ts` inlines every lesson. At ~15 lessons this file becomes un-reviewable. Plan the split now, execute before outgrowing it:

```text
src/lib/data/packs/thai/
  lessons/
    01-hua-hin.ts
    02-talat.ts
    ...
  letters.ts        # deduplicated letter catalog
  rules.ts          # deduplicated rule catalog
  index.ts          # assembles thaiPack
```

- [ ] Split lessons into separate files.
- [ ] Deduplicate letter/rule catalogs; lessons reference by ID.
- [ ] Switch `Lesson.id` from `number` to a **stable slug** (`"hua-hin"`) — better URLs (`/learn/hua-hin`), not tied to insertion order, better SEO.

### 2.8 Real tests for the learning flow

Pedagogy is the product; start minimal.

- [ ] **Unit:** `utils/thai.ts` (combining-character prefix rule), `stores/progress.ts` (completeLesson idempotency, isLessonUnlocked, reset).
- [ ] **Component:** `DrillExercise.svelte` — selection locks after answer, correct/wrong classes apply, `onAnswer` fires once.
- [ ] **E2E:** Play through lesson 1 in Playwright; assert the letter appears on `/alphabet` after completion.
- [ ] **Data:** the schema validator from §1.5.

---

## 3. Nice-to-have — next quarter

- [ ] **Error tracking** (Sentry or self-hosted) — SPA apps fail silently without it.
- [ ] **`CONTRIBUTING.md`** + GitHub issue templates + PR template with the AGENTS.md checklist.
- [ ] **Rewrite `README.md`** — still the `sv` CLI default.
- [ ] **Dependabot or Renovate** config at `.github/dependabot.yml`.
- [ ] **Bundle analysis** (`rollup-plugin-visualizer`) wired into CI for soft regression alerts.
- [ ] **Storybook or Histoire** for `ui/` primitives — feasible once Button/Card/Badge exist as real components.
- [ ] **Content authoring UX:** JSON/MDX pipeline so curriculum authors don't need to edit TypeScript. Zod parses JSON → typed Lesson at build.
- [ ] **i18n/L10n scaffold** — even if UI stays English, `lang="th"` on Thai fragments helps screen readers; locale-aware number formatting is cheap.
- [ ] **Analytics consent flow** — design it before there are stakes.

---

## Suggested order of PRs

1. **Tooling foundation** — `.editorconfig`, Prettier, ESLint, Stylelint, scripts in `package.json`. One mechanical reformat PR. No behavior change.
2. **CI workflow** — `.github/workflows/ci.yml`, `.nvmrc`, husky + lint-staged + commitlint.
3. **Design system consolidation** — delete duplicated tokens in `global.scss`, introduce CSS custom properties + semantic aliases. Replace hardcoded hex in mixins/global. Add `:focus-visible` and `prefers-reduced-motion`.
4. **Global classes → component primitives** — `Card.svelte`, `Badge.svelte`, `ProgressBar.svelte`. Migrate call sites. Delete global CSS for those.
5. **Env + Supabase hygiene** — switch to `$env/static/public`. Delete `adapter-auto`.
6. **Progress store migration** — `progress.svelte.ts` with `$state`, fix the subscription leak, preserve public API.
7. **Curriculum schema + tests** — Zod validator, Vitest unit tests, one Playwright E2E.
8. **SEO baseline** — `buildHead` helper, meta descriptions, self-hosted fonts.
9. **Curriculum file split** — lessons into separate files, ID → slug migration (with URL redirects if anything is already linked).
10. **SPA vs SSR decision** — whichever way, execute it.
