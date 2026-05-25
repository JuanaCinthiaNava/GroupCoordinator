# Roadmap: GroupCoordinator

**Created:** 2026-05-20
**Granularity:** standard (7 phases)
**Mode:** mvp
**Core Value:** Que cualquier persona del grupo pueda encontrar lo importante y cerrar decisiones del plan sin pelear con el chat — un solo lugar al que volver, no cinco apps.
**Wedge:** Findability (headline) + Day-of mode (proof) + Spanish-first (GTM)

## Build Order Rationale

Spine-first, then four parallelizable surfaces, then findability trinity (the wedge), then cross-cutting polish. Per research, the auth + permission spine must be proven before any content surface is built — retrofitting RLS to existing queries is the most expensive class of refactor in this stack. The findability trinity is sequenced after the four surfaces because search needs content to search, pinned essentials need items to pin, and the activity feed needs mutations to feed off. Day-of mode + PWA + i18n + landing close out v1 as cross-cutting polish that layers on stable surfaces.

## Phases

- [ ] **Phase 1: Spine & Plan Lifecycle** — Hybrid auth, invite tokens, RLS, and a minimal create-and-share plan loop end-to-end
- [ ] **Phase 2: Itinerary** — Cronological day-by-day timeline of plan items with places and notes
- [ ] **Phase 3: Map & Places** — Shared map of saved places with deep-link to native maps apps
- [ ] **Phase 4: Voting & Decisions** — Group polls with options, votes, and explicit closure
- [ ] **Phase 5: Notes, Files & URL Unfurl** — Rich notes, links, file uploads, and URL preview magic
- [ ] **Phase 6: Findability Trinity** — Global search, pinned essentials, and activity feed — the wedge
- [ ] **Phase 7: Day-of Mode, PWA & Public Launch** — Mobile event-mode, offline cache, install, i18n, landing

## Phase Details

### Phase 1: Spine & Plan Lifecycle
**Goal:** A plan creator can sign in, create a plan, share an invite link, and a guest who opens the link can view the plan and members without creating an account.
**Mode:** mvp
**Depends on:** Nothing (foundational phase)
**Requirements:** AUTH-01, AUTH-02, AUTH-04, AUTH-05, AUTH-06, PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05, PLAN-06
**Success Criteria** (what must be TRUE):
  1. A user can sign in with Google OAuth and their session persists across browser refreshes
  2. A signed-in user can create a plan (title, dates, optional description) and gets a shareable invite link in under 30 seconds
  3. A guest opening the invite link in WhatsApp/iMessage sees the plan title and member list as a read-only view without creating an account
  4. The plan owner can revoke the invite link (regenerate) so a freshly-pasted old link 404s, and can archive or delete the plan
  5. A guest who taps "sign in to edit/vote" completes OAuth and lands back on the plan with their anonymous session upgraded (no context loss), and signed-in users see a list of all plans they belong to
**Plans:** 1/6 plans executed
  - [x] 01-01-PLAN.md — Bootstrap Next.js + Supabase + Drizzle + next-intl + shadcn + Biome + Vitest + Playwright scaffold (Walking Skeleton; produces 01-SKELETON.md)
  - [ ] 01-02-PLAN.md — Database schema + RLS policies + Custom Access Token Hook + Supabase client triplet + invite-token utilities + seed data
  - [ ] 01-03-PLAN.md — Anonymous link view: /api/invite/[token] handler + plan view RSC + Surface 3 components + security headers + rate limit
  - [ ] 01-04-PLAN.md — Plan create + share dialog + OG image + Server Actions; closes PLAN-01, PLAN-02, AUTH-06
  - [ ] 01-05-PLAN.md — OAuth callback + sign-in (Surface 5) + /me dashboard (Surface 7); closes AUTH-02, AUTH-04, AUTH-05, PLAN-06
  - [ ] 01-06-PLAN.md — Plan settings (Surface 6) + token revoke + plan archive; closes PLAN-04, PLAN-05
**UI hint:** yes

