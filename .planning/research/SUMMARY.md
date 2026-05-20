# Project Research Summary

**Project:** GroupCoordinator
**Domain:** Group-coordination PWA for friend groups (3–15) planning trips, concerts, festivals — Spanish-first, hybrid auth (link-view + OAuth-edit), ephemeral-event scope in v1
**Researched:** 2026-05-20
**Confidence:** HIGH

## Executive Summary

GroupCoordinator is a coordination hub — *not* a chat replacement and *not* a planning power-tool. The four research streams converge on one thesis: **the product wins or loses on findability during the trip**, against a 0-friction incumbent (WhatsApp + Google Maps + screenshots) that the entire target group already runs. Every architectural and feature decision has to defend the link-as-product (the URL is the interface, the share preview is the marketing) and reinforce the hybrid auth model that is the single most important product decision already in PROJECT.md.

The recommended approach is a **Next.js 15.5 + Supabase + MapLibre + shadcn** stack on Vercel Hobby — a free-to-launch, marketable, solo-friendly default whose one critical alignment with the product shape is Supabase Auth's `signInAnonymously() → linkIdentity()` flow, which is the *only* off-the-shelf primitive that natively implements "view-by-link without account, upgrade to OAuth at point of edit without losing session continuity." Build order is **spine-first** (plans + invite_tokens + RLS + auth) so the security model is proven before any pretty UI exists; then four parallelizable surfaces (itinerary, map, votes, notes); then cross-cutting polish (PWA, i18n, landing, OG images). Realtime, offline-write, and CRDTs are *not* v1 — they are well-known traps that consume months for zero validated user value.

