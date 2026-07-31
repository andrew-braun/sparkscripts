# Framework And UI Dependency Refresh

- Started: 2026-07-11
- Scope: Reconcile Svelte, SvelteKit, Vite, adapter-node, Lucide, and Bits UI
  declarations with the shared policy-aged lockfile; remove the confirmed-unused
  static adapter.
- Decision: Keep `@sveltejs/adapter-node` until the separately tracked
  Cloudflare deployment adapter swap. Removing `@sveltejs/adapter-static` now
  is safe because it is not imported by app code or configuration.
- Guardrails: Preserve Node `24.15.0` and the existing release-age policy without
  exclusions. Do not touch concurrent security changes in `svelte.config.js` or
  `vite.config.ts`. **The pnpm `11.6.0` pin was retired on 2026-07-14 — it had
  become the problem rather than a guardrail (see below).**
- Status: **Done — audit gate closed 2026-07-14.**

## Original refresh (2026-07-11)

`pnpm install --frozen-lockfile` passed after the user reran it interactively.
Focused formatting/Markdown checks on touched docs, `pnpm lint`, `pnpm stylelint`,
and `pnpm check` passed.

## Correction and closure (2026-07-14)

This file previously claimed audits were "reduced to one remaining low
`cookie <0.7.0` advisory." That was **stale** — a live `pnpm audit --prod`
reported **1 low + 3 high**. All three highs were **pnpm itself** at the pinned
`11.6.0` (path traversal in the configDependencies env lockfile; hoisted install
importing a lockfile alias outside `node_modules`; `patch-remove` deleting files
outside the patches directory). The pin written as a guardrail was enforcing the
vulnerability.

**Resolved:**

- [x] Bumped pnpm `11.6.0` → `11.8.0` in `packageManager` and
      `devEngines.packageManager`. `11.8.0` is the minimum version clearing all
      three advisories and the best-aged option under the `minimumReleaseAge`
      policy (published 2026-06-18). `pnpm install --frozen-lockfile` succeeded;
      the lockfile diff is confined to the `packageManagerDependencies` block
      (the `pnpm` / `@pnpm/exe` binaries and platform variants) — **no application
      dependency, version, or resolution changed**. `pnpm check` (939 files, 0/0)
      and `pnpm lint` stayed clean. Both audits dropped from 4 findings to 1.
- [x] Accepted the residual low `cookie <0.7.0` advisory (`GHSA-pxg6-pf52-xh8x`)
      with a time-bounded record in `docs/dependency-maintenance.md`: owner Andri,
      review 2026-10-14, removal trigger = any SvelteKit release admitting
      `cookie >=0.7.0`.

**Why the `cookie` advisory was accepted rather than fixed.** No upstream fix
exists — the latest SvelteKit (`2.69.3`) still declares `cookie: ^0.6.0`,
identical to our `2.69.2`. A pnpm override was rejected: forcing `cookie@^0.7.0`
outside SvelteKit's declared range, in the library that handles Supabase auth
session cookies on a live site, is a real auth-correctness risk taken on behalf of
an **unreachable** low finding. The advisory requires attacker-influenced cookie
name, path, or domain; `hooks.server.ts` takes the name from Supabase SSR,
hardcodes `path: "/"`, and sets no domain.

**Note for the next deploy:** Cloudflare Workers Builds reads `packageManager`,
so the production build toolchain changed. Confirm it resolves `pnpm@11.8.0`.

## 2026-07-31 — transitive advisory sweep

`pnpm audit` had drifted back to 7 findings (5 high, 1 moderate, 1 low). All were
transitive dev/build tooling with patch-level fixes upstream. Added a
`pnpm-workspace.yaml` `overrides:` block (pnpm 11 no longer reads
`package.json` > `pnpm.overrides`) pinning five packages:

| Package           | Reached via             | Pinned to  |
| ----------------- | ----------------------- | ---------- |
| `brace-expansion` | eslint > minimatch      | `>=5.0.8`  |
| `fast-uri`        | stylelint > table > ajv | `>=3.1.4`  |
| `js-yaml`         | markdownlint-cli2       | `>=5.2.2`  |
| `postcss`         | vite / @sveltejs/kit    | `>=8.5.18` |
| `sharp`           | wrangler > miniflare    | `>=0.35.0` |

`cookie` was **not** overridden — the accepted-risk decision above still holds,
and the residual `1 low` finding is that same unreachable `GHSA-pxg6-pf52-xh8x`.

Verified: `pnpm audit` 7 findings -> 1 low, `pnpm test` 25 files / 107 tests
passing, `pnpm lint` and `pnpm stylelint` clean, `pnpm exec vite build` succeeds
through the Cloudflare adapter. `pnpm build` itself still requires local Supabase
for the `prebuild` publication step — unrelated to this change.
