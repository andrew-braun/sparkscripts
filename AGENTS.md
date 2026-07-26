# Glyphin Instructions

## Purpose

- Glyphin is a SvelteKit app for learning to read Thai through real words, structured lesson flows, and progressive drills.
- Optimize for clarity, pedagogy, accessibility, and long-term maintainability.
- Give learners usable tools, then let them try those tools in new contexts before revealing answers.
- Favor strong conventions and small, obvious abstractions over cleverness.

## Source Of Truth

- This file is the canonical repo-wide instruction set.
- When working inside a subdirectory, also follow the nearest `AGENTS.md`.
- Keep `.github/copilot-instructions.md` and `.github/instructions/*.instructions.md` aligned with the relevant `AGENTS.md` files.
- When architecture, tech choices, configuration, environment variables, deployment assumptions, or workflow expectations change, update every relevant instruction file in the same change.
- Do not leave stale instruction files behind. If guidance no longer reflects the codebase, fix or delete it immediately.

## Stack And Runtime

- Package manager: `pnpm`
- Runtime: Node `24.15.0`
- Framework: SvelteKit 2, Svelte 5 runes, TypeScript, SCSS
- Icons: `@lucide/svelte` for UI icons. Import icons directly from `@lucide/svelte/icons/<icon-name>`; do not use the package root barrel (`@lucide/svelte`). Keep `@lucide/svelte` in `vite.config.ts` > `ssr.noExternal` so SvelteKit can compile Lucide's `.svelte` icon modules during SSR.
- Runtime lesson content today: static lesson data plus localStorage-backed progress
- Local backend foundation: `supabase/` now contains the baseline SQL schema, RLS, seed entry point, and privileged sync helpers for future server-backed curriculum and learner state
- Optional backend path: Supabase
- Deployment posture: Cloudflare Workers Static Assets with `@sveltejs/adapter-cloudflare` is the target runtime. DB-backed lesson delivery requires a server-capable SvelteKit runtime; do not assume static-only hosting for route work.

## Validation Workflow

- Install with `pnpm install`.
- Run `pnpm check` before finishing any non-trivial change.
- Use `pnpm check:all` when a change affects formatting, linting, or SCSS styling conventions.
- Use `pnpm lint` and `pnpm stylelint` directly when tightening a focused TypeScript, Svelte, or style slice.
- Run `pnpm build` whenever a change affects routes, metadata, environment variables, bundling, or deploy behavior.
- Use `pnpm dev` for manual UI verification.
- After a Cloudflare adapter/config change, simulate the built Worker locally with
  `pnpm exec wrangler dev .svelte-kit/cloudflare/_worker.js` before relying on a
  Cloudflare Workers Builds preview. Runtime secrets (`SUPABASE_AUTH_URL`,
  `SUPABASE_AUTH_PUBLISHABLE_KEY`) come from a local `.dev.vars` file (gitignored,
  not `.env`); build-time vars still come from `.env`.
- `pnpm db:content:refresh` is the default local curriculum workflow. It
  regenerates `supabase/seed.sql`, refreshes local Supabase content, restores
  local auth and learner state, and regenerates `.generated/` lesson
  publication artifacts.
- `pnpm db:reset` is for full local resets when you intentionally want to wipe
  learner and auth state as well as refresh lesson content.

## Commit Discipline

- The AI must never run `git commit` (or any command that creates a commit) in this repo. The user makes every commit themselves.
- This holds even if the user asks the AI to commit in the moment — decline, and explain that commits are user-only in this repo.
- The AI may stage suggestions for the user to review, but pressing the actual commit button is always the user's action.
- The AI may recommend a 1-2 sentence Conventional Commits-style message and may suggest good natural commit boundaries (e.g. "this is a good stopping point to commit"), but stops there.
- Pushing, force-pushing, and other remote-affecting git operations remain equally off-limits to the AI, consistent with existing repo-wide risk guidance.

## Task Tracking

- Every non-minor task must get a dedicated markdown spec and tracker file in `.ai/`.
- Minor tasks do not need a `.ai` spec: quick style/layout tweaks, small bug fixes, copy edits, and other simple, self-contained changes that touch only a few files.
- When in doubt about whether a task is minor, default to skipping the `.ai` file and proceed; only add one if the work grows scope, spans multiple sessions, or otherwise turns out non-minor.
- Name task files as `YYYY-MM-DD-short-description.md` using the date the task starts.
- Create the task file before or at the start of implementation, then keep it updated with scope, decisions, progress, blockers, and follow-up work.
- Treat the `.ai` file as the durable handoff artifact for resuming work later.
- Track per-language curriculum progress and future authoring work in `.ai/curriculum/<language>.md`.

## Proportional Planning And Approval

