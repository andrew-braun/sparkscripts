# Search Indexing Readiness Implementation Plan

- **Status: COMPLETE — verified against source 2026-07-31.** The unticked
  checkboxes below are stale bookkeeping, not remaining work. `static/robots.txt`
  disallows `/api/`, `/auth`, `/test/`, `/alphabet`, `/words`, `/practice`, and
  `/learn/*/practice`, and carries the `Sitemap:` directive;
  `src/routes/sitemap.xml/+server.ts` generates the sitemap from the lesson
  publication; canonical URLs ship via `PageMetadata`. Do not re-execute this plan.

> **For agentic workers:** REQUIRED SUB-SKILL: Use $superpowers-subagent-driven-development (recommended) or $superpowers-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every intended public page discoverable under one canonical production URL while keeping private, test, and low-value utility surfaces out of search indexes.

**Architecture:** Derive sitemap entries from the same published lesson catalog used by the app, keep crawler policy explicit in `robots.txt`, and verify status codes, canonicals, and crawler-visible HTML against the deployed domain. Webmaster-tool submission is an operational final step.

**Tech Stack:** SvelteKit 2, generated lesson publication artifacts, XML sitemap, robots.txt, Cloudflare Workers

## Global Constraints

- Never include auth, API, sign-out, test, or learner-private URLs in the sitemap.
- Sitemap lesson URLs must derive from the active published lesson artifact, not a duplicate hand-maintained list.
- Use one final HTTPS production origin.
- Missing and invalid lesson URLs return 404 and are never redirected to indexable content.
- `robots.txt` is not an access-control mechanism; sensitive routes remain server-protected.

---

### Task 1: Define The Indexing Contract

**Files:**

- Create: `docs/search-indexing.md`
- Read: `docs/seo.md`
- Inspect: `static/robots.txt`
- Inspect: `src/lib/server/published-lessons.ts`

**Interfaces:**

- Consumes: The route-level indexability decisions from `docs/seo.md`
- Produces: Sitemap inclusion rules, robots rules, verification matrix, and operational owner

- [ ] **Step 1: List included route patterns**

  Record every static public route and the published lesson route pattern.
  Exclude utility and private surfaces explicitly.

- [ ] **Step 2: Define canonical and status-code checks**

  Include production scheme/host normalization, trailing-slash policy, unknown
  route 404, invalid lesson 404, inactive lesson exclusion, and preview-domain
  noindex behavior.

- [ ] **Step 3: Commit**

  ```bash
  git add docs/search-indexing.md
  git commit -m "docs: define search indexing contract"
  ```

### Task 2: Generate A Publication-Aware Sitemap

**Files:**

- Create: `src/routes/sitemap.xml/+server.ts`
- Create: `src/lib/server/sitemap.ts`
- Create: `src/lib/server/sitemap.test.ts`
- Modify: `src/lib/server/published-lessons.ts` only if a build-safe public URL projection is needed

**Interfaces:**

- Produces: `buildSitemap(origin: string, paths: string[]): string`
- Produces: `GET /sitemap.xml` returning `application/xml`
- Consumes: Public static route paths, canonical origin, and published lesson IDs

- [ ] **Step 1: Write failing sitemap tests**

  Assert valid XML, absolute HTTPS URLs, deterministic ordering, XML escaping,
  unique URLs, inclusion of `/` and published lessons, and exclusion of `/auth`,
  `/api`, `/test`, practice utility routes when classified non-indexable, and
  unpublished lessons.

- [ ] **Step 2: Run the focused test**

  ```bash
  node --test src/lib/server/sitemap.test.ts
  ```

  Expected: failure because the sitemap route does not exist.

- [ ] **Step 3: Implement the sitemap endpoint**

  Implement escaping and deterministic URL construction in the pure helper.
  Return its XML from the endpoint with
  `Content-Type: application/xml; charset=utf-8` and a cache policy appropriate
  to the immutable publication version. Do not emit invented `lastmod`,
  `changefreq`, or priority values.

