# Phase 1: Spine & Plan Lifecycle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 01-Spine & Plan Lifecycle
**Areas discussed:** Token & invite link shape, Plan creation flow & empty state, Anonymous → authenticated upgrade UX, Tooling: ORM + Apple OAuth timing

---

## Token & invite link shape

### Q1. URL form for the share link

| Option | Description | Selected |
|--------|-------------|----------|
| /i/[token] short opaque, then 302 to /plan/[slug] | Slug not revealed until token validates; clean WhatsApp UX; rotation kills only the link, slug stays stable | ✓ |
| /plan/[slug]?t=[token] direct, no redirect | Single-hop, no /i/ route; slug visible in history and Referer | |
| Both forms accepted | Belt-and-suspenders; middleware handles either path | |

**User's choice:** /i/[token] short-opaque with 302 (after asking for a recommendation)
**Notes:** Middleware ALSO accepts `/plan/[slug]?t=[token]` as a fallback (the second option folded in as graceful handling, not the canonical share form).

### Q2. Number of active tokens per plan

| Option | Description | Selected |
|--------|-------------|----------|
| Multiple tokens per plan, individual revoke | Per-channel revoke ("WhatsApp link" vs "email link"); ARCHITECTURE.md recommendation | ✓ |
| Single active token per plan, regenerate replaces | Simpler v1; covers PLAN-04 without N:1 schema complexity | |
| Multiple in schema, v1 UI exposes one | Schema future-proof, UI simplified | |

**User's choice:** Multiple tokens per plan, revoke individual
**Notes:** Supports "leaked link in wrong chat" recovery without losing all access.

### Q3. Default token expiration policy

| Option | Description | Selected |
|--------|-------------|----------|
| Never expires by default; explicit expiry optional | ARCHITECTURE.md: adoption-friendly; owner controls revoke manually | ✓ |
| Auto-expire 7 days post-event_end_date | PITFALLS HP-7 recommendation; reduces blast radius | |
| Never expires + post-event UI badge | Compromise: link survives, signal to rotate | |

**User's choice:** Never expires by default
**Notes:** Resolves the ARCHITECTURE vs PITFALLS conflict in favor of adoption UX. Owner gets manual revoke + optional expiry as escape hatches.

### Q4. Revoke behavior for existing anonymous sessions

| Option | Description | Selected |
|--------|-------------|----------|
| Sessions remain valid until cookie expires | ARCHITECTURE.md baseline; no extra table | ✓ |
| Immediate kick via plan_revocations table | Hardened but adds RLS check on every query | |
| V1 simple, harden if necessary | Defer plan_revocations until concrete need | |

**User's choice:** Sessions remain valid until cookie expires
**Notes:** Ship the simple path; `plan_revocations` deferred to future-ideas list.

---

## Plan creation flow & empty state

### Q1. Required fields at plan creation

| Option | Description | Selected |
|--------|-------------|----------|
| Title only | Setup-in-30s wedge maxed; fields editable post-create | ✓ |
| Title + start_date | Balance; OG preview gets date context | |
| Title + start_date + end_date | Most contextful; more friction upfront | |

**User's choice:** Title only
**Notes:** Maximizes the "setup en 30 segundos" wedge. Dates and description are still surface-able for editing after create.

### Q2. Post-create landing destination

| Option | Description | Selected |
|--------|-------------|----------|
| Plan view with share dialog open | Modal with copyable link + Web Share API button | ✓ |
| Plan settings/edit page | More structured; adds an intermediate screen | |
| Plan view, share button prominent in header | Subtle, lower share rate | |

**User's choice:** Plan view with share dialog open
**Notes:** Next click is intended to be "compartir"; the modal removes a step.

### Q3. Empty-plan UX for a guest visitor

| Option | Description | Selected |
|--------|-------------|----------|
| Contextual message + member list ("Carlos sigue agregando detalles…") | PITFALLS CP-4 explicit; assumes second visitor; feels intentional | ✓ |
| Skeleton of future sections (Itinerary / Map / Notes placeholders) | Phase 2-5 surfaces don't exist; would show empty tabs to nowhere | |
| Title + "Esperando contenido…" minimal | Risk CP-4: feels broken | |

**User's choice:** Contextual message + member list
**Notes:** Phase 1 UI surfaces no future-phase placeholder tabs.

### Q4. OG preview image strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Dynamic image via next/og | Brand gradient + title + creator + date; per-plan rendering | ✓ |
| Static brand image + og:title/og:description meta | Simpler, less personal | |
| No image, plain og:title + og:description | Minimal preview; less clicky | |

**User's choice:** Dynamic next/og image
**Notes:** Endorsed because "the share link IS the marketing" (MP-5).

---

## Anonymous → authenticated upgrade UX

### Q1. Entry surface for "sign in" affordance

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom sheet (shadcn sheet) with OAuth button(s) | Mobile-first; OAuth redirect same-tab | ✓ |
| Centered modal with OAuth buttons | Desktop-first; mobile UX inferior | |
| Full-page redirect to /auth/sign-in | Clear flow but breaks "I was here" context | |

**User's choice:** Bottom sheet
**Notes:** OAuth runs in same-tab redirect (Supabase standard flow), not a popup.

### Q2. Landing after successful OAuth callback

| Option | Description | Selected |
|--------|-------------|----------|
| Same plan view, scroll position preserved | AUTH-04 explicit: no context loss; linkIdentity preserves user_id | ✓ |
| Same plan view + welcome toast | Educates, but toasts often missed on mobile | |
| Welcome splash for 2s, then plan | Celebratory but adds an intermediate screen | |

