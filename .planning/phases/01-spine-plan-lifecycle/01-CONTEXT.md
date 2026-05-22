# Phase 1: Spine & Plan Lifecycle - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

End-to-end vertical slice of the auth + permission spine: a signed-in owner creates a plan, mints a multi-token invite link, shares it; a link-visiting guest gets an anonymous Supabase session with a `plan_id` JWT claim and views the plan read-only; the guest can OAuth-upgrade (Google) without losing context and is auto-joined to `plan_members` with the role dictated by the token. Owner can revoke/regenerate tokens and archive/delete the plan. Postgres RLS is the single source of permission truth for every query path.

**In scope (Phase 1 only):** auth (Google OAuth + anonymous sessions + `linkIdentity` upgrade), `plans` / `plan_members` / `invite_tokens` schema with full RLS, plan create/view/share/revoke/archive/delete, `/i/[token]` → `/plan/[slug]` flow, "My plans" list, dynamic OG preview image for share links, empty-state guest view, next-intl scaffold (Spanish catalog only).

**Out of scope (handled in later phases):** Apple OAuth (AUTH-03 deferred — see Deferred Ideas), magic-link email auth, itinerary (Phase 2), map (Phase 3), voting (Phase 4), notes/files/unfurl (Phase 5), search/pinning/feed (Phase 6), PWA install + offline + landing (Phase 7), realtime (none in v1 default), Supabase Storage uploads (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Token & Invite Link Strategy
- **D-01:** Share link form is `/i/[token]` (short, opaque) which validates the token in `/api/invite/[token]/route.ts`, mints a Supabase anonymous session with `plan_id` custom claim, and 302s to `/plan/[slug]`. Middleware also accepts `/plan/[slug]?t=[token]` as a fallback path (same handler).
- **D-02:** A plan can have **multiple active invite tokens** (one row per token in `invite_tokens`, N:1 to `plans`). Owner can mint per-channel ("WhatsApp link", "email link") and revoke each independently. UI surfaces usage stats per token (created date, use count) and a per-token revoke action.
- **D-03:** Invite tokens **never expire by default**. Owner can optionally set an explicit `expires_at`. No automatic post-event expiration. Revocation is the owner-controlled mechanism for cutting access.
- **D-04:** When a token is revoked or regenerated, **existing anonymous sessions remain valid** until the Supabase cookie naturally expires (~1 week default). Future sign-ins via the revoked token fail at the `/api/invite/[token]` route. No `plan_revocations` table in v1.
- **D-05:** Token format: nanoid with no-lookalike alphabet, minimum 12 characters (~71 bits) — but use 22 chars (128+ bits) to align with PITFALLS HP-6 standard. Generate via `crypto.randomBytes`-backed nanoid, never `Math.random`.

### Plan Creation Flow & Empty State
- **D-06:** Plan creation requires **only a title**. `start_date`, `end_date`, and `description` are optional and editable post-create. This favors the wedge metric "setup en 30 segundos." (PLAN-01 still lists those fields — they're available, just not required.)
- **D-07:** After create, owner lands on the **plan view with a share dialog auto-opened**: a modal showing the copyable `/i/[token]` link, a "Copy link" button, and a "Share via..." button using the Web Share API (native share sheet on iOS/Android, fallback to copy on desktop).
- **D-08:** Guest opens an empty/sparse plan and sees: plan title, creator name + avatar, member list (if any joined), and a contextual line "{Creator} sigue agregando detalles. Vuelve pronto." Microcopy assumes the second visitor (PITFALLS CP-4). No grayed-out "Itinerary / Map / Notes" placeholders in v1 since those surfaces don't yet exist.
- **D-09:** OG share preview uses **dynamically generated images via Next.js `next/og`**, rendered from `/api/og/[plan_slug]/route.ts`. Image shows brand gradient + plan title (truncated) + "Creado por {name}" + date range (if set). Cached at the edge per Vercel default. The link shared in WhatsApp/iMessage is the marketing surface (MP-5).

### Anonymous → Authenticated Upgrade UX (AUTH-04)
- **D-10:** Sign-in entry uses a **bottom sheet** (shadcn `sheet` component, side="bottom") with one large "Continuar con Google" button. Tap triggers Supabase OAuth in a same-tab redirect.
- **D-11:** OAuth callback at `/auth/callback/route.ts` calls `linkIdentity()` to preserve the anonymous user_id, INSERTs `plan_members` (using the role from the invite_token via `joined_via_token_id`), then redirects back to the **same plan path the user came from** (encoded in the `next` query param at sign-in time). Scroll position preservation is best-effort via session storage but not required for correctness.
- **D-12:** **No pending-action replay** in v1. Phase 1 has no vote/edit surfaces, so there's no intent to replay. Future phases (4, 5) can add their own intent-persistence if needed; deferred.
- **D-13:** Role on auto-join is **whatever the invite_token specifies** (viewer or editor). The token row carries `role` at mint time; `plan_members.role` is copied from there at `linkIdentity` time. Owner is implicit `role='owner'` and never goes through this flow.
- **D-14:** Post-OAuth visual feedback: avatar + display name in the plan header replaces the "Iniciar sesión" affordance. No toast. The new affordances (edit, vote — which arrive in later phases) become visible without a banner. Account menu (logout, "My plans") is reachable from the avatar.

### Tooling
- **D-15:** **Drizzle ORM 0.36+** for the data access layer. Schema declared in TypeScript; migrations via `drizzle-kit generate` + `migrate`. Pairs cleanly with Supabase RLS because the policies are still raw SQL — Drizzle never abstracts them away. Drizzle Kit Studio for local DB inspection.
- **D-16:** **Google OAuth only** in Phase 1. AUTH-03 (Apple OAuth) is **deferred out of v1**. AUTH-02 is the only OAuth requirement that ships in this phase.
- **D-17:** Magic-link (email) auth is **not in Phase 1**. Hold for Phase 7 (polish) and revisit only if user data shows iOS users dropping off due to lack of Apple Sign In.

### Cross-Cutting (locked from research, restated for downstream agents)
- **D-18:** RLS is mandatory on every table from day 1. No `service_role` Supabase client is ever reachable from the browser. Service-role usage limited to migrations and (future) cron jobs.
- **D-19:** Anonymous link-viewers do NOT get a `plan_members` row. RLS for SELECT checks `(auth.jwt() ->> 'plan_id')::uuid = plans.id`. RLS for INSERT/UPDATE/DELETE checks `auth.uid() IN (SELECT user_id FROM plan_members WHERE plan_id = ?)`.
- **D-20:** next-intl scaffold lands in Phase 1: `[locale]` segment in App Router, Spanish-only catalog (`es.json`) populated, `en.json` + `pt.json` files created with stubbed/copied keys for future translation. No string is hardcoded in components. Lint rule (Biome or `eslint-plugin-i18next`) enforces this.
- **D-21:** User identity is keyed off a stable internal `user_id` (Supabase `auth.users.id`). Display name resolution happens at render time — supports MP-3 GDPR pseudonymization without schema migration.
- **D-22:** `noindex` meta on all `/plan/*` and `/i/*` paths. `robots.txt` Disallow on the same. `Referrer-Policy: strict-origin-when-cross-origin` site-wide. IP rate-limit on `/api/invite/[token]` for 404s (10/min/IP).
- **D-23:** Vercel Hobby tier deployment; Spend Management cap set to 80% of tolerance before public traffic. Supabase Storage is NOT used in Phase 1 — that's Phase 5.

### Claude's Discretion (downstream agents decide)
- Form library choice (react-hook-form + Zod is the locked stack default; planner can confirm).
- Exact slug length within nanoid (architecture says 8-char for plan slug; planner can decide between 8 and 10).
- Database client surface (server / browser / service-role triplet structure from ARCHITECTURE.md is the default; planner may adjust naming).
- Multiple-environment OAuth setup (per-environment OAuth apps with dynamic redirect via `NEXT_PUBLIC_SITE_URL` — STACK.md default).
- Exact wording of Spanish microcopy strings (planner/executor may iterate on tone).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-Level
- `.planning/PROJECT.md` — Wedge (Findability + Day-of + Spanish-first), core value, locked decisions, scope boundaries
- `.planning/REQUIREMENTS.md` — v1 requirements list, traceability to phases (AUTH-01..06 + PLAN-01..06 map to Phase 1; AUTH-03 deferred per D-16)
- `.planning/ROADMAP.md` §"Phase 1" — Phase 1 goal, requirements list, success criteria, build-order rationale, pitfall ownership
- `.planning/STATE.md` — current position, key decisions, open questions resolved here

### Stack & Architecture
- `.planning/research/STACK.md` — full stack lockdown: Next.js 15.5 (App Router), Supabase Auth + Postgres + (Storage/Realtime deferred), Drizzle 0.36+, shadcn/ui, next-intl, Zod, react-hook-form, TanStack Query, Biome, Playwright + Vitest
- `.planning/research/ARCHITECTURE.md` §"Permission Model" — the hybrid auth flow diagram and RLS-as-spine rationale (load-bearing for Phase 1)
- `.planning/research/ARCHITECTURE.md` §"Data Model" — `plans` / `plan_members` / `invite_tokens` table sketches with FK relationships
- `.planning/research/ARCHITECTURE.md` §"Routing Structure" — URL conventions for `/i/[token]`, `/plan/[slug]`, `/auth/callback`
- `.planning/research/ARCHITECTURE.md` §"Token Generation & Revocation" — nanoid alphabet + entropy + soft-delete semantics
- `.planning/research/ARCHITECTURE.md` §"Multi-Locale Architecture" — next-intl `[locale]` segment pattern

### Pitfalls Phase 1 Must Mitigate
- `.planning/research/PITFALLS.md` §CP-1 — Weakest-link adoption; hybrid auth is non-negotiable, view-only must be feature-complete
- `.planning/research/PITFALLS.md` §CP-4 — Empty-canvas first-run; empty plan UX (D-08) addresses this
- `.planning/research/PITFALLS.md` §CP-5 — Abandoned-plan recovery; basic owner controls in Phase 1, fuller role model in Phase 2
- `.planning/research/PITFALLS.md` §HP-6 — Anonymous-link token security; D-01, D-05, D-22 lock the mitigations
- `.planning/research/PITFALLS.md` §HP-7 — Doxxing / over-sharing; partially addressed via revocation, EXIF-stripping defers to Phase 5
- `.planning/research/PITFALLS.md` §HP-2 — Vercel bandwidth; Phase 1 has no uploads, but D-23 sets the Spend Management cap
- `.planning/research/PITFALLS.md` §MP-3 — GDPR pseudonymization architecture; D-21 establishes stable internal user_id from day 1
- `.planning/research/PITFALLS.md` §"Looks Done But Isn't Checklist" — verification anchor for Phase 1 done-criteria

### External (Supabase docs — for researcher follow-up)
- Supabase: Anonymous Sign-Ins — `linkIdentity` flow specifics for D-11
- Supabase: JWTs and custom claims — `plan_id` claim injection at anonymous sign-in (D-01)
- Supabase: Row Level Security guide — RLS policy patterns for D-18, D-19
- Next.js: `next/og` route — dynamic OG image generation for D-09
- next-intl: App Router setup — `[locale]` segment scaffold for D-20

### Research Synthesis
- `.planning/research/SUMMARY.md` — wedge + ICP + decisions overview (background only)
- `.planning/research/FEATURES.md` — feature taxonomy referenced when scoping later phases (not Phase 1 specific)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **None — greenfield project.** No existing code under the project root other than `.planning/`. Phase 1 will bootstrap the Next.js app structure described in `ARCHITECTURE.md §Recommended Project Structure`.

### Established Patterns
- The intended patterns are defined in research, not yet in code:
  - `lib/supabase/{server,browser,service-role}.ts` client triplet (ARCHITECTURE.md)
  - Server Actions in `server/actions/` per domain (STACK.md, ARCHITECTURE.md)
  - `[locale]` route segment with `(marketing)` and `(app)` route groups (ARCHITECTURE.md)
  - Zod schemas in `lib/validation/` shared client/server (STACK.md)
  - One RLS policy file per table under `supabase/policies/` (ARCHITECTURE.md)

### Integration Points
- **None yet.** Phase 1 IS the integration point that all later phases depend on. Planner should bootstrap the project skeleton (pnpm + Next.js 15.5 + TS + Tailwind v4 + Biome + Drizzle + Supabase CLI + next-intl + shadcn init + Playwright + Vitest) as the first plan, then layer schema + RLS + auth + routes on top.

</code_context>

<specifics>
## Specific Ideas

- The share modal that auto-opens after create (D-07) must include a "Compartir por WhatsApp" affordance using Web Share API. On non-supporting browsers (desktop Firefox), fall back to a "Copy link" button only.
- The `/i/[token]` redirect should set the session cookie BEFORE the 302 — Supabase SSR helpers handle this if used correctly. Researcher should confirm the exact `@supabase/ssr` invocation order.
- Plan slug visibility: even though the share link is `/i/[token]`, signed-in members access the plan directly at `/plan/[slug]`. The slug appears in their URL bar after the 302. This is acceptable — only the public share path hides it.
- The "My plans" list (PLAN-06) is a simple list ordered by `updated_at DESC` in v1. No archived/upcoming/past grouping yet — that's polish for a later phase.
- Archive vs delete (PLAN-05): soft-delete with `archived_at` timestamp. "Delete" in UI sets `archived_at`. No hard delete in v1; restore window implicit (forever until we add cron cleanup). Aligns with CP-5 recovery and CP-3 "plans are long-lived objects."
- E2E test critical-path for Phase 1 verification: create plan → mint token → open `/i/[token]` in incognito → see plan name + member list → sign in via Google → land back on plan → see avatar in header.

</specifics>

<deferred>
## Deferred Ideas

### Capabilities removed from v1 scope
- **AUTH-03 (Apple OAuth)** — Removed from v1. Magic-link email auth is the contingency mitigation for iOS users, deferred to Phase 7 to ship only if telemetry shows iOS dropoff. **REQUIREMENTS.md needs an update to move AUTH-03 to v2 or Out of Scope.**

### Phase-2+ items that came up during Phase 1 discussion
- Pending-action intent replay (sessionStorage or `?pending=…`) — useful when Phase 4 voting / Phase 2-5 edit surfaces exist
- `plan_revocations` table for immediate-kick on token revoke — only if a user-reported leak case requires it
- Differentiated invite tokens (viewer vs editor as separate token rows) — schema supports it (token carries `role`), but v1 UI may default to a single viewer-class token
- Co-organizer / role promotion flow — Phase 2 (per PITFALLS CP-5 recommendation, before the role model gets painful to retrofit)
- Per-locale string translation for `en.json` / `pt.json` — Phase 7+
- Soft-deleted plan restore UI — Phase 7+ (data model in Phase 1 already supports it via `archived_at`)
- Audit log surface for plan changes ("Carlos removed X") — Phase 2 or later, addresses CP-5

### Not deferred — out of scope per PROJECT.md
- In-app chat / comments
- Email parsing (TripIt-style)
- Booking / payment integration
- Expense splitting (v2 candidate)
- Persistent groups across plans (v2 candidate)

</deferred>

---

*Phase: 01-Spine & Plan Lifecycle*
*Context gathered: 2026-05-22*
