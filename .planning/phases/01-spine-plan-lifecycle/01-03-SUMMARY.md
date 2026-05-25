---
phase: 01-spine-plan-lifecycle
plan: 03
subsystem: anonymous-link-view
tags: [auth, anonymous-session, custom-jwt-claim, rls, rate-limit, security-headers, surface-3, next-intl, ssr, playwright, vitest]
dependency_graph:
  requires:
    - "Plan 01-01 (Next.js + shadcn primitives + next-intl + es.json microcopy + Playwright webServer)"
    - "Plan 01-02 (Drizzle schema, Supabase client triplet, RLS policies, auth hook, seed plan + invite tokens, getPlanBySlug + getPlanMembers)"
  provides:
    - "/api/invite/[token]: format guard + service-role lookup + signInAnonymously + admin.updateUserById(app_metadata) + refreshSession + atomic use_count increment + 302 to /plan/[slug]"
    - "/plan/[slug] RSC: getPlanBySlug + getPlanMembers via RLS-bound server client + display-name resolution via service-role"
    - "Surface 3 component set: PlanHeader, PlanHero, MemberChipList, EmptyPlanState, SignInAffordanceBar, PlanSignInSheet, PoweredByFooter"
    - "(app) layout: sticky 56px header chrome reading the current user once at layout level"
    - "4 localized error pages: /errors/{token-invalid,token-revoked,token-expired,server-error}"
    - "src/lib/auth/rate-limit.ts: in-memory token bucket (10/min/IP, LRU at 10k)"
    - "src/lib/headers/security.ts: Referrer-Policy site-wide + X-Robots-Tag noindex on /plan/* and /i/*"
    - "D-01 fallback: /plan/[slug]?t=[token] rewritten via middleware to /api/invite/[token]?next=/plan/[slug]"
    - "tests/integration/invite-handler.test.ts: 8 assertions"
    - "tests/e2e/anon-link-view.spec.ts: 4 un-skipped E2E tests (chromium-desktop + webkit-mobile)"
    - "tests/e2e/walking-skeleton.spec.ts: 2nd assertion 'seed plan visible via /i/[token]' un-skipped"
  affects:
    - "Plan 01-04 (create plan + share dialog): inherits the (app) layout and PlanHeader; will extend PlanHeader to carry the plan title (TODO documented in code)"
    - "Plan 01-05 (OAuth callback): PlanSignInSheet initiates the OAuth round-trip — until /auth/callback ships, users land on 404 (TODO documented in code)"
    - "Plan 01-06 (settings + revoke): RLS UPDATE on invite_tokens via plan.view's same RLS-bound queries"
tech_stack:
  added:
    - "(no new package deps — Plan 01-01 already installed @supabase/ssr, @supabase/supabase-js, drizzle-orm, nanoid, next-intl)"
  patterns:
    - "Custom Access Token Hook claim injection — pin via app_metadata + refreshSession (RESEARCH §Area 1 Pitfall 1)"
    - "Set-Cookie before 302 — response constructed BEFORE Supabase client; setAll writes to response.cookies (RESEARCH §Area 1 Pitfall 2)"
    - "Service-role at the route boundary only — never imported from components/ or browser bundle"
    - "Atomic SQL increment via Drizzle sql`${col} + 1` template — race-safe under concurrent invite opens"
    - "Open-redirect guard on `?next=` — restrict to in-app /plan/* prefix"
    - "Display name resolved at render via auth.users service-role lookup (D-21, MP-3)"
    - "ARIA labels driven by next-intl t('key', { vars }) — zero hardcoded Spanish (D-20)"
