# Walking Skeleton — GroupCoordinator

**Phase:** 1
**Generated:** 2026-05-22

## Capability Proven End-to-End

A guest opens `/i/[token]` (anonymous), gets an anonymous Supabase session with `plan_id` JWT claim, lands on `/plan/[slug]`, and sees a seeded plan title + creator + member list — proving Next.js routing + Supabase Auth + Drizzle schema + RLS policies + Custom Access Token Hook + next-intl scaffold all work together end-to-end. This is the spine that every later vertical slice (itinerary, map, votes, notes) inherits without modification.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15.5 App Router + TypeScript + Tailwind v4 (Geist Sans/Mono via `next/font/google`) | Locked in `.planning/research/STACK.md`; App Router required for RSC + server actions + `next/og`; `src/` directory + `@/*` alias per `pnpm create next-app` flags in RESEARCH §Area 5 step 1 |
| Data layer | Postgres (Supabase) + Drizzle ORM 0.36+ for schema/queries + raw SQL files for RLS policies (`supabase/policies/*.sql`) | D-15, D-18; RESEARCH §Area 3 confirms Drizzle owns DDL, raw SQL owns RLS — never mixed |
| Auth | Supabase Auth: Google OAuth (D-16) + anonymous sign-in with `plan_id` claim injected by `public.custom_access_token_hook` PL/pgSQL function reading from `app_metadata` (server-only); session via `@supabase/ssr` cookie | D-01, D-11, D-18, D-19, D-21; RESEARCH §Area 1 specifies the hook is required because `signInAnonymously({ data })` writes to `raw_user_meta_data` (user-editable, not in JWT) |
| Deployment target | Vercel Hobby (dev) with Spend Management cap at 80% (D-23, HP-2); local dev via `supabase start` (Docker) + `pnpm dev` | D-23; HP-2 cost cap; Supabase Pro deferred to public launch (Phase 7) |
| Directory layout | `src/app/[locale]/(marketing)`, `src/app/[locale]/(app)`, `src/app/api/`, `src/components/{plan,ui}/`, `src/lib/{supabase,auth,i18n,validation}/`, `src/server/actions/`, `drizzle/{schema.ts,db.ts,migrations/}`, `supabase/{migrations,policies,seed.sql}` | ARCHITECTURE.md §Recommended Project Structure; route groups separate marketing chrome from app chrome |
| i18n | next-intl with `[locale]` segment, `localePrefix: 'as-needed'`, `defaultLocale: 'es'`; `es.json` populated from UI-SPEC microcopy catalog; `en.json` and `pt.json` stubbed (copy of `es.json`) | D-20; UI-SPEC §Microcopy Catalog; no hardcoded strings (Biome rule enforces) |
| UI library | shadcn/ui (New York, Zinc base, CSS variables) + Radix primitives + lucide-react; emerald-700 accent (`#047857`), emerald-600 focus ring (`#059669`) | UI-SPEC.md design tokens; shadcn components installed at bootstrap: button card dialog form input label select sonner tabs toast tooltip dropdown-menu avatar badge command sheet |
| Token strategy | nanoid `customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 22)` for invite tokens (128+ bits, no-lookalike); `customAlphabet(0-9a-z, 8)` for plan slugs; soft-delete via `revoked_at`/`archived_at` | D-05, D-22, HP-6; never `Math.random` |
| Locale prefix for `/i/[token]` | Lives OUTSIDE `[locale]` — at `src/app/api/invite/[token]/route.ts` (no localized UI before redirect, per RESEARCH §Open Question 4) | Routing isolation: token resolution is API logic, not user-facing locale content |

## Stack Touched in Phase 1

