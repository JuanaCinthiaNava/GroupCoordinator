---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
last_updated: "2026-05-22T23:32:10.728Z"
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State: GroupCoordinator

## Project Reference

**Core Value:** Que cualquier persona del grupo pueda encontrar lo importante y cerrar decisiones del plan sin pelear con el chat — un solo lugar al que volver, no cinco apps.

**Wedge:** Findability (headline) + Day-of mode (proof) + Spanish-first (GTM)

**Current Focus:** Phase 1 — Spine & Plan Lifecycle (hybrid auth + invite tokens + minimal plan create/view/share loop)

## Current Position

- **Phase:** 1 of 7 — Spine & Plan Lifecycle
- **Plan:** Not started (awaiting `/gsd:plan-phase 1`)
- **Status:** Roadmap complete, ready for phase planning
- **Progress:** `[░░░░░░░░░░░░░░░░░░░░] 0/7 phases (0%)`

## Roadmap Snapshot

| Phase | Name | Status |
|-------|------|--------|
| 1 | Spine & Plan Lifecycle | Not started (next) |
| 2 | Itinerary | Not started |
| 3 | Map & Places | Not started |
| 4 | Voting & Decisions | Not started |
| 5 | Notes, Files & URL Unfurl | Not started |
| 6 | Findability Trinity | Not started |
| 7 | Day-of Mode, PWA & Public Launch | Not started |

## Performance Metrics

- **Phases complete:** 0/7
- **Requirements mapped:** 52/52 (100% coverage)
- **Plans complete:** 0
- **Verification passes:** 0
- **Repairs:** 0

## Accumulated Context

### Key Decisions (from PROJECT.md)

- Hybrid onboarding: view-by-link without account, OAuth (Google/Apple) required only for edit/vote
- Event-scoped plans in v1; persistent groups deferred to v2
- Expense management deferred to v2 (Splitwise is its own product)
- PWA mobile-first on web; no native iOS/Android apps
- Stack locked: Next.js 15.5 + Supabase + MapLibre + shadcn (see research/STACK.md)
- Wedge locked: Findability + Day-of + Spanish-first (see research/SUMMARY.md)

### Architectural Constraints (from research/ARCHITECTURE.md)

- Spine-first build order: auth + permissions + invite tokens must work before any content surface
- All reads/writes pass through Postgres RLS (no service-role back doors)
- Anonymous link-viewers get a Supabase anonymous JWT with a `plan_id` claim — they do NOT get a `plan_members` row
- `linkIdentity()` on OAuth upgrades anonymous session without losing context
- MapLibre + MapTiler/OpenFreeMap (never Google Maps — cost trap)
- Supabase Realtime only where live update value is obvious; refetch-on-focus is the default
- Read-only offline in v1; no offline writes

### Critical Pitfalls to Mitigate (from research/PITFALLS.md)

- **CP-1 Weakest-link adoption** — Phase 1 (hybrid auth + link-first sharing, view-only works fully)
- **CP-2 WhatsApp gravity well** — Already mitigated by locked wedge in PROJECT.md
- **CP-4 Empty-canvas first-run** — Phase 1 plan creation flow needs empty-state UX from the start
- **CP-5 Notification overload** — Phase 7 ships activity feed (not push) to avoid notification fatigue
- **HP-1 Map cost** — Phase 1 locks MapLibre + free tiles (no Google Maps integration)
- **HP-6 Token security** — Phase 1: 128+ bit nanoid tokens, strict referrer policy, noindex on /plan/*, rate-limit 404s
- **HP-2 Vercel bandwidth** — Phase 1: Supabase Storage for uploads, Spend Management cap configured

### Todos / Open Questions (carry into planning)

- Drizzle vs Prisma 7 — lock during Phase 1 planning (Drizzle recommended)
- Realtime in v1: NO by default — polling first, layered Realtime opt-in per surface in Phase 4 (votes) and Phase 2 (itinerary) if budget allows
- i18n: scaffold next-intl from day 1 (Phase 1) but only ship Spanish catalog; en/pt stubs in Phase 7
- PWA install timing: end of v1 (Phase 7); browser-tab UX is primary throughout

### Blockers

None.

## Session Continuity

**Last action:** Roadmap created from PROJECT.md + REQUIREMENTS.md + research/ context
**Next action:** Run `/gsd:plan-phase 1` to plan the Spine & Plan Lifecycle phase
**Files of record:**

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/research/SUMMARY.md`
- `.planning/research/STACK.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/FEATURES.md`
- `.planning/research/PITFALLS.md`
- `.planning/config.json`

---
*State initialized: 2026-05-20*
