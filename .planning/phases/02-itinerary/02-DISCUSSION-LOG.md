# Phase 2: Itinerary - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 02-itinerary
**Areas discussed:** Item shape & required fields, Edit permissions, Place coupling with Phase 3, Day grouping + empty days + time zone

---

## Area 1 — Item shape + required fields

### Q1.1 — Temporal precision of items

| Option | Description | Selected |
|--------|-------------|----------|
| Date + time obligatorios | `scheduled_at TIMESTAMPTZ NOT NULL`; single date+time picker; items "sin hora" model an arbitrary anchor | ✓ |
| Date obligatorio, time opcional | `scheduled_date DATE NOT NULL` + `scheduled_time TIME NULL`; group sin-hora items at day header | |
| Ambas opcionales | Both nullable; separate "pendientes sin fecha" section; pisa scope con to-do general | |

**User's choice:** Date + time obligatorios
**Notes:** Stricter schema, simpler UI. → D-24.

### Q1.2 — Notes format and length

| Option | Description | Selected |
|--------|-------------|----------|
| Plain text + URL auto-link, max 2000 chars | Render preserves line breaks; URLs become clickable; supports findability wedge | ✓ |
| Plain text simple, max 2000 chars | URLs stay literal; anti-findability | |
| Markdown completo, max 2000 chars | Overkill for mobile LATAM users; needs sanitization | |
| Plain + autolink, sin límite | Risk of payload abuse | |

**User's choice:** Plain text + URL auto-linkification, 2000 chars
**Notes:** → D-25.

### Q1.3 — Item fields beyond ITIN-01's canonical four

| Option | Description | Selected |
|--------|-------------|----------|
| Solo los 4 de ITIN-01 (+ created_by) | Strict spec match | |
| Add `duration_minutes` | "Tour 14:00–18:00" expressivity | |
| Add `category` (transport/food/activity/other) | Useful for findability filters | |
| Add both | Maximum richness, MVP weight | |

**User's choice:** Free-text — "Agregar categoría pero el sistema identificará en automático esto, basándose en title o descripción, si no lo identifica, se queda vacío"
**Notes:** Category column accepted but with auto-detection. Drove the follow-up Q1.4 to lock the detection mechanism. → D-26, D-27.

### Q1.4 — Auto-detection mechanism for category

| Option | Description | Selected |
|--------|-------------|----------|
| Rule-based keyword matcher (es/en/pt) | Cheap, deterministic, no API dependency | ✓ |
| LLM (Claude Haiku) in background | Better semantic coverage; introduces API cost + latency + dep | |
| Hybrid (rules first, LLM fallback) | Most complex to build + debug | |
| Defer auto-detect to Phase 6 | Phase 2 ships manual dropdown only | |

**User's choice:** Rule-based keyword matcher
**Notes:** No external AI dependency in Phase 2. Keyword tables live in `src/lib/itinerary/categorize.ts`. → D-26 (mechanism), D-37 (i18n keys cover the category labels in 3 locales).

---

## Area 2 — Edit permissions / who mutates items

### Q2.1 — Role × item action matrix

| Option | Description | Selected |
|--------|-------------|----------|
| Wiki abierto: editor + owner all CRUD | Simplest RLS, matches "wiki colaborativo" framing | ✓ |
| Creator-strict: editor edits/deletes only their own | Defensive; introduces fricción for fixing typos | |
| Editor mixto: all edit, only creator+owner delete | Balanced; more RLS code | |
| Viewer can also create/edit own | Maximizes collaboration; breaks viewer = read-only semantics | |

**User's choice:** Wiki abierto
**Notes:** → D-28, D-29.

### Q2.2 — Delete model

| Option | Description | Selected |
|--------|-------------|----------|
| Hard delete | Schema simpler; items are short-lived & low-stakes | ✓ |
| Soft delete (`deleted_at`) | Consistency with Phase 1 plans + tokens; complexity tax | |
| Soft + cron purge after 30d | Best of both with infra weight | |

**User's choice:** Hard delete
**Notes:** Inconsistent with Phase 1 patterns but proportionate to stakes. → D-30.

### Q2.3 — Attribution visibility