### Phase 2: Itinerary
**Goal:** Plan members can build and consult a chronological day-by-day timeline with locations, times, and free-form notes per item.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** ITIN-01, ITIN-02, ITIN-03, ITIN-04, ITIN-05
**Success Criteria** (what must be TRUE):
  1. An authenticated plan member can add an itinerary item with title, date/time, optional place and optional notes
  2. The itinerary view shows items grouped by day in chronological order, readable on mobile
  3. An itinerary item can be linked to a saved place (Phase 3 dependency surfaces here once map ships; until then, place field is text-only)
  4. Authenticated members can edit and delete itinerary items they have permission for, and the change is visible to others on refresh
**Plans:** TBD
**UI hint:** yes

### Phase 3: Map & Places
**Goal:** Plan members share a single map of saved places (hotels, restaurants, points of interest) with one-tap handoff to native navigation.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** MAP-01, MAP-02, MAP-03, MAP-04, MAP-05
**Success Criteria** (what must be TRUE):
  1. An authenticated member can add a saved place with name, geocoded address, and category (hotel/food/point-of-interest/other)
  2. All members of the plan (including link-viewers) see the same shared map with pins for every saved place
  3. Tapping a pin opens place detail with name, address, and one-tap deep links to Google Maps and Apple Maps
  4. The map renders using MapLibre + a free tile provider (no Google Maps key, no per-load fees), and authenticated members can edit/delete places they have permission for
**Plans:** TBD
**UI hint:** yes

### Phase 4: Voting & Decisions
**Goal:** Plan members can run group polls with explicit closure so decisions stop dying in WhatsApp scrollback.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** VOTE-01, VOTE-02, VOTE-03, VOTE-04, VOTE-05, VOTE-06
**Success Criteria** (what must be TRUE):
  1. An authenticated member can create a poll with a question and 2–10 options, configured as single-choice or multi-choice
  2. An authenticated member can cast or change their vote until the poll closes, and the tally is visible to all members
  3. A poll can have an optional close date and the creator can also close it manually; a closed poll displays its winner unambiguously
  4. The vote tally updates so all open viewers see current results without manually refreshing (polling or realtime per research)
**Plans:** TBD
**UI hint:** yes

### Phase 5: Notes, Files & URL Unfurl
**Goal:** Plan members can store rich notes, paste links, and upload files (PDFs, screenshots) so reservations and codes stop living in chat — and pasting a URL enriches it with a preview.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** NOTE-01, NOTE-02, NOTE-03, NOTE-04, NOTE-05, VIRAL-01
**Success Criteria** (what must be TRUE):
  1. An authenticated member can create a rich-text note, paste a link with title and description, or upload a file up to 10 MB
  2. Notes, links, and files appear in a consultable list separate from the itinerary, with file thumbnails for images
  3. When a member pastes a URL into a note or itinerary item, the app extracts metadata (title, description, image) and shows an enriched preview
  4. Authors can edit and delete their own notes/links/files; uploads go via signed-URL pipeline directly to private storage
**Plans:** TBD
**UI hint:** yes

### Phase 6: Findability Trinity
**Goal:** The reservation, code, decision, or address a member needs is two seconds away — via global search, pinned essentials, or the activity feed of what changed since their last visit. This phase delivers the wedge.
**Mode:** mvp
**Depends on:** Phase 2, Phase 3, Phase 4, Phase 5
**Requirements:** FIND-01, FIND-02, FIND-03, FIND-04, FIND-05, FIND-06, FIND-07
**Success Criteria** (what must be TRUE):
  1. A member can open a global plan search with one tap (or keyboard shortcut) and find content across notes, itinerary items, places, and poll options — results show item type, title, and a context snippet
  2. Any member can pin a critical item (code, reservation, address) to the "Esenciales" panel at the top of the plan, and pinned items show their kind and open detail on tap
  3. A returning member sees an activity feed of what changed since their last visit, grouped by event type (X added, X voted, X changed)
  4. The activity feed marks items as read once viewed so the badge accurately reflects "new since you" — addressing the WhatsApp scroll-graveyard pain head-on
**Plans:** TBD
**UI hint:** yes

