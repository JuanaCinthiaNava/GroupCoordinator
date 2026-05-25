# Phase 2: Itinerary - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

End-to-end CRUD for the chronological day-by-day timeline of a plan. Editor + owner members can create, edit and delete itinerary items with title, scheduled date+time, optional place (text only — Phase 3 will add the FK to saved places), optional notes, and an auto-detected category. Anonymous link-viewers and `viewer` members see the timeline read-only. Items are grouped by day in plan-level time zone; only days that have items are rendered. Plans gain a `timezone` column with a sensible default. RLS on `itinerary_items` is the single permission source.

**In scope (Phase 2 only):** `itinerary_items` table + RLS, plans.timezone column, Server Actions for create/update/delete, Surface — day-grouped timeline RSC + create/edit form on `/plan/[slug]`, category rule-based keyword matcher (es/en/pt), category badge display, "Agregado por {name}" attribution line, integration + e2e tests aligned with Phase 1 patterns, next-intl strings for itinerary microcopy.

**Out of scope (handled in later phases):** Map / saved places (Phase 3 — `place_id` FK and geocoding), voting on items (Phase 4), file attachments / URL unfurl (Phase 5), search across items / pinning / activity feed (Phase 6), PWA offline reads for itinerary (Phase 7), Supabase Realtime live updates (Phase 6/7 if needed), LLM-based category fallback, item duration / end_time, "before/after trip" sections, per-day TZ overrides.

</domain>

<decisions>
## Implementation Decisions

### Item Shape (Area 1)

- **D-24:** `itinerary_items.scheduled_at TIMESTAMPTZ NOT NULL` — every item has a precise date+time. UI uses a unified date+time picker. Items where the user "doesn't care about exact time" are modeled by picking an arbitrary anchor (e.g. noon) — schema stays strict, UX stays simple.
- **D-25:** `itinerary_items.notes TEXT NULL`, max 2000 characters. Render is plain text with line breaks preserved AND URL auto-linkification (regex match on `https?://…`). No markdown rendering. Sanitize via project lint / Zod refinement (no raw HTML). Wedge alignment: links pasted into notes become clickable, supporting findability.
- **D-26:** Items get a `category` column — Postgres enum `transport | food | activity | other`, NULL allowed. Auto-detect happens server-side on every create / update via a **rule-based keyword matcher** in `src/lib/itinerary/categorize.ts`. Lookup tables per locale (`es` + `en` + `pt`) — examples: `cena|restaurante|comida|brunch` → food; `vuelo|taxi|uber|auto|check-?in|hotel` → transport; `tour|museo|playa|festival|concierto|paseo` → activity. If no keyword matches, category stays NULL. No LLM call, no API key, no latency cost. User can override manually via dropdown in the edit form.
- **D-27:** Columns of `itinerary_items` (final list):
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE`
  - `title TEXT NOT NULL` (max 200, mirrors plans.title via Zod)
  - `scheduled_at TIMESTAMPTZ NOT NULL`
  - `place_text TEXT NULL` (see D-30)
  - `notes TEXT NULL` (max 2000, see D-25)
  - `category itinerary_category NULL` (see D-26)
  - `created_by UUID NOT NULL REFERENCES auth.users(id)`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` (trigger as in Phase 1)
- No `last_edited_by`, no `duration_minutes`, no `category_confidence` — explicitly out of scope (see Deferred).

### Permissions & RLS (Area 2)

