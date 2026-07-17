# Monetization & Course Entitlements

- Start date: 2026-07-17
- Owner: Andri
- Status: planning (design + approval gate — no implementation yet)
- Risk class: **high** (payments, authorization, secrets, session-bound
  entitlements). Per `AGENTS.md` → "Security And Deployment Governance": needs
  current-doc research, explicit threat review, least-privilege design, and human
  sign-off before any deploy. Do not guess on provider or RLS specifics — verify
  against live Stripe / Supabase / app-store docs at implementation time.

## Goal

Make Glyphin partly paid: a free tier of the first several lessons per language,
then a paid unlock. Support comped/beta access via one-time limited redemption
codes. Design it so the **mobile app** (future) can grant the same access through
App Store / Play Billing without reworking the core model.

## Product shape (from Andri, 2026-07-17)

- First **5–10 lessons (~15–25%)** of each course are free.
- Past the boundary, access costs **~$2.99 per language**.
- **Beta testers** get free access to **all languages** via one-time, limited-use
  codes.
- Start sooner rather than later; at minimum, bake it into the long-term plan.

Open product decisions (see "Open questions"): one-time unlock vs recurring
subscription; exact free-lesson count; per-language vs all-access pricing.

## The core idea: separate the _grant_ from the _enforcement_

The durable primitive is an **entitlement** — a server-side record that a learner
has access to a course. Everything else (Stripe purchase, redemption code, comp,
future mobile IAP, future subscription) is just a _source_ that writes an
entitlement. Enforcement reads entitlements and never cares how they were granted.

This decoupling is what lets web (Stripe) and mobile (StoreKit / Play Billing)
coexist without a second access system.

```text
grant sources ──▶ entitlement (learner × course, server-side) ──▶ enforcement
  Stripe Checkout                                                   lesson delivery gate
  redemption code                                                   practice gate
  admin comp                                                        paywall UI state
  mobile IAP (later)
  subscription (later, via expires_at)
```

## Data model (Supabase, private schema + RLS)

Exact schema goes through `docs/db.md` / `docs/database-dto-spec.md` and a
migration review. Sketch:

- **`entitlements`** — `learner_id`, `course_id`, `source`
  (`purchase | code | comp | subscription`), `granted_at`, `expires_at` (null =
  perpetual), `status` (`active | revoked`), optional `source_ref` (Stripe session
  id / code id) for idempotency + audit. Unique on `(learner_id, course_id)` where
  active.
- **`access_codes`** — `code_hash` (never store plaintext), `grants`
  (`all_courses` or a specific `course_id`), `max_redemptions`, `redemptions_used`,
  `expires_at`, `status`. Redemption writes an entitlement and increments the
  counter transactionally.
- **Free-tier boundary as published metadata, not code.** Add a per-course
  `free_lesson_count` (or a per-lesson `tier: free | paid`) to the curriculum →
  delivery → published artifact pipeline, so the boundary is authored and
  versioned like the rest of the catalog, not hardcoded in a route. This reuses
  the existing publication mechanism.

RLS: entitlements are learner-private, deny-by-default; only server/privileged
paths write them. No client write path to entitlements or codes ever.

## Enforcement (server-side only — this is the security core)