### Phase 7: Day-of Mode, PWA & Public Launch
**Goal:** The wedge proof — a member arriving at the airport with spotty wifi can open the app and see what's now, what's pinned, and the trip info still loads. Plus i18n scaffolding and a public landing that explains the product.
**Mode:** mvp
**Depends on:** Phase 6
**Requirements:** DAYOF-01, DAYOF-02, DAYOF-03, DAYOF-04, I18N-01, I18N-02, I18N-03, LAND-01, LAND-02, LAND-03, LAND-04
**Success Criteria** (what must be TRUE):
  1. A member can open a "modo evento" mobile view that surfaces today's itinerary items at the top with pinned essentials prominently above them
  2. A previously-loaded plan still opens and reads (itinerary, places, notes) when the device is offline, with a clear "offline copy" banner
  3. The app is installable as a PWA (manifest, service worker, icon) on Android and iOS (Safari Share → Add to Home Screen)
  4. The entire UI ships in neutral Spanish with no hardcoded strings (next-intl scaffolding), and dates/times/numbers format to the viewer's locale
  5. A public landing at `/` explains the wedge ("Nunca más pierdas la reserva en el chat"), has CTA to create a plan, OG tags for WhatsApp/Twitter previews, hero + how-it-works + features + FAQ, and scores ≥90 on Lighthouse mobile (perf/a11y/SEO)
**Plans:** TBD
**UI hint:** yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Spine & Plan Lifecycle | 1/6 | In Progress|  |
| 2. Itinerary | 0/0 | Not started | - |
| 3. Map & Places | 0/0 | Not started | - |
| 4. Voting & Decisions | 0/0 | Not started | - |
| 5. Notes, Files & URL Unfurl | 0/0 | Not started | - |
| 6. Findability Trinity | 0/0 | Not started | - |
| 7. Day-of Mode, PWA & Public Launch | 0/0 | Not started | - |

## Coverage

All 51 v1 requirements mapped to exactly one phase. No orphans. (AUTH-03 deferred to v2 during Phase 1 discuss-phase — see REQUIREMENTS.md.)

- Phase 1: 11 requirements (AUTH x5, PLAN x6)
- Phase 2: 5 requirements (ITIN x5)
- Phase 3: 5 requirements (MAP x5)
- Phase 4: 6 requirements (VOTE x6)
- Phase 5: 6 requirements (NOTE x5, VIRAL x1)
- Phase 6: 7 requirements (FIND x7)
- Phase 7: 11 requirements (DAYOF x4, I18N x3, LAND x4)

## Notes for Plan-Phase

- **Phase 1 is the spine.** Even though MVP-mode phases ship vertical slices, the spine's vertical slice is intentionally thin (create + share + view) — the security/auth/permission integration risk is the highest in the project and must be proven before any pretty UI.
- **Phase 1 pitfall ownership:** CP-1 (weakest-link adoption via hybrid auth), HP-6 (token security: 128+ bit nanoid, strict referrer policy, noindex, rate-limit), HP-1 (lock MapLibre + free tiles as the map decision — no Google Maps), HP-2 (Supabase Storage default, Vercel Spend Management cap), MP-3 (pseudonymization-friendly user_id from day 1), CP-4 (plan creation flow needs empty-state UX from the start).
- **Phases 2–5 are parallelizable** in principle (independent data models, shared RLS pattern). For a solo dev they will likely execute sequentially, but plans should be written so any order is viable.
- **Phase 5 contains the URL unfurl magic moment** (VIRAL-01). Plan-phase should consider whether the unfurl pipeline ships once and is reused in Phase 2 itinerary place links — recommend yes.
- **Phase 6 is the wedge phase.** It cannot ship before Phases 2–5 because the trinity depends on having content (notes/items/places/votes) to search, pin, and feed activity from. This is the phase where the product's headline ("Nunca más pierdas la reserva en el chat") becomes literally true.
- **Phase 7 is cross-cutting polish.** PWA install + offline cache + i18n + landing all layer on top of stable surfaces. Notification overload (CP-5/HP-5) is mitigated by NOT shipping push in v1 — the activity feed from Phase 6 covers the "what's new" need without notification fatigue risk.
- **Research flags for plan-phase:** Phase 4 (Supabase linkIdentity UX at vote time), Phase 5 (URL unfurl pipeline + Airbnb/Booking anti-scraping fallback), Phase 7 (iOS Safari + Supabase OAuth in PWA standalone mode quirks).

---
*Roadmap created: 2026-05-20*