The two failure modes that kill products in this category are the **weakest-link adoption problem** (one member doesn't engage → group reverts to WhatsApp at the speed of its slowest adopter, viral coefficient collapses to `floor(group_engagement)`) and the **WhatsApp gravity well** (zero switching cost from incumbent + pain felt only 2–4 times/year = no habit formation, no recall). Both are mitigated by (a) ruthlessly defending the hybrid-auth/link-first decision against any login-wall feature creep, (b) resolving the wedge *before* Phase 1 starts, and (c) optimizing the share-link preview as if it were the landing page — because it is.

## Key Findings

### Recommended Wedge (Convergent Across All 4 Researchers)

The user's open question — "wedge competitivo aún no definido" — has a clear, convergent answer from research:

**Headline (Findability):** *"Nunca más perder la reserva en el chat. El lugar al que tu grupo vuelve antes, durante y después del viaje."*

- **Core positioning:** Findability — the anti-graveyard for group-trip information (Wedge 1, FEATURES.md)
- **Proof point:** "Day-of mode" — designed for the trip moment, not the planning moment (Wedge 3, FEATURES.md)
- **Go-to-market:** Spanish-first / LATAM-first as marketing wedge, not feature wedge (Wedge 5, FEATURES.md)
- **Demo hook (not headline):** 30-second setup, no-signup view (Wedge 2 — necessary but doesn't sell)
- **Explicitly rejected:** "Truly unified all-in-one" (Wedge 4) — every competitor claims this; users don't believe it

This must be **locked into PROJECT.md as a Key Decision before Phase 1 starts**. PITFALLS.md is unambiguous: leaving this open turns Phase 1 into rudderless engineering, and the product dies to WhatsApp gravity (CP-2). Treat the wedge as Phase 0 work.

### Recommended Stack (One Line)

**Next.js 15.5 (App Router) on Vercel Hobby, with Supabase (Postgres + RLS + Auth + Storage + Realtime) + Drizzle ORM, styled with Tailwind v4 + shadcn/ui, mapped with MapLibre GL JS + MapTiler/OpenFreeMap, internationalized with next-intl, and tested with Vitest + Playwright.**

**Core technologies:**
- **Next.js 15.5 + App Router** — one codebase serves PWA, landing, and API on the same domain; Server Components + Server Actions remove an API layer; same-domain landing supports the "link is the marketing" thesis
- **Supabase (Auth + Postgres + Storage + Realtime)** — single vendor for everything stateful; **Auth's `signInAnonymously()` → `linkIdentity()` is the only off-the-shelf primitive that matches the hybrid onboarding decision** (preserves user_id across the anonymous→OAuth transition, zero data migration)
- **Postgres RLS** — security spine; every read/write filtered by the same policies whether from RSC, Server Action, or client; no back-door route
- **Drizzle ORM** — SQL-first, edge-compatible, ~1MB bundle; pairs naturally with RLS (you keep writing real SQL)
- **MapLibre GL JS + MapTiler/OpenFreeMap tiles** — free, no per-load fees, no vendor lock-in; explicitly NOT Google Maps (cost-explosion trap, HP-1)
- **shadcn/ui + Tailwind v4** — you own the component code, so a portfolio piece can avoid the "generic shadcn" look
- **next-intl** — Spanish default, English/Portuguese stubs scaffolded from day 1 to avoid string-extraction refactor later
- **Serwist (`@serwist/next`)** — PWA service worker; `next-pwa` is unmaintained; defer wiring to end of MVP
- **Server Actions, NOT tRPC** — solo dev, App Router, forms-and-mutations shape — Server Actions are simpler and one less abstraction

**Key NOT-using:** Google Maps (cost), Liveblocks (overkill, $939/mo at 10K MAU), Prisma (Drizzle preferred but close call), Pages Router, `next-pwa`, Mongoose, Material UI, Cypress, Jest, Auth0, Clerk for this scale.

**Open stack questions for roadmapper:** Drizzle vs Prisma 7 (both viable); i18n routing in v1 vs v2 (recommended v1 to avoid refactor); Realtime in v1 (recommended NO — polling first); Vercel Hobby vs Pro framing (Hobby is non-commercial only).

### Expected Features

**Must have — table stakes already locked in PROJECT.md:**
- Plan with link-based invite, view-without-account
- OAuth (Google/Apple) for edit/vote
- Chronological itinerary with places, times, notes
- Shared map with saved places
- Group polls/votes with explicit close
- Notes/links/docs/screenshots
- Flexible roles (organizer-led OR collaborative wiki)
- Public landing on same domain

**Must have — table stakes MISSING from PROJECT.md (flag for requirements decision):**

FEATURES.md identified these as table-stakes that PROJECT.md did not explicitly list. They are cheap and load-bearing; the roadmapper should decide v1-in or v1-out per item:

1. **Global trip search** (notes + items + links + files) — wedge-critical, low cost; *the* WhatsApp killer feature
2. **Pinned essentials panel** (3–5 user-pinned items above the timeline) — wedge-critical, low cost; direct answer to "where's the reservation link" pain
3. **Activity feed / "what's new since you last visited"** — wedge-critical, medium cost; without it, users scroll the whole plan = same problem as WhatsApp
4. **URL unfurl on paste** (Airbnb, Booking, Google Maps, Instagram, YouTube) — high "magic" ROI, medium cost; magic moment that converts skeptics
5. **Rich OG/Twitter card previews on shared links** — adoption-critical, low cost; the link IS the marketing, OG image renders in WhatsApp/iMessage previews

**Strong recommendation:** all 5 should be in v1. Items 1, 2, and 3 form a "findability trinity" that delivers the chosen wedge. Item 4 is the magic-moment differentiator. Item 5 is the virality mechanic (HP-2 / MP-5 mitigation).

**Should have — additional v1 differentiators:**
- File/image attachment per itinerary item (table stakes)
- Open in Google/Apple Maps deep-link from any place card
- Offline cache of trip data via service worker (enables day-of mode)
- Member presence list with avatars
- PWA install prompt with smart timing (2nd visit)
- Web Push notifications on polls + key item changes (iOS quirks budgeted)
- Vote-closes → "create itinerary item from winning option" CTA
- Decision log / "decided" panel (wedge-critical, low cost)
- Empty-state onboarding for first-time viewers (CP-4 mitigation)

**Defer (v1.x post-validation):**
- Day-of mode single-screen view (validates after engagement signal)
- Scenario templates ("Festival weekend", "City break")
- ICS calendar export
- Per-item reactions (👍/❤️ only)
- Multi-language UI (English second)

**Defer (v2+, per PROJECT.md):**
- Expense management — Splitwise is its own product
- Photo album / post-event recap — retention play (CP-3 mitigation)
- Persistent groups — retention play (CP-3 mitigation)
- In-app comments/chat — anti-feature in v1

**Anti-features (do NOT build):**
- In-app chat tab — competes with WhatsApp, you lose
- AI trip generation — solo-dreamer feature, not group-coordination
- Booking/payments in-app — scope explosion
- Email parsing (TripIt-style) — high infra cost, low ROI
- Live cursors / presence indicators — overengineering for 3–15 person groups
- Calendar sync (bidirectional) — tar pit; one-way ICS export is the v1.x compromise
- Real-time live location sharing — privacy nightmare; use native FindMy/Maps share
- Native iOS/Android apps — PWA is correct
- Granular per-trip RBAC — friend groups don't need it

### Architecture Approach

A monolithic Next.js App Router app on Vercel with Supabase as the BaaS spine. Server Components fetch and render plan data on the server; client islands hydrate interactive pieces (vote button, edit modals, MapLibre canvas) with TanStack Query as the client cache. Postgres RLS is the single source of truth for "who can read/write what" — every query path (RSC, Server Action, realtime subscription) goes through it; no back-door route. The hybrid auth flow uses an `/api/invite/[token]` middleware-style handoff that validates the nanoid invite token against `invite_tokens`, mints an anonymous Supabase session with a custom `plan_id` JWT claim, and 302s to the plan page. When the anon user wants to vote, `linkIdentity()` upgrades them to an OAuth identity without changing `auth.uid()`, and a `plan_members` row is created with the role from the original invite token. The map module is lazy-loaded (`ssr: false`) because MapLibre touches `window` on import. File uploads use the two-phase signed-URL pattern (server permission check → mint signed upload URL → client uploads direct to Storage → confirm insert).

**Major components:**
1. **Auth + Permission spine** (Supabase Auth + invite_tokens table + RLS policies) — proves end-to-end before any pretty UI exists; foundation for everything else
2. **Plan RSC shell** — Server Component renders plan title, itinerary list, map placeholder, vote summary, notes summary from a single Postgres read; owns SEO/OG tags
3. **Itinerary surface** — list view + add/edit modal + realtime subscription via `postgres_changes` on `itinerary_items` filtered by `plan_id`
4. **Map surface** — MapLibre canvas (lazy, ssr:false) + `places` table + pin add/edit/delete + realtime sync
5. **Votes surface** — `polls`/`poll_options`/`votes` tables + create/vote/close flow + realtime tally updates
6. **Notes/Files surface** — `notes` table + Supabase Storage signed-URL upload pipeline + text/link/file kinds
7. **Service worker** — Serwist app shell cache + `/~offline` fallback; intentionally narrow: read-only offline for v1
8. **i18n layer** — next-intl with `[locale]` segment; Spanish default unprefixed (`/plan/abc`), `en`/`pt` stubbed
9. **Marketing landing** — static RSC under `(marketing)` route group, same domain, no auth context

**Architectural anti-patterns to refuse:**
- Bypassing RLS with service-role client "for convenience" — never; treat RLS errors as bugs
- Storing invite token in DB plaintext AND using it for ongoing actions — token authenticates session mint only; ongoing trust is in the cookie-bound JWT
- Putting plan data in a global client store (Zustand/Redux) — TanStack Query IS the cache; server is the source of truth
- Realtime everywhere — refetch-on-focus is the default; Realtime opt-in per surface
- Optimizing for offline-writes in v1 — months of work for unvalidated use case
- Translating user-generated content automatically — localize chrome only

### Critical Pitfalls (Top 5, with Phase Ownership)

| # | Pitfall | Severity | Phase that owns prevention |
|---|---------|----------|---------------------------|
| **CP-2** | **WhatsApp gravity well** — zero-friction incumbent + pain felt only 2–4×/year + no recall = product forgotten | Existential | **Phase 0 (positioning)** — wedge MUST be locked in PROJECT.md as a Key Decision before Phase 1 starts |
| **CP-1** | **Weakest-link adoption** — one member doesn't engage, whole group reverts to WhatsApp; viral coefficient = `floor(group_engagement)` | Existential | **Phase 1 (spine)** — hybrid auth + link-first sharing must be architected correctly the first time; retrofit is expensive |
| **HP-6** | **Anonymous-link token security** — short/guessable tokens scraped; URL tokens leaked via Referer headers, server logs, browser history | High | **Phase 1 (spine)** — 128+ bit nanoid tokens, strict-origin Referrer-Policy, noindex on `/plan/*`, rate-limit 404s, token rotation endpoint, no tokens in analytics |
| **HP-1** | **Map provider cost explosion** — Google Maps at scale = 5-figure bill; per-load pricing compounds across viewers | High | **Phase 1 (spine)** — choose MapLibre + free tiles BEFORE shipping; switching after launch is multi-week refactor |
| **CP-4** | **Empty-canvas first-run** — organizer shares an empty plan; group bounces; organizer demotivated | Critical | **Phase 2 (collaboration)** — scenario templates at create-time, "preview as guest" before share, empty-state copy assumes the second visitor |

**Honorable mentions (next 5, also high-impact):**

- **CP-3 "Drawer trap" / one-trip use** → architectural decision in Phase 1 (plans are long-lived objects, never deletable after event) + retention plays in Phase 3+ (post-trip recap, persistent groups v2)
- **CP-5 Abandoned-plan / bad-actor recovery** → Phase 2 builds co-organizer promotion, soft-delete with restore, transferable ownership, audit log; PROJECT.md's "wiki collaborativo" should be the *default* mode
- **HP-2 Vercel bandwidth shock** → Phase 1: uploads on Supabase Storage (or R2/B2 if storage grows large); Spend Management cap configured; Cloudflare in front of Vercel for static
- **HP-4 PWA iOS install UX is awful** → Phase 1 architectural decision: treat browser-tab as primary; Phase 3 contextual iOS install hint
- **HP-5 Notification overload OR absence** → Phase 3 only; digest-default, max 1/day per plan; ship NO push in Phase 1 to avoid undoing damage later

## Implications for Roadmap

The four researchers converge on a **spine → 4 parallel surfaces → cross-cutting polish** build order. This is not negotiable — building any content surface before the auth/permission spine is proven means re-doing every query with RLS retrofitted, and the hybrid-auth flow has too many integration points (middleware + JWT claim + linkIdentity + RLS policy match) to risk discovering bugs late.

### Phase 0: Wedge Lock-In (positioning, NOT engineering)

**Rationale:** PITFALLS.md is explicit — CP-2 (WhatsApp gravity well) kills the category, and the only defense is a one-sentence wedge a user will text a friend. PROJECT.md still has "wedge competitivo aún no definido." Phase 1 cannot start until this is locked. Research has converged on the answer; Phase 0 is *deciding*, not researching further.

**Delivers:**
- PROJECT.md updated with wedge in Key Decisions: *Findability headline + Day-of mode proof + Spanish-first GTM*
- One-sentence pitch in PROJECT.md "What This Is"
- Acceptance: cannot proceed to Phase 1 without this decision logged

**Addresses:** CP-2 (existential)
**Avoids:** months of feature-direction churn in Phase 1+

### Phase 1: The Spine (auth + permissions + invite tokens + minimum viable plan page)

**Rationale:** Per ARCHITECTURE.md "Suggested Build Order" — the spine is *everything*. Get it right and the rest is leaves on a tree; get it wrong and you re-do all queries. The hybrid auth flow (anonymous session with `plan_id` JWT claim → `linkIdentity` on OAuth → `plan_members` row creation) has the most integration risk and the deepest blast radius.

**Delivers:**
- Supabase project + Drizzle schema for `plans`, `plan_members`, `invite_tokens` (only these three)
- RLS policies on all three with integration tests
- Auth: Google OAuth + Apple OAuth + anonymous sessions + `linkIdentity` upgrade flow
- `/api/invite/[token]` route: token validation, anonymous session mint with JWT claim, 302 redirect
- `/plan/[slug]` RSC page that reads plan and renders title (and nothing else)
- Server Actions: `createPlan`, `mintInviteToken`, `revokeInviteToken`
- 128+ bit nanoid tokens, strict-origin Referrer-Policy, noindex on `/plan/*`, rate-limit 404s
- MapLibre + MapTiler/OpenFreeMap pinned as the map decision (no Google Maps integration written)
- Storage architecture decision logged (Supabase Storage default; R2/B2 if/when needed)
- Vercel Spend Management cap configured; OG image scaffolding (even if not styled yet)
- Pseudonymization-friendly user_id design (MP-3 mitigation built in from day 1)

**Done when:** A friend can open your shared link in WhatsApp, see the plan name with a real OG preview, you can revoke their access via Server Action, and the link 404s. The auth + permission + security + cost-control spines are proven before any pretty UI exists.

**Uses (stack):** Next.js App Router, Supabase Auth/RLS/Drizzle, Server Actions, nanoid, Zod, next-safe-action (optional)
**Implements (architecture):** Auth boundary middleware, Permission layer (RLS), Plan RSC shell (minimal)
**Avoids:** CP-1 (hybrid auth), CP-2 (link-first shareable from day 1), HP-6 (token security), HP-1 (no Google Maps lock-in), HP-2 (cost caps), MP-3 (GDPR pseudonymization architecture)

### Phase 2: The Four Parallelizable Surfaces (itinerary + map + votes + notes)

**Rationale:** ARCHITECTURE.md is explicit — once the spine works, these four can be built in parallel (different sessions or different days). They are independent in their data models but share the same RLS pattern, the same Realtime channel-per-plan discipline, and the same Server Action mutation shape. Each surface should ship its CRUD before any of them get Realtime layered on top.

**Sub-deliverables (parallelizable within the phase):**

**2a — Itinerary** (most-used)
- `itinerary_items` table + RLS
- List view (RSC + client island) with time-zone-aware date display (next-intl)
- Add/edit/delete modal with file attachment
- Drag/reorder (long-press + handle on mobile)

**2b — Map** (highest tech risk, lazy-load)
- `places` table + RLS
- MapLibre integration with `next/dynamic({ ssr: false })`
- Pin add/edit/delete; deep-link to Google/Apple Maps
- Marker clustering (`supercluster`) for >30 places

**2c — Votes** (highest engagement payoff)
- `polls`, `poll_options`, `votes` tables + RLS
- Create poll, vote (requires auth — sidesteps double-vote complexity), view tally
- Close poll flow with explicit winner
- Vote-closes → "create itinerary item from winning option" CTA (the differentiator)

**2d — Notes/Files** (highest infra dependency)
- `notes` table + RLS
- Supabase Storage bucket (private), signed-URL upload pipeline
- Text/link/file note kinds; thumbnail rendering for images
- EXIF stripping on upload (HP-7 mitigation)

**2e — Findability trinity (the wedge proof)**
- Global trip search across items/notes/links/files
- Pinned essentials panel (3–5 items above the timeline)
- Activity feed / "what's new since last visit"
- URL unfurl on paste (Airbnb, Booking, Google Maps, Instagram)
- Decision log panel

**2f — Empty-state and onboarding polish**
- Scenario templates at plan creation (festival/city break/concert)
- "Preview as guest" before share
- Empty-state copy that addresses the second visitor, not the first
- Co-organizer promotion + transferable ownership + audit log + soft-delete (CP-5)

**Uses (stack):** TanStack Query, react-hook-form + Zod, MapLibre, Supabase Storage, cmdk for search
**Implements (architecture):** All four content surfaces + plan settings + role/permission flows
**Addresses:** All locked PROJECT.md features + the 5 missing table-stakes from FEATURES.md
**Avoids:** CP-4 (empty canvas), CP-5 (bad-actor recovery), HP-7 (doxxing/EXIF), MP-1 (visible conflicts)

### Phase 3: Cross-Cutting Polish (PWA + i18n + landing + notifications + lifecycle)

**Rationale:** ARCHITECTURE.md is explicit — *don't build offline before online is stable*. PWA, push, and i18n scaffolding are cross-cutting concerns layered on top of working content surfaces. Realtime can be added per-surface here once the non-realtime versions are debugged. Notifications go LAST because over-notifying in Phase 1/2 does damage that takes 30%+ of users to permanently opt out of (HP-5).

**Delivers:**
- Serwist service worker, app shell cache, `/~offline` fallback, install prompt with smart timing
- iOS-aware install UX (contextual Share-menu hint, not Chromium prompt)
- next-intl polish: locale switcher, full message catalog audit, Spanish-only ships with `en`/`pt` stubs
- Marketing landing pages under `(marketing)` route group
- OG image generation polished (Vercel/Next `next/og`) — every shared link is the landing page
- Supabase Realtime layered per surface (votes tally, itinerary edits, places adds) with visibility-hidden disconnect and rate limiting (HP-3)
- Web Push notifications: digest default, max 1/plan/day, granular controls, email fallback for iOS
- Error tracking (Sentry) with PII scrubber, analytics (lightweight, plan-create/view/edit/share events)
- Post-trip recap (60–90d email) as the recall hook against CP-3
- Hard-launch on Show HN / TikTok / Spanish-language channels

**Uses (stack):** Serwist, Supabase Realtime, next-intl, Sentry, lifecycle email tool
**Avoids:** HP-3 (Realtime quota), HP-4 (iOS install), HP-5 (notification overload), CP-3 (recall via post-trip touch), MP-5 (virality via OG)

### Phase 4+ (Post-Launch, Conditional)

**Rationale:** Don't roadmap these yet — let validation drive them.
- **Day-of mode** single-screen view (validates after engagement signal)
- **v2 features per PROJECT.md:** expenses (Splitwise-style, separate `expenses` + `expense_splits` tables), photo album (new `kind = 'photo'` on notes + `albums` table), persistent groups (new `groups` entity, `plans.group_id` nullable — only v2 path that touches v1 schema, non-breaking), in-app constrained comments
- **English/Portuguese translations** when LATAM/Spain traction is proven
- **Self-serve GDPR deletion UI**, audit log UI, advanced templates
- **Pricing model** (defer per MP-4 — validate retention first)

### Phase Ordering Rationale

- **Why Phase 0 is positioning, not engineering:** CP-2 will kill the product regardless of build quality if the wedge is undefined. Research has converged; this is a decision, not more research. Cost: hours, not weeks.
- **Why the spine blocks everything:** ARCHITECTURE.md "Suggested Build Order" — without RLS in place, every content query is written wrong and must be re-done. The hybrid auth flow has the deepest integration risk in the entire system.
- **Why the four surfaces parallelize:** independent data models, shared RLS pattern, shared Server Action shape. Building them sequentially adds no safety; building them parallel respects developer flow.
- **Why polish is last:** PWA service worker + Realtime + push all have well-known footguns (HP-3, HP-4, HP-5) that are debuggable only after the underlying surfaces work. Premature service worker caching of broken UI is worse than no offline.
- **Why notifications go last:** HP-5 is asymmetric — under-notifying is recoverable, over-notifying is not. Once 30% of users opt out, they're gone.

### Research Flags

**Phases likely needing deeper research during planning (use `/gsd:plan-phase --research-phase`):**

- **Phase 2c (votes) — `linkIdentity` upgrade flow at vote time:** The cleanest UX for "anonymous viewer taps Vote → OAuth modal → vote registers as their newly-authed self" depends on Supabase auth-helpers behavior that warrants a small spike. The architecture is sound; the UX-level integration is MEDIUM confidence.
- **Phase 2d (notes/files) — URL unfurl pipeline:** Airbnb/Booking/Instagram anti-scraping behavior is real (PITFALLS HP risk flag). A graceful fallback to favicon-only and the choice of an unfurl library/service needs research before building.
- **Phase 3 (PWA) — iOS Safari + Supabase OAuth in PWA standalone mode:** Documented quirks (popup blocking, redirect failures). Research current 2026 workarounds before implementation.

**Phases with standard patterns (skip research-phase):**

- **Phase 1 (spine):** Supabase + Drizzle + RLS + Next.js Server Actions patterns are exhaustively documented and stack research is HIGH confidence
- **Phase 2a (itinerary) and 2b (map):** Standard CRUD + MapLibre patterns; ARCHITECTURE.md covers state boundaries
- **Phase 2e (findability trinity):** Search/pinning/activity-feed are established patterns; cmdk is the recommended primitive

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Most decisions verified against official 2026 docs; only Drizzle vs Prisma 7 is genuinely close (and both viable) |
| Features | HIGH | 12+ direct competitor sources analyzed, multiple user-review datasets, WhatsApp limits verified against official docs; bimodal competitive split (decision-apps vs itinerary-apps) is well-evidenced |
| Architecture | HIGH (patterns) / MEDIUM (hybrid-auth specifics) | Standard Next.js + Supabase patterns are HIGH; the precise `linkIdentity` integration warrants a small Phase 1 spike to verify |
| Pitfalls | HIGH (technical/cost facts) / MEDIUM-HIGH (product/adoption) | All cost numbers verified against vendor docs; adoption patterns aligned with social-graph product failure literature but inherently probabilistic |

**Overall confidence:** HIGH

### Gaps to Address

- **Wedge decision is a *decision*, not a gap.** Research converged. Roadmapper / user must lock it into PROJECT.md as a Key Decision during Phase 0. Do not allow Phase 1 to start without it.
- **Drizzle vs Prisma 7** — lock during Phase 1 planning. Drizzle recommended.
- **Realtime in v1: yes or no?** — recommendation is NO (polling + refetch-on-focus first); roadmapper should confirm. Realtime can be layered in Phase 3 per surface.
- **i18n in v1: install scaffolding only or ship English alongside Spanish?** — recommendation is *install next-intl scaffolding from day 1 with Spanish-only catalog*, ship English when LATAM/Spain traction validated.
- **PWA install timing: end of MVP (recommended) or earlier?** — if "installable" is core marketing message, move earlier; otherwise defer to Phase 3.
- **Vercel Hobby vs Pro framing at launch:** Hobby tier is non-commercial only. If "buy me a coffee" or affiliate links appear, Pro is required. Decide framing pre-launch (Phase 3).
- **Storage choice if upload volume grows large:** Supabase Storage is fine for MVP. If photos drive volume in v2 album, evaluate Cloudflare R2 ($0 egress).
- **The 5 missing table-stakes features (search, pinned essentials, activity feed, URL unfurl, OG previews)** — requirements decision needed. Recommendation is ALL 5 in v1 because they collectively *are* the findability wedge.

## Sources

### Primary (HIGH confidence)

**Stack & architecture:**
- Next.js 15.5 & 16 release notes — https://nextjs.org/blog/next-15-5, https://nextjs.org/blog/next-16
- Supabase official docs — pricing, RLS, anonymous sign-ins, linkIdentity, Realtime concepts, signed upload URLs
- Drizzle ORM docs, shadcn/ui Tailwind v4 + React 19 docs, Serwist + Next.js guide
- next-intl App Router setup, TanStack Query SSR + App Router docs
- MapLibre vs Mapbox vs Leaflet 2026 comparisons; MapTiler/OpenFreeMap docs
- Server Actions vs tRPC 2026 guidance
- Vercel pricing official; Vercel free vs Pro 2026 breakdowns

**Pitfalls (verified technical/cost facts):**
- Supabase Realtime limits + concurrent connections troubleshooting (official docs)
- Google Maps Platform pricing official + 2026 Radar cost analysis
- Vercel pricing tier breakdowns
- MDN Referer header privacy guide; web.dev referrer best practices
- PWA iOS limitations 2026 (MagicBell, Mobiloud, BSWEN)
- GDPR Right to Erasure (Custodia, EDPB Feb 2026 framework)

### Secondary (MEDIUM confidence — multi-source consensus)

- Competitive landscape: Wanderlog, TripIt, Troupe, Heylo, GroupMe, AvoSquado, SquadTrip, Pilot, Let's Jetty, Stippl (12+ product pages + 2026 review sources)
- WhatsApp polls limitations (AnyControl, Periskope, official WhatsApp help)
- Push notification fatigue thresholds (Appbot, Boundev, ContextSDK 2026)
- CRDT / sync trade-offs (Engin Bolat, Codastra 2026)
- Drizzle vs Prisma comparisons (Bytebase, makerkit, Prisma's own comparison page)

### Tertiary (LOW confidence — single source or pattern inference, validate during planning)

- Viral coefficient model applied to group-coordination (general SaaS pattern adapted)
- Wedge candidate ranking (synthesized from competitive analysis, not measured)
- 60–90 day post-trip recap as optimal recall window (industry rule of thumb)
- Specific 30-second create-time-to-shareable-link target (heuristic, not measured)

### Files committed alongside this summary

- `.planning/research/STACK.md`
- `.planning/research/FEATURES.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/PITFALLS.md`

---
*Research completed: 2026-05-20*
*Ready for roadmap: yes — pending Phase 0 wedge lock-in to PROJECT.md*