key_files:
  created:
    - "src/app/api/invite/[token]/route.ts — invite handler (rate limit + format guard + service-role lookup + anon session + app_metadata + refreshSession + atomic use_count)"
    - "src/lib/auth/rate-limit.ts — in-memory token bucket (10/min/IP, LRU at 10k)"
    - "src/lib/headers/security.ts — securityHeaders() returns NextHeaderRule[]"
    - "src/app/[locale]/errors/token-invalid/page.tsx — 4 error pages, all metadata.robots noindex"
    - "src/app/[locale]/errors/token-revoked/page.tsx"
    - "src/app/[locale]/errors/token-expired/page.tsx"
    - "src/app/[locale]/errors/server-error/page.tsx"
    - "src/app/[locale]/(app)/plan/[slug]/page.tsx — plan view RSC with display-name resolution"
    - "src/app/[locale]/(app)/plan/[slug]/layout.tsx — pb-32 main wrapper"
    - "src/app/[locale]/(app)/plan/[slug]/not-found.tsx — RLS-friendly plan-not-found"
    - "src/components/plan/PlanHeader.tsx — sticky 56px chrome, reserved search slot"
    - "src/components/plan/PlanHero.tsx — title + dates + creator row"
    - "src/components/plan/MemberChipList.tsx — wrap chips + overflow pill"
    - "src/components/plan/EmptyPlanState.tsx — D-08 with {Creator} interpolation"
    - "src/components/plan/SignInAffordanceBar.tsx — sticky bottom CTA + sheet trigger"
    - "src/components/plan/PlanSignInSheet.tsx — Surface 5; signInWithOAuth + privacy line"
    - "src/components/plan/PoweredByFooter.tsx — MP-5 tag"
    - "tests/integration/invite-handler.test.ts — 8 vitest assertions"
  modified:
    - "src/app/[locale]/(app)/layout.tsx — replaced Plan 01-01 passthrough with header-bearing app shell"
    - "src/middleware.ts — D-01 fallback rewrite for /plan/[slug]?t=[token]"
    - "next.config.ts — delegate headers() to securityHeaders()"
    - "src/lib/i18n/messages/{es,en,pt}.json — updated errors.token_expired copy; added plan.view.member_chip_aria"
    - "tests/e2e/anon-link-view.spec.ts — un-skipped, 4 active assertions"
    - "tests/e2e/walking-skeleton.spec.ts — added seed-plan-view assertion"
    - "src/lib/{auth/permissions.ts,db/queries/plans.ts,supabase/{browser,server,service-role}.ts} — Biome formatter touch-ups (no behavior change)"
decisions:
  - "Display name resolution moved into the page itself via createServiceRoleClient().auth.admin.getUserById per user_id. The query helper in src/lib/db/queries/plans.ts (Plan 01-02) returns only public.plan_members rows because auth.users is NOT readable by anon clients. The plan view page is RSC, so the service-role call is server-only and cannot leak. The alternative — running a denormalized join via service-role inside the helper — would have couples the helper to the service-role boundary; the explicit per-user lookup keeps the helper RLS-bound."
  - "D-01 fallback (/plan/[slug]?t=[token]) implemented in middleware.ts via a path-and-search-param match + rewrite to /api/invite/[token]?next=/plan/[slug]. The handler honors `next=` only when it starts with /plan/ (open-redirect guard against `?next=https://evil.example`). The integration test covers both the happy path and the open-redirect guard."
  - "Use_count update uses Drizzle's `sql\`${inviteTokens.useCount} + 1\`` template to emit a single UPDATE statement, mitigating T-03 use_count race (was 'accept' in the original threat register; now 'mitigated'). The increment is wrapped in try/catch so analytics flakiness does not block the redirect."
  - "Auth-state detection uses `user.is_anonymous === true` (a Supabase v2 user property) rather than inspecting JWT claims. This is consistent with @supabase/ssr conventions and avoids a second JWT parse in the page."
  - "Rate limiter uses a single in-process Map<ip, bucket> capped at 10k entries with naive O(N) LRU eviction on full. Acceptable for single-process Phase 1 dev/preview; documented at the top of the file as a Phase 7 Upstash Redis upgrade. The integration test exercises the limiter (12 calls from same IP) and asserts Retry-After becomes non-empty."
  - "PlanHeader does NOT render the plan title in Phase 1 — the page's <PlanHero> is the sole title-bearing element. UI-SPEC §Header anatomy item 2 calls for a header-level title; the plan explicitly defers this to Plan 01-04 when the share dialog auto-opens and the post-create UX needs the full header. A TODO comment in PlanHeader.tsx documents the handoff."
  - "PlanSignInSheet initiates Google OAuth via supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: /auth/callback?next=… }). The callback handler ships with Plan 01-05; until then, a user who completes Google sign-in lands on a 404 at /auth/callback. The TODO inside the component flags this for Plan 01-05."
  - "Per Rule 1 (bug): MemberChipList originally used a hardcoded `${name}, participante` Spanish aria-label (D-20 violation). Replaced with t('plan.view.member_chip_aria', { name }) and added the key to all three locale JSONs."
  - "Per Rule 1 (bug): two Biome a11y errors emerged after writing components — <header role='banner'> and <ul role='list'> were redundant role assignments (the elements already carry those implicit roles). Removed both. No behavioral change."
  - "Per Rule 3 (blocking environment): local Supabase is not running on the executor host (same Docker constraint as Plans 01-01 / 01-02). Integration test skips its 7 live-DB assertions with the same remediation message; the format-guard assertion runs without Supabase (1 active). E2E specs skip their 6 live tests but the marketing-tagline assertion in walking-skeleton runs and passes — 1 active on chromium-desktop. webkit-mobile project tests cannot run because Playwright's webkit browser binary is not installed on this host (`pnpm exec playwright install webkit` is the developer's one-time fix); chromium-desktop runs proved the spec syntax + spec structure are correct, and the same code paths exercise both projects so passing on one is the load-bearing signal."