- [x] Project scaffold — `pnpm create next-app@15.5` + Biome + Drizzle + Supabase CLI + next-intl + shadcn init + Vitest + Playwright (all in Plan 01-01)
- [x] Routing — `/` (marketing skeleton), `/plan/new`, `/plan/[slug]`, `/plan/[slug]/settings`, `/me`, `/auth/sign-in`, `/auth/callback`, `/api/invite/[token]`, `/api/og/[plan_slug]`
- [x] Database — Drizzle migrations create `plans`, `plan_members`, `invite_tokens`; seed.sql inserts one test plan; `createPlan` Server Action does real INSERT; plan-view route does real SELECT through RLS
- [x] UI — `/plan/new` form (POST → Server Action), share dialog (Web Share API), sign-in bottom sheet (Google OAuth click), member chip list (server-rendered from RLS-filtered query)
- [x] Deployment — Local: `pnpm supabase start && pnpm dev` runs the full stack; Vercel: documented in 01-01 as part of `.env.local` + env-var contract (actual Vercel deploy can ship after Phase 1 via `vercel link`)

## Out of Scope (Deferred to Later Slices)

These are NOT in the skeleton. The skeleton must work without them, and they layer on top without altering the architectural decisions above.

- **Itinerary, map, votes, notes, files, search, pinning, activity feed** — Phases 2–6 surfaces. Phase 1 plan view shows only title + dates + creator + member list + empty-state copy (D-08).
- **Apple OAuth / magic-link / email-password auth** — AUTH-03 deferred to v2 (D-16, D-17).
- **Realtime subscriptions** — Polling-by-default per STACK.md; Realtime opt-in per surface in Phase 2/4.
- **Supabase Storage uploads** — D-23 explicitly excludes Storage from Phase 1. Phase 5 NOTE-03 owns this.
- **PWA install prompt / service worker / offline cache** — Phase 7 polish (HP-4 mitigation).
- **Visual logo / illustrations / marketing landing sections** — Surface 8 is the bare skeleton only (`<Logo size="lg" />` + tagline + CTA + footer); LAND-01..04 ships in Phase 7.
- **Translated `en.json` / `pt.json`** — D-20: stubbed with Spanish content in Phase 1; translation is a Phase 7 task.
- **`plan_revocations` immediate-kick table** — Only built if a leak case demands it (deferred per CONTEXT §Deferred Ideas).
- **Pending-action intent replay across OAuth** — D-12: no replay in Phase 1 (no edit/vote surfaces yet).
- **Role promotion / co-organizer flow** — Phase 2 (CP-5 mitigation).
- **Soft-deleted plan restore UI** — Phase 7+ (data model already supports it via `archived_at`).
- **Hard delete** — Never in v1; "Eliminar plan" sets `archived_at` (RESEARCH §Open Question 5).
- **Vercel Edge rate-limit with Upstash Redis** — Phase 1 uses an in-memory token bucket on `/api/invite/[token]` as a placeholder (HP-6 mitigation); Upstash upgrade is documented for Phase 7 public launch.

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering the architectural decisions above.

- **Phase 2: Itinerary** — Adds `itinerary_items` table + RLS + `/plan/[slug]/itinerary` route + add/edit/delete server actions + co-organizer role promotion.
- **Phase 3: Map & Places** — Adds `places` table + RLS + `/plan/[slug]/map` route + MapLibre client island + place add/edit flows.
- **Phase 4: Voting & Decisions** — Adds `polls`, `poll_options`, `votes` tables + RLS + `/plan/[slug]/votes` route + linkIdentity UX at vote time (research flag from ROADMAP).
- **Phase 5: Notes, Files & URL Unfurl** — Adds `notes` table + RLS + Supabase Storage + signed-URL upload pipeline + URL unfurl service + `/plan/[slug]/notes` route.
- **Phase 6: Findability Trinity** — Adds search index + pinned-essentials + activity-feed tables + the three findability surfaces.
- **Phase 7: Day-of Mode, PWA & Public Launch** — Adds service worker + PWA manifest + offline cache + full marketing landing + `en.json`/`pt.json` translation + Apple OAuth contingency if telemetry warrants.

---

*This document is the architectural contract. Any later phase that needs to alter a decision in §Architectural Decisions must surface that as a discuss-phase question, not a silent change.*