- Keep planning proportional to scope, uncertainty, and risk. Planning should accelerate delivery and clarify decisions, not become a separate project.
- For minor tasks, use one lightweight cycle: understand the request, state a short implementation plan, get one sign-off or round of feedback, then execute the full plan. Do not create a tracker, require formal alternatives or a written design, or ask for repeated approval unless scope or risk materially changes.
- For moderate tasks, write a concise `.ai` plan focused on decisions, affected areas, validation, and meaningful risks. Prefer one approval gate before execution; add checkpoints only where the user must make a real choice.
- Reserve comprehensive discovery, multiple design rounds, detailed task decomposition, and repeated review gates for genuinely complex, ambiguous, cross-cutting, or high-risk work.
- Treat generic planning workflows as defaults to scale down when they conflict with this proportional approach. Follow this repository's `.ai/` location rules whenever a written plan is warranted.
- Once a plan is approved, proceed autonomously through in-scope implementation and validation. Pause again only for an unexpected complication, a material change in scope or risk, or a decision that cannot safely be inferred.

## Durable Documentation

**Hard rule: no planning documents in `docs/`. Ever.**

- `docs/` is for durable reference documentation ONLY — content that stays true and useful after the task that produced it is finished: security checklists, architecture notes, workflow guides, schema contracts, operational references.
- Every planning artifact goes in `.ai/`, with no exceptions: implementation plans, design specs, rollout checklists, launch gates, task trackers, backlog notes, migration plans, audit follow-ups, and anything with a progress checklist in it.
- The test is simple: **if it has checkboxes, a status line, or a "phases"/"steps" section, it is a plan — it belongs in `.ai/`.** If it describes how the system _is_ rather than what someone intends to _do_, it belongs in `docs/`.
- This applies regardless of which tool or agent generated the document. Plans produced by any external skill, generator, or workflow must land in `.ai/` — do not let a tool's default output path put a plan under `docs/`. If a tool writes one there, move it in the same change.
- Never create nested plan directories under `docs/` (no `docs/plans/`, no `docs/specs/`, no tool-named subfolders). A `docs/superpowers/` tree accumulated eight such files before the 2026-07-14 audit caught it; do not recreate that pattern under any name.
- When a durable project fact emerges from a task, move or summarize it into `docs/` — carry the fact across, not the plan.
- For database and Supabase work, start with `docs/db.md` and use `docs/database-dto-spec.md` for the exact schema and DTO contract.

## Architecture Map

- `docs`: durable reference docs, review checklists, and long-lived workflow guides
- `supabase`: local Supabase config, migrations, seed entry point, and privileged SQL functions
- `src/routes`: route composition, data loading, metadata, and page-level orchestration
- `src/lib/components`: reusable rendering building blocks
- `src/lib/data`: canonical curriculum content and shared types
- `src/lib/stores`: client state and persistence boundaries
- `src/lib/supabase.ts`: browser-safe Supabase entry point only

## Quality Bar

- Extend existing structures before creating parallel ones.
- Extract shared code only after a second concrete use or when a stable boundary is clear.
- Do not build mini-frameworks around tiny variations.
- Keep business rules out of generic UI primitives.
- Do not duplicate canonical lesson content across routes, components, stores, and utilities.
- Favor explicit, typed APIs over dynamic option bags.
- Preserve local formatting in touched files; do not mass-reformat unrelated code.

## Svelte 5 Standards

- Use `$state` for local mutable state.
- Use `$derived` for computed values.
- Use `$effect` only for real side effects, never as a substitute for derived state.
- Treat props as read-only inputs.
- Prefer callback props for child-to-parent communication.
- Use `$bindable` only when true two-way binding is part of the intended public API.
- Prefer snippet-based composition when children are rich or structured.
- Prefer render tags and snippets over legacy slot patterns in new code.
- Avoid legacy Svelte patterns when a current runes-mode equivalent exists.
- For new extracted shared state or reusable reactive logic, prefer rune-powered `.svelte.ts` or `.svelte.js` modules over classic Svelte stores unless a store contract is specifically needed for interop or subscriptions.

## Modern SvelteKit Standards

- Prefer SvelteKit remote functions in `.remote.ts` files for first-party app reads and mutations when they materially simplify typed client-server communication and fit the current framework support level.
- Reserve `+server.ts` endpoints for true HTTP surfaces such as webhooks, third-party integrations, public APIs, non-JSON responses, streaming, or cases where remote functions are not a good fit.
- Use progressive enhancement and server-driven mutations for forms wherever practical.
- Before adopting newly stabilized or beta Svelte/SvelteKit capabilities, verify current documentation and confirm the feature improves delivery speed rather than adding churn.

## Frontend Standards