- The free/paid gate lives in the **server load / delivery boundary**, not the
  client. A learner's access decision is made from a verified server-side user +
  their entitlements, never from client state. (`AGENTS.md`: "Server authorization
  decisions must happen on the server.")
- **Locked lesson content must not be sent to the client.** For lessons beyond the
  free boundary without an entitlement, the server returns a paywall state, not
  the lesson payload. Shipping locked content with a client-side "locked" flag
  leaks the paid product — the withholding happens in `+page.server.ts` /
  delivery, before serialization.
- Gate points: `/learn/[id]` and `/learn/[id]/practice` server loads; the learner
  projection/sync endpoints stay usable for free-tier progress but never unlock
  paid content. Anonymous learners get the free tier; buying/redeeming requires
  sign-in so the entitlement binds to a durable identity (reuse the existing
  anonymous→authenticated progress merge).
- Paywall UI: a gated route state (like the existing `LessonGateState`) prompting
  sign-in + purchase/redeem.

## Web payments: Stripe (recommended)

- **Why Stripe:** mature, Cloudflare-Workers-friendly via its REST API (fetch),
  hosted **Checkout** keeps card data off our infra (minimal PCI burden), robust
  webhooks. Verify current Workers + Stripe guidance at build time.
- **Flow:** client starts Checkout → Stripe hosts payment → `checkout.session
.completed` **webhook** → verify signature server-side (raw body; a `+server.ts`
  endpoint, not a remote function) → write entitlement **idempotently** (dedupe on
  the Stripe session id). Fulfillment is webhook-driven, never client-confirmed.
- **One-time unlock** = a one-time Stripe Price per course. If Andri later wants
  recurring, subscriptions map onto the same entitlement via `expires_at` +
  `customer.subscription.*` webhooks — no enforcement change.
- **Secrets:** secret key + webhook signing secret are server-only env
  (`.dev.vars` / Cloudflare secrets), never in the client bundle or logs. Only the
  publishable key may be public. Handle `charge.refunded` / dispute webhooks →
  revoke the entitlement.

## Redemption codes (beta access — the earliest useful slice)

- Redeem endpoint: server-side, **rate-limited** (reuse the existing
  `LEARNER_SYNC_RATE_LIMITER` pattern), validates code hash + limits + expiry,
  writes entitlement(s) transactionally. `all_courses` codes write a wildcard
  grant (or fan out per active course).
- Code generation: start with a privileged server-only script (Andri runs it); a
  proper admin UI is out of scope for v1.
- Codes stored **hashed**; compare by hash. One-time / limited use enforced by the
  counter under a transaction to prevent double-spend races.

## Mobile / in-app-purchase tension (read before building)

This materially shapes the design, so it is called out now even though mobile is
a later workstream:

- Apple App Store and Google Play generally **require their own IAP** for digital
  content unlocked inside the app, taking **15–30%**. Stripe cannot be used for
  in-app digital unlocks on iOS. External-link/"reader" allowances exist and have
  shifted with recent rulings/regulation — **verify current store policy when
  mobile work starts; do not assume today's rules.**
- Net of a 30% cut, $2.99 → ~$2.09. May influence pricing or a web-vs-app price
  split.
- **Design consequence (do this now):** keep enforcement provider-agnostic. Web
  writes entitlements via Stripe; mobile will write the same entitlements via
  StoreKit / Play Billing receipt validation on the server. No Stripe-specific
  assumption may leak into the gate. This is already how the model above is
  structured — the point is to _not regress it_ under delivery pressure.

## Phasing (each phase is independently shippable)

- **Phase 0 — Design & decisions.** Lock the open questions below; entitlement +
  code schema reviewed against `docs/db.md`; threat model written. **Approval gate
  before any code.**
- **Phase 1 — Entitlement schema + server-side free/paid gate.** Publish the
  free-tier boundary metadata; enforce it in delivery; ship the paywall UI. No
  payment yet — everything beyond the free tier is locked. This alone makes the
  boundary real.
- **Phase 2 — Redemption codes end-to-end.** Table, hashed codes, rate-limited
  redeem endpoint, generation script. Unblocks beta testers immediately.
- **Phase 3 — Stripe web purchases.** Checkout + signed webhook fulfillment +
  refund handling. Test mode → live behind sign-off.
- **Phase 4 — Mobile IAP grant source.** Deferred to the mobile workstream; plugs
  into the same entitlements.

Phases 1–2 deliver enforceable freemium + beta access **without** taking payments,
which is the fastest safe path to "paid past a certain point."

## Security checklist (must all hold)

- Access decisions server-side from verified identity; no client-trusted unlocks.
- Locked content never serialized to the client.
- All secrets server-only; webhook signatures verified; fulfillment idempotent.
- Entitlement/code writes only via privileged server paths under RLS.
- Redeem + purchase endpoints rate-limited and input-validated at the boundary.
- Human sign-off before enabling live payments; test mode first.

## Open questions

- One-time unlock vs recurring subscription? (Plan supports both; default assumed
  one-time per language.)
- Free-lesson count: 5 or 10, and per-course or global across the catalog?
- Confirm $2.99; single web price, or web/app split to absorb store fees?
- Refund/chargeback policy → automatic entitlement revocation on Stripe events?
- Tax handling (Stripe Tax) and which courses are paid at launch (Thai only today;
  Korean is authored but unpublished).

## Related

- Long-term sequencing: `.ai/2026-07-17-product-roadmap.md`
- Auth it builds on: `docs/auth.md`
- DB contract: `docs/db.md`, `docs/database-dto-spec.md`
- Rate limiter pattern: `wrangler.jsonc` `LEARNER_SYNC_RATE_LIMITER`,
  `src/lib/server/rate-limit.ts`