- [ ] **Step 4: Validate**

  ```bash
  node --test src/lib/server/sitemap.test.ts
  pnpm check
  pnpm build
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add src/routes/sitemap.xml src/lib/server/sitemap.ts src/lib/server/sitemap.test.ts src/lib/server/published-lessons.ts
  git commit -m "feat: generate publication-aware sitemap"
  ```

### Task 3: Finalize Robots And Preview Index Controls

**Files:**

- Modify: `static/robots.txt` or replace with `src/routes/robots.txt/+server.ts`
- Modify: deployment configuration needed to distinguish preview and production hosts
- Test: `src/routes/robots.txt/robots.test.ts` if generated dynamically

**Interfaces:**

- Produces: Production crawler rules with sitemap discovery and preview noindex behavior

- [ ] **Step 1: Select static or dynamic robots delivery**

  Use static output only if the sitemap origin and preview behavior can remain
  correct in every environment. Otherwise generate it from the validated site
  origin and environment classification.

- [ ] **Step 2: Add explicit rules**

  Production should allow intended public pages, disallow obvious utility/test
  paths for crawl-budget hygiene, and include an absolute `Sitemap:` URL.
  Preview deployments should emit `X-Robots-Tag: noindex, nofollow` broadly and
  should not advertise the production sitemap as their own.

- [ ] **Step 3: Validate and commit**

  ```bash
  pnpm check:all
  pnpm build
  git add static/robots.txt src/routes/robots.txt wrangler.jsonc
  git commit -m "feat: finalize crawler directives"
  ```

  Stage only paths that exist after the selected implementation.

### Task 4: Verify Crawlability And Status Codes

**Files:**

- Create: `scripts/check-search-readiness.mjs`
- Modify: `package.json`
- Modify: `docs/search-indexing.md`

**Interfaces:**

- Produces: `pnpm search:check -- "$BASE_URL"` returning non-zero on indexing-contract violations

- [ ] **Step 1: Write the checker assertions**

  Fetch `robots.txt`, `sitemap.xml`, representative public pages, `/auth`, a
  missing route, and an invalid lesson. Assert response status, content type,
  canonical URL, robots directive, sitemap membership, and duplicate URL absence.

- [ ] **Step 2: Run against local preview and confirm useful failures**

  ```bash
  pnpm search:check -- http://127.0.0.1:4173
  ```

- [ ] **Step 3: Fix the implementation until the checker passes**

  Expected: all declared public routes pass and all negative cases are excluded
  or return the intended status.

- [ ] **Step 4: Commit**

  ```bash
  git add scripts/check-search-readiness.mjs package.json docs/search-indexing.md
  git commit -m "test: automate search readiness checks"
  ```

### Task 5: Verify And Submit The Production Domain

**Files:**

- Modify: `docs/search-indexing.md`
- Modify: `.ai/2026-07-11-pre-rollout-tasks.md`

- [ ] **Step 1: Run the checker against production**

  ```bash
  pnpm search:check -- "$PRODUCTION_ORIGIN"
  ```

  Set `PRODUCTION_ORIGIN` to the final HTTPS production origin. Record the
  command, origin, date, and deployment identifier.

- [ ] **Step 2: Register webmaster tools**

  Verify domain ownership using a DNS-based method, submit the sitemap to Google
  Search Console and Bing Webmaster Tools, and record property owners without
  committing verification secrets.

- [ ] **Step 3: Inspect representative URLs**

  Request indexing for the homepage, `/about`, `/learn`, and one lesson. Confirm
  the tools report the intended canonical and no blocking crawler directive.

- [ ] **Step 4: Close the checklist item and commit**

  ```bash
  git add docs/search-indexing.md .ai/2026-07-11-pre-rollout-tasks.md
  git commit -m "docs: verify production search readiness"
  ```