**User's choice:** Same plan view, scroll preserved
**Notes:** Scroll preservation is best-effort, not a hard requirement.

### Q3. Pending action replay (if guest had clicked "vote" before signin)

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing — re-intent manually | Phase 1 has no vote/edit surfaces; defer replay to phases that need it | ✓ |
| Persist in query param ?pending=… and replay | Magic UX but overkill for Phase 1 | |
| Persist in sessionStorage and re-prompt | Similar overkill | |

**User's choice:** Nothing in v1
**Notes:** Captured as deferred idea for Phase 4 (voting) and Phase 2/5 (editing surfaces).

### Q4. Role assigned on auto-join via linkIdentity

| Option | Description | Selected |
|--------|-------------|----------|
| Role dictated by the invite_token used | viewer→viewer, editor→editor; ARCHITECTURE.md pattern | ✓ |
| Always editor on authentication | Wiki collaborative default; simpler but loses public-read distinction | |
| Default viewer; owner promotes manually | More secure but breaks AUTH-04 "no context loss" | |

**User's choice:** Role from invite_token (joined_via_token_id)
**Notes:** Supports differentiated tokens (viewer-class vs editor-class) at the schema level even if v1 UI only mints one class.

### Q5. Identity surface change post-OAuth (when viewer→viewer)

| Option | Description | Selected |
|--------|-------------|----------|
| Avatar + name in header replaces "Sign in" button | Clear feedback without noise | ✓ |
| Toast "Signed in as X" + avatar | Explicit but noisy; toasts unreliable on mobile | |
| No visual change; identity only in menu | Too subtle; user wouldn't know OAuth succeeded | |

**User's choice:** Avatar + name in header
**Notes:** Menu accessible from avatar gives access to logout and "My plans".

---

## Tooling: ORM + Apple OAuth timing

### Q1. Data access layer choice

| Option | Description | Selected |
|--------|-------------|----------|
| Drizzle ORM 0.36+ | ~90% smaller bundle, edge-compatible, SQL-first; pairs naturally with Supabase RLS | ✓ |
| Prisma 7 | Schema DSL more legible; bundle gap narrowed; MEDIUM-confidence trade-off in STACK.md | |
| Supabase JS client raw (no ORM) | Simplest, but loses schema migrations tooling | |

**User's choice:** Drizzle ORM 0.36+
**Notes:** Closes the open question that STATE.md flagged in the Roadmap-to-Plan handoff.

### Q2. Apple OAuth timing in v1

| Option | Description | Selected |
|--------|-------------|----------|
| Google only in v1; Apple as fast-follow in Phase 1 or 2 | AUTH-02 covers ~85% LATAM/ES; AUTH-03 deferred until Apple Dev account ready | |
| Google + Apple both in Phase 1 | Best iOS coverage; requires Apple Developer $99/yr + 6-month secret rotation | |
| Google + magic-link email backup for iOS (no Apple) | Defer Apple indefinitely; magic-link as iOS contingency | ✓ |

**User's choice:** Google + (eventual) magic-link, no Apple
**Notes:** AUTH-03 effectively removed from v1. Magic-link is the contingency, but its timing was settled in Q3 below.

### Q3. Magic-link timing

| Option | Description | Selected |
|--------|-------------|----------|
| Magic link in Phase 1 alongside Google | Ship both day 1; ~1 day of work + email provider config | |
| Google only in Phase 1; magic link in Phase 7 if iOS dropoff observed | Minimum viable for Phase 1; data-driven later | ✓ |
| Magic link in Phase 1, Google deferred | Higher friction (check email, copy link); hurts adoption | |

**User's choice:** Google only in Phase 1; magic link in Phase 7 contingent on telemetry
**Notes:** Captured in CONTEXT.md D-17. REQUIREMENTS.md update flagged in Deferred Ideas (AUTH-03 needs to move out of v1).

---

## Claude's Discretion

Areas where downstream agents (researcher, planner) decide:

- Form library choice (default = react-hook-form + Zod per STACK.md)
- Exact nanoid slug length for `plans.slug` (8 or 10 chars within ARCHITECTURE.md guidance)
- Database client triplet file structure (default = ARCHITECTURE.md pattern)
- Multi-environment OAuth setup (per-env apps + dynamic redirect via `NEXT_PUBLIC_SITE_URL`)
- Exact Spanish microcopy phrasings (tone iteration during execution)

## Deferred Ideas

### Removed from v1 scope (REQUIREMENTS.md update needed)
- **AUTH-03 Apple OAuth** → defer to v2 (or Out of Scope). Magic-link in Phase 7 is the iOS contingency.

### Captured for later phases
- Pending-action intent replay — Phase 4 (voting) and Phase 2/5 (edit surfaces)
- `plan_revocations` table for immediate-kick token invalidation — add only if a leak case demands it
- Differentiated invite tokens (viewer vs editor as separate token classes in UI) — schema supports it; v1 UI may default to one class
- Co-organizer / role promotion flow — Phase 2 (per CP-5 timing)
- Per-locale string translation for `en.json` / `pt.json` — Phase 7+
- Soft-deleted plan restore UI — Phase 7+ (data model in Phase 1 already supports it)
- Audit log surface — Phase 2+ (CP-5 mitigation)

### Out of Scope (per PROJECT.md, restated)
- In-app chat, email parsing, booking/payments, expense splitting (v2), persistent groups (v2)