- Use semantic HTML first. Reach for ARIA only when native semantics do not cover the interaction.
- Prefer Bits UI for reusable interactive primitives and composite controls wherever possible so focus, keyboard, and open-state behavior stay consistent across the site.
- Treat Bits UI as the accessibility foundation for the design system. When an interactive pattern is expected to repeat, prefer an app-owned wrapper in `src/lib/components/ui` over scattering raw Bits UI usage across feature components.
- In SCSS, use maximal nesting that mirrors the rendered HTML structure. Keep BEM-style class names when helpful, but do not organize styles as flat `&__element` blocks when the DOM can be expressed directly through nested selectors. For same-element modifier states, prefer explicit selectors such as `&.component--modifier`.
- Interactive behavior must use real interactive elements such as `button`, `a`, form controls, or accessible headless primitives.
- All images need meaningful `alt` text unless they are purely decorative.
- Reuse design tokens from `$lib/styles` instead of hardcoding new colors, spacing, or radii in components.
- Use Lucide (`@lucide/svelte`) for UI icons instead of text glyphs such as `->` or Unicode arrows. Import each icon from `@lucide/svelte/icons/<icon-name>`; do not import from the package root barrel. For repeated forward-action button labels, use `ButtonForwardLabel.svelte`.
- Keep copy concise, concrete, and learner-focused.

## Routing And Data Loading

- Use `+page.ts` only for public, serializable data that is safe to run during client navigation.
- Use `+page.server.ts`, `+layout.server.ts`, or `+server.ts` for private environment access, writes, privileged fetches, or secrets.
- Validate route params early and throw `error(status, message)` for invalid states.
- Keep load return values minimal and shaped for the page, not as raw backend payloads.
- Each route owns its metadata. When metadata patterns repeat, extract a shared helper instead of copy-pasting head blocks everywhere.
- Keep URLs descriptive and content-oriented.

## SEO And Content Standards

- Every indexable page should have a unique, specific title.
- Add a concise meta description when the page has search-facing intent or share-card value.
- Keep one clear primary topic per page with a single strong `h1`.
- Avoid duplicate content under multiple URLs; add canonical handling when duplication becomes possible.
- Prefer descriptive internal link text and human-readable URLs.
- Write people-first content. Do not stuff keywords or add SEO-only filler copy.

## Client And Server Boundaries

- Do not touch `window`, `document`, `localStorage`, or browser-only APIs at module scope.
- Guard browser-only code or run it inside lifecycle hooks.
- Never import private environment modules into universal page code or client components.
- Server authorization decisions must happen on the server.

## Security And Deployment Governance

- Treat any change involving environment variables, authentication, authorization, session handling, cookies, databases, storage, secrets, encryption, secure API routes, or production integrations as high-risk work.
- High-risk work requires current-doc research, explicit threat review, least-privilege design, and human sign-off before deployment.
- Never guess on security-sensitive implementation details. Research the exact framework and provider guidance first.
- Secrets must stay in private environment variables, server-only modules, or managed secret stores. Never commit, log, serialize, expose, or echo them back to clients.
- Verify public versus private environment variable boundaries every time. Do not assume a variable is safe to expose just because similar variables are public.
- Perform authentication and authorization checks on the server using verified user identity, not optimistic client state.
- Validate and sanitize all untrusted input at trust boundaries.
- Prefer deny-by-default, minimal surface area, and least privilege for every new secure capability.
- If security posture is uncertain, stop and escalate rather than shipping.

## Supabase Standards

- Public anon credentials may appear in public env vars. Service-role or admin credentials must never reach client bundles.
- If auth or database-backed server features are introduced, use `@supabase/ssr` with server setup in `hooks.server.*` and server load functions or endpoints.
- Use browser Supabase clients only for public or session-scoped client interactions.
- Authorization must rely on verified server-side user lookups, not unverified client session assumptions.
- Use row-level security and least-privilege database access patterns when database-backed features are introduced.
- Treat Supabase auth, storage, and database schema changes as sign-off-required security-sensitive work.
- For schema, SQL, RLS, sync, or publication work, read `docs/db.md` first and `docs/database-dto-spec.md` before editing migrations or server-side DB access.
- Preserve the current schema boundaries: `curriculum` and `internal_api` are private implementation schemas; learner-facing runtime reads should go through `delivery` and `learner` server-controlled paths.

## Change Discipline

- Make the smallest coherent change that solves the actual problem.
- If a new pattern is warranted, document it in the nearest `AGENTS.md` and the matching Copilot instruction file.
- Update `docs/`, `.ai` task files, README, env examples, and relevant instruction files when project facts change.
- Leave the touched area more regular than you found it, but do not widen scope into unrelated refactors.