- **D-28:** Wiki-open permission model — any `editor` or `owner` member of the plan can INSERT, UPDATE, DELETE any item, regardless of who created it. `viewer` members and anonymous link-viewers (JWT `plan_id` claim only) get SELECT only. Aligns with PROJECT.md's "wiki colaborativo" intent and matches the simplest RLS shape.
- **D-29:** RLS policies on `itinerary_items` (mirroring Phase 1's table-policies-per-file pattern):
  - `items_select_anon_or_member` — SELECT for `(auth.jwt() ->> 'plan_id')::uuid = plan_id` OR `auth.uid() IN (SELECT user_id FROM plan_members WHERE plan_id = items.plan_id)`
  - `items_insert_editor_owner` — INSERT WITH CHECK `auth.uid() IN (SELECT user_id FROM plan_members WHERE plan_id = items.plan_id AND role IN ('editor','owner'))`
  - `items_update_editor_owner` — UPDATE USING same predicate (Postgres applies it to both row-being-updated and post-update)
  - `items_delete_editor_owner` — DELETE USING same predicate
  - No DELETE for `viewer`, no DELETE for anon. Service-role bypasses (server-only).
- **D-30:** **Hard delete.** `DELETE FROM itinerary_items WHERE id = ?` — no `deleted_at` column. Confirm dialog in UI prevents accidents. Inconsistent with Phase 1 soft-delete for plans and tokens (D-04/D-05), but appropriate: items are short-lived and low-stakes, no security / forensic value from preserving them.
- **D-31:** Attribution visible: each item card shows `created_by`'s display name + small avatar in a meta-line ("— Agregado por Cinthia"). No "last edited by" indicator (single attribution = simpler UX; if accountability ever needs an editor trail, a Phase 6/7 addition can introduce it).

### Place — Cross-Phase Coupling (Area 3)

- **D-32:** Phase 2 ships `place_text TEXT NULL` ONLY. Free-form string, no geocoding, no autocomplete, no validation beyond length cap (200 chars to match title). Phase 3 will introduce `places` table and add `place_id UUID NULL REFERENCES places(id)` to `itinerary_items` **as a sibling column** (NOT replacing `place_text`). When both are present, UI prefers `place_id`. Phase 3 owns the user-driven "promote text → saved place" UX. No Phase 2 work assumes geocoding will happen.

### Day Grouping, Time Zone, Range (Area 4)

- **D-33:** Timeline shows **only days that have items** — empty days inside a plan's `start_date..end_date` range are NOT rendered. Compact mobile layout, less scroll-without-payoff. Per-day "+ Agregar item" CTA can also live in the day-empty inline form when the timeline is fully empty.
- **D-34:** **Plan-level time zone.** Schema additions:
  - `ALTER TABLE plans ADD COLUMN timezone TEXT NOT NULL DEFAULT 'America/Mexico_City'` (migration `0003`). All existing dev plans inherit the default; safe because there are no production users.
  - On plan create, the browser's `Intl.DateTimeFormat().resolvedOptions().timeZone` is read in `CreatePlanForm` and submitted to the Server Action; if missing/invalid, the DB default applies.
  - Items: `scheduled_at TIMESTAMPTZ` stored in UTC; render conversion to `plans.timezone` happens in the RSC (`date-fns-tz` or `Intl.DateTimeFormat` with `timeZone` option).
  - Add a UI surface in Settings (Surface 6) to change the plan's timezone — Zod-validated against the IANA list. Implementation goes in Phase 2 because Phase 1's settings page exists and Phase 2 is the first feature that NEEDS plan TZ.
- **D-35:** Items are allowed at any `scheduled_at` — inside, before, or after the plan's date range. Timeline groups by day uniformly; "outside the range" is not visually treated. Captures "renovar pasaporte" (pre-trip) and "despedida en el aero" (post-trip) without special UI.
- **D-36:** Data-fetching pattern: **RSC + Server Actions + `revalidatePath`** — identical to Phase 1. The timeline is rendered server-side from a Drizzle/Supabase query joined on `plan_members` (for attribution names) and `plans.timezone` (for render). Mutations call `revalidatePath('/plan/[slug]')`. No TanStack Query in this phase. No Supabase Realtime channel in this phase. Trade-off acknowledged: simultaneous editors only see each other's changes on focus-driven refresh / navigation.

### Microcopy (Spanish-first, per D-20)

- **D-37:** All new strings go into `src/lib/i18n/messages/{es,en,pt}.json` under namespace `itinerary.*`. Keys cover: empty-state ("Todavía no hay actividades. Agrega la primera."), day header label format (e.g. "Lunes 6 de octubre"), category badges (`itinerary.category.transport` = "Transporte" / "Transport" / "Transporte"), the create/edit form labels and errors, attribution prefix ("Agregado por"), and the delete-confirm dialog. Linter (Biome) continues to reject hardcoded ES strings (D-20 invariant).

### Claude's Discretion (downstream agents decide)

- Exact UI anatomy of the item card and the day section header — defer to `/gsd-ui-phase 2` if/when that runs, or planner picks shadcn primitives that match Phase 1's visual rhythm.
- Whether to use Drizzle relations or hand-written joins for the item-list query.
- Whether the create-item form is a Sheet (mobile) or a Dialog (desktop) — planner can decide based on Phase 1's existing patterns.
- Exact set of category keywords per locale (the matcher exists; populating the lookup table is implementation detail).
- Whether the timezone setter in Phase 1's Settings page is added as a new Phase 2 task or rolled into the schema migration plan.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-Level
- `.planning/PROJECT.md` — core value (findability), wedge (Findability + Day-of + Spanish-first), v1 vs v2 boundaries, "modo wiki colaborativo" framing for permissions
- `.planning/REQUIREMENTS.md` ITIN-01..05 — full text of itinerary requirements with acceptance criteria
- `.planning/ROADMAP.md` §"Phase 2: Itinerary" — goal, requirements, success criteria, dependency on Phase 1
- `.planning/STATE.md` — current position, milestone progress, Phase 1 close-out signals

### Phase 1 Carry-Forward (loaded entirely — Phase 2 builds on top)
- `.planning/phases/01-spine-plan-lifecycle/01-CONTEXT.md` — D-01..D-23 invariants (Drizzle, RLS, Server Actions, shadcn, react-hook-form, next-intl, role enum, anon JWT claim shape)
- `.planning/phases/01-spine-plan-lifecycle/01-SKELETON.md` — file-tree layout to extend (`src/server/actions/`, `src/components/plan/`, `src/lib/db/queries/`, `supabase/policies/`, `drizzle/migrations/`)
- `.planning/phases/01-spine-plan-lifecycle/01-RESEARCH.md` — RLS patterns, Supabase client triplet, anon session shape, Server Action conventions
- `.planning/phases/01-spine-plan-lifecycle/01-VERIFICATION.md` — 7 follow-ups (5 fixed, 2 deferred); review before adding new code that touches `/me`, `safeNext`, or `createPlan`
- `.planning/phases/01-spine-plan-lifecycle/01-02-SUMMARY.md` — schema + RLS + auth hook actually shipped (authoritative for `plans`, `plan_members`, `invite_tokens` shapes)
- `.planning/phases/01-spine-plan-lifecycle/01-04-SUMMARY.md` — Server Action conventions (createPlan, ShareDialog, OG image route)
- `.planning/phases/01-spine-plan-lifecycle/01-06-SUMMARY.md` — settings page extension pattern (the timezone setter goes here)
- `.planning/phases/01-spine-plan-lifecycle/01-UI-SPEC.md` — visual rhythm (Surface 2/4/6), color tokens, typography scale that Phase 2's timeline must honor

### Stack & Architecture
- `.planning/research/STACK.md` — Next.js 15.5, Drizzle 0.36+, shadcn/ui, next-intl, Zod, react-hook-form, Biome, Playwright + Vitest. TanStack Query listed but NOT yet introduced — Phase 2 explicitly defers.
- `.planning/research/ARCHITECTURE.md` §"Permission Model" — RLS as single source of truth (Phase 2 follows identically for `itinerary_items`)
- `.planning/research/ARCHITECTURE.md` §"Data Model" — relationship between plans, plan_members, invite_tokens; `itinerary_items` joins via `plan_id`
- `.planning/research/ARCHITECTURE.md` §"Routing Structure" — `/plan/[slug]` already exists from Phase 1; Phase 2 extends the same RSC

### Pitfalls / Wedge
- `.planning/research/PITFALLS.md` — CP-1 (weakest-link adoption: viewer must see itinerary without account), CP-4 (empty-canvas first-run: empty-state messaging matters), CP-5 (notification overload: NO notifications added in this phase)
- `.planning/research/SUMMARY.md` — wedge locked, build-order rationale

### External (none for Phase 2)
- No external ADRs, design docs, or specs beyond the planning corpus above. Auto-categorization keyword tables are a Phase 2 implementation artifact (live in `src/lib/itinerary/categorize.ts`, not in planning docs).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`src/server/actions/plan.ts`** — exemplary Server Action shape (FormData → Zod safeParse → cookies → getRequiredUser → RLS-bound supabase server client → mutation → revalidatePath → typed error returns). Phase 2's `src/server/actions/itinerary.ts` follows the same shape (createItem, updateItem, deleteItem).
- **`src/server/actions/invite-token.ts`** — pattern for soft delete on tokens; Phase 2 specifically does NOT mirror this (hard delete per D-30) but the file shows the conventions for action arity, error envelope, and revalidatePath calls.
- **`src/lib/supabase/server.ts`** — `createServerClient(cookieStore)` is the RLS-bound client every Server Action and RSC uses. Phase 2 imports this everywhere; the service-role client (`src/lib/supabase/service-role.ts`) is NEVER imported from Phase 2 surfaces.
- **`src/lib/auth/require-user.ts`** — `getRequiredUser(cookieStore, nextPath)` already enforces AUTH-06 on mutations. Phase 2 itinerary mutations call this with `'/plan/[slug]'` as the next path.
- **`src/lib/validation/plan.ts`** — Zod schema conventions (title length 200, optional date strings, optional description max 1000). Phase 2 adds `src/lib/validation/itinerary.ts` with the same conventions and reuses error message style.
- **`src/lib/db/queries/plans.ts`** — existing `getPlanBySlug` shows the RLS-bound read pattern Phase 2 will mirror in `src/lib/db/queries/itinerary.ts` (e.g. `getItineraryByPlan(planId)`).
- **`src/components/plan/CreatePlanForm.tsx`** — react-hook-form + zodResolver + Server Action invocation pattern. Phase 2's `ItemForm.tsx` follows the same shape with the addition of a date+time field.
- **`src/components/plan/EmptyPlanState.tsx`** — pattern for empty-state surfaces; itinerary's "todavía no hay actividades" empty state mirrors this.
- **`src/components/plan/PlanHeader.tsx`** + **`src/components/plan/MemberChipList.tsx`** — patterns for compact mobile-first headers with member chips; useful for the day-section header design.
- **`tests/integration/_helpers.ts`** — Supabase env-guarded skip-or-run pattern; Phase 2 integration tests adopt verbatim.
- **`tests/integration/create-plan.test.ts`** — model for "Server Action + DB-state probe" integration tests (Phase 2 needs equivalents for createItem / updateItem / deleteItem and RLS surface tests).

### Established Patterns

- **One Server Actions file per domain** (`plan.ts`, `invite-token.ts`) → Phase 2 introduces `itinerary.ts`.
- **One RLS policy file per table** (`supabase/policies/plans.sql`, `plan_members.sql`, `invite_tokens.sql`) → Phase 2 adds `supabase/policies/itinerary_items.sql`.
- **Drizzle migration filename = `{NNNN}_{description}.sql`** (e.g. `0001_init.sql`, `0002_invite_token_name.sql`). Phase 2 produces `0003_itinerary.sql` (and possibly `0004_plan_timezone.sql` if split, or combined). Single combined migration is preferable — fewer migrations to apply.
- **Zod schemas in `src/lib/validation/`**; one file per domain.
- **i18n keys hierarchical** (`auth.sign_in_descriptor`, `plan.share_dialog_title`). Phase 2 adds namespace `itinerary.*`.
- **`SignInSheetBody`** (post-Phase 1 refactor) shows the prefer-extract-shared-content-from-multiple-callers pattern. Phase 2 should default to inline components unless a duplication threshold is hit.
- **revalidatePath after every successful Server Action mutation** — non-negotiable invariant.
- **Test posture**: unit tests for pure logic (the rule-based categorize will need one), integration tests skip-cleanly without Supabase env, e2e tests guard-and-skip without a running stack.

### Integration Points

- **`src/app/[locale]/(app)/plan/[slug]/page.tsx`** — currently renders PlanHeader + PlanHero + EmptyPlanState. Phase 2 will add an `<ItineraryList planId={plan.id} timezone={plan.timezone} />` slot between PlanHero and EmptyPlanState (or replace EmptyPlanState contingent on item count).
- **`src/components/plan/PlanHeader.tsx`** — owner gets the settings gear. Phase 2 does not modify this surface.
- **`src/app/[locale]/(app)/plan/[slug]/settings/page.tsx`** — currently renders PlanDetailsForm + InviteTokensSection + PlanStatusSection. Phase 2 should EITHER extend PlanDetailsForm to include the timezone selector OR add a new `<PlanTimezoneSection />`. Planner's discretion.
- **`drizzle/schema.ts`** — Phase 2 adds `itineraryItems` table + `itineraryCategoryEnum`, and a `timezone` column on the existing `plans` declaration.
- **`src/lib/i18n/messages/{es,en,pt}.json`** — three files updated in lockstep with all new namespace `itinerary.*` keys.
- **`supabase/seed.sql`** — Phase 2's RLS integration tests will need at least one seeded item (for the SELECT-as-member path). Add seed items keyed off the existing seeded test plan + owner from Phase 1.

</code_context>

<specifics>
## Specific Ideas

- The user picked `Cinthia Nava` as the display name they want surfaced in attribution lines — the Phase 1 `/me` dashboard already reads the display name from `auth.users.raw_user_meta_data->>'full_name'`, and Phase 2 mirrors this.
- User repeatedly chose the "Recommended" (simpler) option across all 12 sub-questions — bias the planner toward minimal scope, NOT toward speculative extensibility (don't add `category_confidence`, don't preemptively wire TanStack Query, don't pre-build an "undo" buffer for deletes).
- User explicitly chose category auto-detect via rule-based keyword matcher when they could have picked manual-only — this is a hint that the user cares about "magic that just works" UX without taking on AI dependencies. Tune the keyword tables for the LATAM travel domain (Spanish/Portuguese travel verbs + nouns are higher priority than English).

</specifics>

<deferred>
## Deferred Ideas

- **LLM-based category fallback** (Q1.4 option B/C) — explicitly out of Phase 2. Re-evaluate in Phase 6 if findability needs richer classification.
- **`duration_minutes` / `end_time` on items** (Q1.3 option B) — out of Phase 2. Multi-hour events are modeled as two items today. Re-evaluate in Phase 6/7 if user data shows people splitting tour-like items.
- **Soft delete on items** (Q2.2 option B/C) — out of Phase 2. Hard delete with confirm dialog. Re-evaluate if accidental delete becomes a real complaint.
- **`last_edited_by` attribution** (Q2.3 option B) — out of Phase 2. Single "Agregado por" line only.
- **Auto-migration of `place_text` → `places` rows in Phase 3** — explicitly deferred to Phase 3's discuss. Phase 2 ships `place_text` standalone; Phase 3 owns the user-driven upgrade UX.
- **Empty days in the range surfaced as `Sin actividades`** (Q4.1 option B) — out of Phase 2. Only days with items render.
- **TanStack Query for items list** (Q4.4 option B) — out of Phase 2. RSC + revalidatePath is the pattern.
- **Supabase Realtime channel for items** (Q4.4 option C) — out of Phase 2. Evaluated for Phase 6/7 if collaboration friction becomes real.
- **Item-level TZ overrides** — out of Phase 2. Plan-level TZ only.
- **Per-day inline create item UX (vs single global form)** — leave to UI-SPEC / planner discretion.
- **Reorder items manually within a day** — out of Phase 2. Order is purely `scheduled_at ASC, created_at ASC`.

</deferred>

---

*Phase: 02-itinerary*
*Context gathered: 2026-05-25*
