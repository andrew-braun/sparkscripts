# Search indexing contract

This document defines which Glyphin documents search engines may discover and
index. The route metadata contract remains in [Route SEO contracts](seo.md).
Release verification must satisfy both documents before production indexing is
enabled.

## Canonical production origin

- The release owner supplies one final production origin through the
  server-only SEO configuration. It must contain only an `https://` scheme and
  host, with no path, query, fragment, credentials, or trailing slash.
- Every HTTP request and every request for a non-canonical production host must
  redirect permanently to the same path on that HTTPS origin. Redirects must
  not create multiple hops.
- Canonical URLs, sitemap locations, and the production `Sitemap:` directive
  are built from this validated origin. This document deliberately does not
  name a domain before one is approved.
- Canonical paths have no trailing slash, except `/`. A trailing-slash request
  permanently redirects to its slashless equivalent and never appears in the
  sitemap.
- Canonicals are absolute and omit query strings and fragments. Tracking or
  application-state parameters do not create another indexable URL.

## Sitemap membership

The sitemap contains exactly these indexable document paths:

- `/`
- `/about`
- `/learn`
- `/learn/{lesson.id}` for every lesson in the active published lesson
  artifact

Lesson entries must come from `getPublishedLessonEntries()` in
`src/lib/server/published-lessons.ts`, which projects the active publication.
They must not come from a second hand-maintained ID list. Output is absolute
HTTPS URLs under the canonical production origin, unique and deterministically
ordered. Do not emit guessed `lastmod`, `changefreq`, or priority values.
The automated readiness check must compare sets and assert that the sitemap's
lesson URLs equal all URLs projected from the current
`getPublishedLessonEntries()` result, with every projected lesson URL present
exactly once and no additional lesson URL present.

The following paths and patterns never appear in the sitemap:

- `/learn/{lesson.id}/practice` and `/practice`
- `/alphabet` and `/words`
- `/auth` and `/auth/sign-out`
- `/api/**`
- `/test/**`
- `/robots.txt`, `/sitemap.xml`, static assets, error documents, and any future
  non-document endpoint
- invalid, missing, inactive, draft, archived, or otherwise unpublished lesson
  IDs

A future route is excluded by default. Adding it requires an explicit
indexability decision in `docs/seo.md` and this membership list.

## Crawler directives

Production `robots.txt` allows crawling indexable documents, disallows
`/api/`, `/auth`, `/test/`, `/alphabet`, `/words`, `/practice`, and lesson
practice URLs for crawl-budget hygiene, and advertises exactly one absolute
canonical-production `/sitemap.xml` URL. Robots rules are not authorization;
private endpoints remain protected on the server.

**Cloudflare Managed robots.txt is enabled (decided 2026-07-14).** Cloudflare
prepends its own managed block ahead of the `static/robots.txt` content, so the
served file is **not** byte-identical to the file in the repo. The managed block
adds AI-crawler `Disallow` groups (intended) and a leading `User-agent: *` group
containing `Allow: /`. The served file therefore contains **two** `User-agent: *`
groups: Cloudflare's `Allow: /` and ours with the crawl-budget `Disallow:` rules.

RFC 9309 requires compliant crawlers to merge same-token groups and apply the
most-specific match, so a `Disallow: /alphabet` still wins over `Allow: /` on
those paths; the major engines behave correctly. Any verification of production
robots.txt must assert the **merged, effective** policy — that each disallowed
prefix is in force and the sitemap directive is present — not exact-match file
content, which the managed feature makes impossible. The managed directives are
maintained in the Cloudflare dashboard, not this repo.

Every non-production deployment, including branch and development preview
hosts, sends `X-Robots-Tag: noindex, nofollow` on every response. Its HTML
documents also emit `noindex, nofollow`. Preview `/robots.txt` must contain
`User-agent: *` followed by `Disallow: /`, must not contain a `Sitemap:`
directive, and must not advertise the production sitemap. Preview
`/sitemap.xml` must be absent and return `404`. Preview canonicals must not make
preview URLs indexable; where canonical metadata is rendered, it points to the
corresponding approved production URL.

On production, learner workflows and utilities listed as non-indexable in
`docs/seo.md` emit `noindex, follow`. Indexable documents must not emit a
`noindex` directive.