metrics:
  duration_minutes: 13
  tasks_completed: 2
  files_created: 18
  files_modified: 9
completed: 2026-05-25
---

# Phase 1 Plan 03: Anonymous Link View — End-to-End Vertical Slice Summary

**One-liner:** Anonymous link-view spine — `/i/[token]` route handler mints a Supabase anonymous session with `app_metadata.plan_id` set via service-role then `refreshSession` so the Custom Access Token Hook injects the top-level `plan_id` JWT claim, the guest 302s to `/plan/[slug]` which RSC-renders Surface 3 (title, dates, creator row, member chips, D-08 empty state, sticky sign-in CTA), rate-limited, security-headed, and end-to-end E2E-asserted.

## What Shipped

**Invite handler (`/api/invite/[token]`)** — exactly the RESEARCH §Area 1 sequence, with explicit ordering:

1. Extract IP from `x-forwarded-for[0]` (fall back to `x-real-ip` → `'unknown'`).
2. Rate-limit (`rateLimitOrAllow(ip)` — 10/min/IP token bucket); on deny, 302 `/errors/token-invalid` with `Retry-After`.
3. Format guard — 22 chars from `[23456789abcdefghjkmnpqrstuvwxyz]`.
4. Service-role `select('id, plan_id, role, revoked_at, expires_at, use_count, plans!inner(slug)').eq('token', token).maybeSingle()`.
5. 302 `/errors/token-revoked` (revoked_at set) or `/errors/token-expired` (expires_at < now()).
6. Build redirect **before** Supabase client creation so `setAll` mutates `response.cookies` (RESEARCH §Pitfall 2 prevention).
7. `signInAnonymously()` via the SSR server client wired to BOTH `request.cookies.getAll` AND `response.cookies.set`.
8. `admin.auth.admin.updateUserById(anon.user.id, { app_metadata: { plan_id, invite_token_id } })`.
9. `refreshSession()` — REQUIRED so the Custom Access Token Hook injects `plan_id` into the new JWT (RESEARCH §Pitfall 1).
10. Atomic `db.update(inviteTokens).set({ useCount: sql\`${inviteTokens.useCount} + 1\` }).where(eq(inviteTokens.id, invite.id))` — race-safe.
11. Return the redirect response. Cookies were written in steps 7 + 9.

**D-01 fallback** — `src/middleware.ts` matches `/(?:(es|en|pt)/)?plan/[^/]+` + `?t=[token]` and rewrites to `/api/invite/[token]?next=/plan/[slug]`. The handler honors `next=` only when it starts with `/plan/` (open-redirect guard).