| Option | Description | Selected |
|--------|-------------|----------|
| "Agregado por {nombre}" | Single creator line; simple, gives accountability | ✓ |
| Creator + "Editado por X hace 2h" if edited | Richer; extra column + write logic | |
| Sin atribución | Cleaner UI; loses social signal in wiki mode | |

**User's choice:** "Agregado por {nombre}" only — no editor trail
**Notes:** → D-31.

---

## Area 3 — Place coupling with Phase 3

### Q3.1 — Schema for the place field today

| Option | Description | Selected |
|--------|-------------|----------|
| Dual column: `place_text` now; `place_id` added in Phase 3 | Backward-compatible, no destructive migration | ✓ |
| Single column with auto-migration in Phase 3 | Cleaner final state; geocoding complexity at migration time | |
| Single polymorphic JSONB column | Anti-pattern for relational data | |
| Let Phase 3 decide later | Defers the problem | |

**User's choice:** Dual column
**Notes:** Phase 3 owns the user-driven "promote text → place" UX. → D-32.

---

## Area 4 — Day grouping + time zone + range

### Q4.1 — Empty days handling

| Option | Description | Selected |
|--------|-------------|----------|
| Solo días con items | Compact mobile view; less scroll-without-payoff | ✓ |
| Todos los días del rango, vacíos con "Sin actividades" | Wedge alignment (encourages full planning); longer scroll | |
| Híbrido por fecha-or-no-fecha on plan | Branching UI logic | |

**User's choice:** Solo días con items
**Notes:** → D-33.

### Q4.2 — Time zone model

| Option | Description | Selected |
|--------|-------------|----------|
| Plan-level TZ (`plans.timezone`) | TripIt/Wanderlog pattern; one viaje = one huso | ✓ |
| User-local (viewer's browser TZ) | Confusing for cross-TZ coordination | |
| Naive timestamp | Breaks DST + international travel | |
| Detect from first item | Too magical | |

**User's choice:** Plan-level TZ
**Notes:** `plans.timezone TEXT NOT NULL DEFAULT 'America/Mexico_City'`; detect from browser at plan create; settable from Phase 1's Settings page. → D-34.

### Q4.3 — Out-of-range items

| Option | Description | Selected |
|--------|-------------|----------|
| Permitir cualquier fecha, sin sección separada | Maximum flexibility; captures pre-trip + post-trip items | ✓ |
| Permitir, sección "Antes / Después" separada | Better visual org; requires plan dates | |
| Bloquear con validación | Breaks "renovar pasaporte" case | |
| Permitir, sin separación visual (linear timeline) | Picked variant — chosen path | |

**User's choice:** Permitir cualquier fecha, sin sección separada (linear timeline)
**Notes:** → D-35.

### Q4.4 — Data-fetching pattern

| Option | Description | Selected |
|--------|-------------|----------|
| RSC + revalidatePath (Phase 1 pattern) | Consistent with shipped patterns; acceptable for 3–15 person groups | ✓ |
| RSC + TanStack Query (refetchOnWindowFocus) | Better cross-tab collaboration; pulls TanStack Query into bundle | |
| Supabase Realtime channel | Live updates; complicates RLS + Supabase config | |

**User's choice:** RSC + revalidatePath
**Notes:** Realtime explicitly deferred to Phase 6/7. → D-36.

---

## Claude's Discretion

(Areas where the user delegated to downstream agents — copied from CONTEXT.md "Claude's Discretion" section)

- Exact UI anatomy of the item card and day section header (defer to `/gsd-ui-phase 2` or planner)
- Drizzle relations vs hand-written joins for the item-list query
- Sheet (mobile) vs Dialog (desktop) for the create-item form
- Concrete set of keyword tokens per locale in `src/lib/itinerary/categorize.ts`
- Whether the timezone setter UI sits inside `PlanDetailsForm` or in a new `PlanTimezoneSection`

## Deferred Ideas

(Copied from CONTEXT.md "Deferred Ideas" section)

- LLM-based category fallback (Phase 6 reevaluation if findability needs it)
- `duration_minutes` / end-time on items
- Soft delete on items
- `last_edited_by` attribution
- Auto-migration of `place_text` → `places` in Phase 3
- Empty-days surfaced as "Sin actividades"
- TanStack Query for items
- Supabase Realtime channel for items
- Item-level TZ overrides
- Per-day inline create-item UX
- Manual reorder within a day