`static/llms.txt` is a hand-curated overview for AI agents
([llmstxt.org](https://llmstxt.org)), served at `/llms.txt`. It links only the
indexable public pages and defers the full lesson list to `/sitemap.xml`; it is
not sitemap-derived and, like any non-document endpoint, never appears in the
sitemap itself. Keep its links in sync with the indexable set in `docs/seo.md`.

## Status and canonical behavior

- Every sitemap URL returns `200` HTML without an intervening redirect, exposes
  one self-referencing canonical, is indexable with no meta or response-header
  `noindex`, and has crawler-visible, server-rendered primary content. The
  automated readiness check iterates and asserts these conditions for every
  URL parsed from the sitemap, not only representative URLs.
- An unknown route returns `404`; it does not redirect to `/` or another
  indexable document.
- A malformed, nonexistent, or inactive lesson URL returns `404`. Only lessons
  in the active publication return `200` or enter the sitemap.
- A query-bearing canonical-route request may return `200`, but its canonical
  omits the query. Slash, scheme, and host variants redirect to that canonical
  URL.
- Sitemap XML returns `200` with `application/xml`; production robots text
  returns `200` with `text/plain` and names the canonical sitemap.

## Production verification matrix

Run the automated search-readiness check against the exact deployment before
webmaster submission. Record the command, final origin, UTC date, deployment
identifier, and result in the release record.

| Target                                                           | Expected status or redirect | Canonical and robots                                                        | Sitemap          |
| ---------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------- | ---------------- |
| `/`                                                              | `200`                       | Self-canonical; indexable                                                   | Included         |
| `/about`                                                         | `200`                       | Self-canonical; indexable                                                   | Included         |
| `/learn`                                                         | `200`                       | Self-canonical; indexable                                                   | Included         |
| One active `/learn/{id}`                                         | `200`                       | Self-canonical; indexable                                                   | Included         |
| One inactive or nonexistent `/learn/{id}`                        | `404`                       | Must not present an indexable canonical                                     | Excluded         |
| `/learn/{id}/practice`                                           | `200` when valid            | Self-canonical; `noindex, follow`                                           | Excluded         |
| `/alphabet`, `/words`, `/practice`, `/auth`                      | `200`                       | Self-canonical; `noindex, follow`                                           | Excluded         |
| `/api/learner/projection`, `/api/learner/sync`, `/auth/sign-out` | Endpoint-defined            | No document metadata                                                        | Excluded         |
| `/test/lesson-complete` on production, if deployed               | `200`                       | Self-canonical; `noindex, nofollow`                                         | Excluded         |
| An unknown path                                                  | `404`                       | Must not present an indexable canonical                                     | Excluded         |
| HTTP or alternate-host public URL                                | Permanent redirect          | One hop to exact HTTPS canonical host and path                              | Variant excluded |
| Trailing-slash public URL                                        | Permanent redirect          | One hop to slashless path; `/` unchanged                                    | Variant excluded |
| Query-bearing public URL                                         | `200` or policy redirect    | Query-free canonical                                                        | Variant excluded |
| `/robots.txt`                                                    | `200 text/plain`            | Production rules and one absolute sitemap directive                         | Not applicable   |
| `/sitemap.xml`                                                   | `200 application/xml`       | Unique absolute HTTPS URLs only                                             | Not applicable   |
| Representative preview HTML document                             | `200`                       | Meta and `X-Robots-Tag: noindex, nofollow`; production canonical if emitted | Excluded         |
| Representative preview non-document response                     | Endpoint-defined            | `X-Robots-Tag: noindex, nofollow`                                           | Excluded         |
| Preview `/robots.txt`                                            | `200 text/plain`            | Body is `User-agent: *` and `Disallow: /`; no `Sitemap:`                    | Not applicable   |
| Preview `/sitemap.xml`                                           | `404`                       | Absent; must not serve or redirect to production sitemap                    | Not applicable   |

Also verify that sitemap URLs are unique, inactive lesson IDs are absent, the
sitemap contains no excluded route, and the lesson URL set exactly equals the
active publication projection. On preview, fetch at least one HTML document and
one non-document response to assert the response-level `X-Robots-Tag`, then
assert the exact disallow-all robots behavior and the `404` sitemap absence.

## Operational ownership

The release owner is accountable for this contract. Before production
promotion, that role validates the configured origin, runs and records the
production verification matrix, and blocks release on any failure. After the
domain is live, the release owner coordinates the DNS-based ownership check,
submits `/sitemap.xml` to Google Search Console and Bing Webmaster Tools, and
records the named property owners in the private operations record without
committing verification tokens or secrets.

The release owner repeats verification after changes to routing, publication
selection, canonical-origin configuration, robots behavior, hosting redirects,
or sitemap generation. Product engineering owns remediation of code failures;
the release owner retains the decision to enable or pause production indexing.