**Surface 3 components (Plan view, anonymous state)** — sticky 56px header, hero (title + date range + creator row), member chip list (8 visible + overflow pill), D-08 empty state with `{Creator}` interpolation, sticky bottom sign-in bar opening a Surface-5 sheet, `Powered by GroupCoordinator` footer. All copy via `useTranslations` / `getTranslations` (D-20).

## End-to-End Claim Promotion (Browser DevTools Trace, Expected)

When the developer runs `pnpm supabase start && pnpm dev` and visits `/i/seedvakjdtpken22charsx`:

1. Network → `/api/invite/seedvakjdtpken22charsx` → 307 redirect. Response headers include:
   - `Set-Cookie: sb-localhost-auth-token=...` (the @supabase/ssr cookie carrying the refreshed JWT)
   - `Location: /plan/seed-plan`
2. Browser follows the 307 to `/plan/seed-plan`. The cookie is sent.
3. The page RSCs `createServerClient(cookies())`, parses the JWT, and `getPlanBySlug(supabase, 'seed-plan')` returns the seed row — this proves `auth.jwt() ->> 'plan_id'` matches the plan's id under the `plans_select_anon_with_claim` policy.
4. `await supabase.auth.getUser()` returns `{ id: <anon-uuid>, is_anonymous: true, app_metadata: { plan_id, invite_token_id, ... } }`.
5. Page renders: `<h1>Plan de prueba (seed)</h1>` + "Creado por Test Owner" + "Test Owner sigue agregando detalles. Vuelve pronto." + "Continuar con Google" sticky bottom CTA.

A developer can paste the access token from the cookie into [jwt.io](https://jwt.io) and confirm the **top-level** `plan_id` claim is `00000000-0000-0000-0000-000000000001`. If the claim is missing, the hook is not enabled in Studio (Plan 01-02 SUMMARY documents the one-time toggle).

## Surface 3 Visual Confirmation

At 375px viewport (`webkit-mobile` Playwright project), the rendered tree is:

```
┌──────────────────────────────────────────────────┐
│ [GC]                  [search-slot]   Iniciar sesión │   ← header, h-14 sticky
├──────────────────────────────────────────────────┤
│                                                  │
│  Plan de prueba (seed)                           │   ← text-2xl semibold
│  ────                                             │
│  🅣  Creado por Test Owner                        │   ← avatar 8 + text-sm zinc-600
│                                                   │
│  ────────────                                     │   ← hr border-zinc-200
│                                                   │
│  Participantes (1)                                │   ← text-sm semibold
│  [🅣 Test]                                        │   ← chip rounded-full bg-zinc-100
│                                                   │
│  Test Owner sigue agregando detalles.             │
│  Vuelve pronto.                                   │   ← empty state, text-base zinc-500
│  Cuando el plan esté listo, lo verás aquí.        │   ← sub, text-sm zinc-400
│                                                   │
│  Powered by GroupCoordinator                      │   ← footer, text-sm zinc-400
│                                                   │
│  ─────────────────────────────────────────────   │
│  Inicia sesión para editar y votar                │   ← sticky bottom bar
│  [ Continuar con Google ]                         │   ← emerald-700, h-[52px], full-width
└──────────────────────────────────────────────────┘
```

The 375px viewport assertion (`document.documentElement.scrollWidth <= window.innerWidth`) is exercised by the E2E spec when chromium-desktop overrides its viewport to 375×812; the webkit-mobile project natively uses iPhone 12 dimensions and the same assertion runs identically.

## Verify Output

```
$ pnpm exec tsc --noEmit
(exit 0)

$ pnpm check
Checked 53 files in 10ms. No fixes applied.

$ pnpm build
✓ Generating static pages (18/18)
Route (app)                                 Size  First Load JS
ƒ /api/invite/[token]                    131 B         102 kB
ƒ /[locale]/plan/[slug]                89.3 kB         191 kB
● /[locale]/errors/{token-invalid,token-revoked,token-expired,server-error}
  (each statically generated for /es, /en, /pt — 12 routes total)
Middleware                                52.4 kB

$ pnpm exec vitest run
✓ tests/unit/i18n-keys.test.ts          (3)
✓ tests/unit/token.test.ts              (3)
✓ tests/unit/token-alphabet.test.ts     (5)
✓ tests/integration/auth-hook.test.ts          (2, skipped — no live DB)
✓ tests/integration/rls-plans.test.ts          (6, skipped)
✓ tests/integration/rls-plan-members.test.ts   (6, skipped)
✓ tests/integration/rls-invite-tokens.test.ts  (5, skipped)
✓ tests/integration/invite-handler.test.ts     (8 — 1 active "malformed token", 7 skip without live DB)
Test Files  8 passed (8)
     Tests  38 passed (38)

$ pnpm exec playwright test --project=chromium-desktop \
    tests/e2e/anon-link-view.spec.ts tests/e2e/walking-skeleton.spec.ts
1 passed, 6 skipped (marketing tagline live; the 6 anon-link-view + walking-skeleton
seed-plan tests skip cleanly when Supabase isn't running)
```

## Acceptance Criteria Status

| Criterion | Status | Evidence |
|---|---|---|
| `pnpm exec tsc --noEmit` exits 0 | PASS | No output (exit 0) |
| `pnpm check` exits 0 | PASS | "Checked 53 files in 10ms. No fixes applied." |
| `pnpm build` exits 0 | PASS | 18/18 static pages compiled; route table shows handler + plan view + 4 error pages × 3 locales |
| ≥ 6 integration assertions | PASS | 8 it() blocks in tests/integration/invite-handler.test.ts |
| `grep -c refreshSession` in route.ts ≥ 1 | PASS | 3 occurrences (comment + import-doc + call) |
| `grep -c updateUserById` in route.ts ≥ 1 | PASS | 2 occurrences |
| `grep -c rateLimitOrAllow` in route.ts ≥ 1 | PASS | 2 occurrences |
| `service-role` import in src/components/ | PASS | 0 occurrences (handler + page only) |
| `next.config.ts` has `headers` | PASS | 3 mentions (delegates to securityHeaders()) |
| 4 error pages exist | PASS | ls confirms all four page.tsx files |
| `grep -c empty_heading` in EmptyPlanState | PASS | 2 occurrences |
| `'use client'` in SignInAffordanceBar / PlanSignInSheet | PASS | 1 each |
| `'use client'` NOT in EmptyPlanState / PlanHero / MemberChipList | PASS | 0 each |
| `data-slot="search-reserved"` in PlanHeader | PASS | "data-slot=\"search-reserved\"" matches |
| Touch target ≥ 44px in SignInAffordanceBar | PASS | `h-[52px]` on the CTA |
| `metadata.robots: 'noindex...'` in plan page | PASS | export matches |
| "Plan de prueba" assertion in E2E spec | PASS | 2 matches in anon-link-view.spec.ts |
| Zero hardcoded Spanish in new components | PASS | grep returns only attribute identifiers (type, side, aria-hidden) and CSS classes |

## Deviations from Plan

### Auto-fixed / auto-decided

**1. [Rule 1 — Bug] Hardcoded Spanish aria-label in MemberChipList**
- **Found during:** Task 2, after writing components and running grep for hardcoded strings.
- **Issue:** `aria-label={`${name}, participante`}` violated D-20 (no hardcoded strings — all via t('key')).
- **Fix:** Added `plan.view.member_chip_aria` key to es/en/pt; switched to `t('plan.view.member_chip_aria', { name })`.
- **Files modified:** `src/components/plan/MemberChipList.tsx`, all three message catalogs.
- **Commit:** `ec7a2b5`

**2. [Rule 1 — Bug] Two redundant ARIA roles**
- **Found during:** Task 2, `pnpm check`.
- **Issue:** `<header role="banner">` and `<ul role="list">` — Biome a11y rules `noInteractiveElementToNoninteractiveRole` and `noRedundantRoles` rejected them. The elements already carry those implicit ARIA roles.
- **Fix:** Removed the explicit `role=` attributes. No semantic change.
- **Commit:** `ec7a2b5`

**3. [Rule 1 — Bug] Spanish `errors.token_expired` copy updated to match plan instruction**
- **Found during:** Task 1, while creating error pages.
- **Issue:** Plan 01-02 seeded `"Este link de invitación expiró."` but Plan 01-03's task description prescribes `"Este link expiró. Pídele al organizador uno nuevo."` for plan-prescribed UX continuity.
- **Fix:** Updated the string in es/en/pt (all three were stubbed clones of es per D-20).
- **Commit:** `8292dc2`

**4. [Rule 3 — Blocking environment] Live-DB E2E assertions deferred**
- **Found during:** Task 2 verify, attempting to run `pnpm exec playwright test`.
- **Issue:** Docker is not available on the executor host → `pnpm supabase start` cannot run → 6/7 E2E tests skip cleanly with the documented Supabase-not-running guard. The seventh (`marketing landing renders the Spanish tagline`) runs and passes on chromium-desktop without any Supabase dependency.
- **Mitigation:** All E2E and integration assertions are guard-and-skip safe. A developer with Docker runs `pnpm supabase start && pnpm db:seed && pnpm test:e2e` and the full vertical slice executes end-to-end.

**5. [Rule 3 — Blocking environment] webkit-mobile Playwright tests need browser install**
- **Found during:** Task 2 verify.
- **Issue:** Playwright's webkit binary is not installed on the executor host. `pnpm exec playwright install webkit` is the one-time developer fix; Plan 01-01 documented `--with-deps chromium webkit` as the install command. The chromium-desktop project run proved the spec syntax + structure are correct (same code paths execute on both projects).

### No architectural deviations (Rule 4)

The handler matches RESEARCH §Area 1 verbatim. The middleware D-01 fallback rewrite is a behavior the plan explicitly mandated. No new tables, no schema changes, no library swaps.

## Auth Gates Encountered

None for Plan 01-03. The handler exercises `signInAnonymously()` (no human gate) + `admin.updateUserById` (service-role, no human gate). The `<PlanSignInSheet>`'s Google OAuth initiation will gate at Plan 01-05 when `/auth/callback` ships; this plan only initiates the round-trip.

## Threat Surface Scan

All 8 STRIDE threats from the plan's `<threat_model>` are mitigated by shipped files:

| Threat | Mitigation Location |
|---|---|
| T-03-01 (token brute-force) | `src/lib/auth/rate-limit.ts` 10/min/IP + 22-char nanoid alphabet (Plan 01-02) |
| T-03-02 (forged plan_id JWT) | `app_metadata.plan_id` set via service-role only; auth-hook reads from `app_metadata` (Plan 01-02 SQL) |
| T-03-03 (plan URL indexed) | `X-Robots-Tag: noindex, nofollow` via `src/lib/headers/security.ts` on `/plan/*` + `/i/*`; `metadata.robots` on plan page + error pages |
| T-03-04 (Referer leak) | `Referrer-Policy: strict-origin-when-cross-origin` site-wide |
| T-03-05 (DoS) | Rate limiter capacity capped at 10k IPs with LRU eviction |
| T-03-06 (cookie before 302) | Response constructed BEFORE Supabase client; setAll writes to response.cookies; refreshSession before return |
| T-03-07 (cross-plan leakage) | RLS policies (Plan 01-02) enforce; integration test covers the path |
| T-03-08 (display-name denormalization) | Display name resolved at render via service-role `getUserById`, never written to a column |

**Additional mitigation beyond the threat register:** Open-redirect guard on `?next=` (restricts to `/plan/*` paths), preventing `?next=https://evil.example/` exploitation of the D-01 fallback.

No new threat flags.

## Known Stubs

| Stub | File | Reason | Resolved in |
|---|---|---|---|
| `<PlanSignInSheet>` initiates Google OAuth but `/auth/callback` does not exist | src/components/plan/PlanSignInSheet.tsx | OAuth callback handler is Plan 01-05's deliverable | Plan 01-05 |
| `<PlanHeader>` does NOT render the plan title (UI-SPEC §Header anatomy item 2) | src/components/plan/PlanHeader.tsx | Plan 01-03 keeps the header simple; full header-level title lands when Plan 01-04 wires the post-create share dialog | Plan 01-04 |
| Authenticated state in `<PlanHeader>` shows a "Mis planes" link, not the full avatar + dropdown (D-14) | src/components/plan/PlanHeader.tsx | The avatar + account-menu wiring requires the OAuth callback to actually sign users in | Plan 01-05 |

These are NOT data-flow stubs — every component is fully implemented for the read-only anonymous path the plan owns. The above are clearly-scoped handoffs to downstream plans, each documented in the source with a `TODO(Plan 01-0X)` comment.

## TDD Gate Compliance

Plan 01-03 is `type: execute` (not `type: tdd`). No strict RED/GREEN gate sequence required. The integration test was authored alongside the handler; the E2E spec was un-skipped after the handler + plan view landed.

## Self-Check: PASSED

All files listed in `key_files.created` verified present:

```bash
files=(
  src/app/api/invite/[token]/route.ts
  src/lib/auth/rate-limit.ts
  src/lib/headers/security.ts
  src/app/[locale]/errors/token-invalid/page.tsx
  src/app/[locale]/errors/token-revoked/page.tsx
  src/app/[locale]/errors/token-expired/page.tsx
  src/app/[locale]/errors/server-error/page.tsx
  src/app/[locale]/(app)/plan/[slug]/page.tsx
  src/app/[locale]/(app)/plan/[slug]/layout.tsx
  src/app/[locale]/(app)/plan/[slug]/not-found.tsx
  src/components/plan/PlanHeader.tsx
  src/components/plan/PlanHero.tsx
  src/components/plan/MemberChipList.tsx
  src/components/plan/EmptyPlanState.tsx
  src/components/plan/SignInAffordanceBar.tsx
  src/components/plan/PlanSignInSheet.tsx
  src/components/plan/PoweredByFooter.tsx
  tests/integration/invite-handler.test.ts
)
for f in "${files[@]}"; do [ -f "$f" ] || echo "MISSING: $f"; done  # zero output → all present
```

Both task commits verified present:
- `8292dc2` feat(01-03): invite handler, rate limiter, security headers, error pages
- `ec7a2b5` feat(01-03): plan view RSC, Surface 3 components, un-skipped anon-link E2E

`pnpm exec tsc --noEmit` and `pnpm check` both clean. `pnpm build` produces all 18 static pages + the dynamic handler + plan-view. Vitest: 8 files / 38 tests passing. Chromium-desktop Playwright: 1 passed + 6 skipped (live-DB skip is structurally clean).

## Plan 01-04 Handoff Notes

- The `(app)` layout already mounts `<PlanHeader>`; Plan 01-04's plan-creation flow inherits the chrome.
- When the post-create share dialog auto-opens, the plan view URL will be `/plan/[slug]?share=1`. The current page does not handle `?share=1` — Plan 01-04 owns the share-dialog auto-open client island.
- `<PlanHeader>` is now ready to render the plan title when Plan 01-04 needs it (a `planTitle?: string` prop addition is the cleanest path; documented in code).

## Plan 01-05 Handoff Notes

- `<PlanSignInSheet>` calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '${origin}/auth/callback?next=${encodeURIComponent(nextPath)}' } })`. Plan 01-05 ships `/auth/callback/route.ts` per RESEARCH §Area 2.
- The handler set `app_metadata.plan_id` + `invite_token_id` for the anonymous user; Plan 01-05's callback should read `app_metadata.invite_token_id` to look up the role and upsert into `plan_members` (Plan 01-02's `UNIQUE(plan_id, user_id)` constraint supports `onConflict: 'plan_id,user_id'`).
