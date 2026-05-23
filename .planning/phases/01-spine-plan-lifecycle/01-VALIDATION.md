---
phase: 1
slug: spine-plan-lifecycle
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-22
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Filled by planner during plan creation; updated by executor as tasks land.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (unit)** | Vitest 2.x |
| **Framework (E2E)** | Playwright 1.49+ |
| **Unit config** | `vitest.config.ts` (Wave 0 installs) |
| **E2E config** | `playwright.config.ts` (Wave 0 installs) |
| **Quick run command** | `pnpm test:unit --run` |
| **Full suite command** | `pnpm test:unit --run && pnpm test:e2e` |
| **Estimated runtime** | ~30s unit + ~2min E2E |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit --run` (quick — ~30s)
- **After every plan wave:** Run full suite `pnpm test:unit --run && pnpm test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green on at least Chromium + WebKit mobile viewport
- **Max feedback latency:** 30 seconds (unit) / 2 minutes (full E2E)

---

## Per-Task Verification Map

> This table is populated by the planner from PLAN.md task IDs. Below is a scaffold — planner will fill the rows. Each Phase 1 task must map to at least one automated check OR cite a Wave 0 dependency.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _to be filled by planner_ | — | — | — | — | — | — | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 installs the testing harness and creates stub files for every requirement. Required outputs:

- [ ] `vitest.config.ts` — Vitest config with jsdom env for component utilities + node env for RLS policy logic
- [ ] `playwright.config.ts` — Playwright config with `webServer` running `pnpm dev` at the test base URL; projects for Chromium desktop + WebKit mobile (375×667 viewport)
- [ ] `tests/setup/supabase.ts` — Helper to bootstrap a local Supabase test client against `supabase start` instance with seeded test data
- [ ] `tests/setup/auth.ts` — Test-only OAuth bypass helper (per RESEARCH.md §Area 5 — option to set the `sb-access-token` cookie directly with a seeded test user's JWT)
- [ ] `tests/unit/rls.test.ts` — Stub for RLS policy logic tests (executed via `pg-tap` or direct `psql` calls)
- [ ] `tests/e2e/walking-skeleton.spec.ts` — Stub for the Walking Skeleton flow (proves end-to-end works)
- [ ] `tests/e2e/anon-link-view.spec.ts` — Stub for the AUTH-01 + PLAN-03 flow
- [ ] `tests/e2e/oauth-upgrade.spec.ts` — Stub for the AUTH-04 (`linkIdentity`) flow
- [ ] `tests/e2e/token-revoke.spec.ts` — Stub for the PLAN-04 (token revoke / 404) flow

---

## Critical Paths (Phase 1 E2E Flows)

These flows MUST pass for Phase 1 to be considered done. They map directly to ROADMAP success criteria.

1. **Walking Skeleton** — `pnpm dev` → home page renders → DB connection succeeds → seed plan visible at `/plan/[seed-slug]` (proves project + routing + DB + UI integration)
2. **Plan create + share + view (anon)** — authenticated owner creates plan with title only → share dialog auto-opens → owner copies `/i/[token]` → opens in incognito context → sees plan title + creator + member list (no edit affordances visible)
3. **Hybrid OAuth upgrade** — anon viewer taps "Continuar con Google" in sticky bar → completes OAuth (test bypass in CI) → lands back on same plan view → header shows avatar + name (no toast) → `plan_members` row exists with `joined_via_token_id` set
4. **Token revoke** — owner navigates to `/plan/[slug]/settings` → revokes a token → fresh paste of the revoked `/i/[token]` URL in incognito returns 404 / "link revocado" error page
5. **Archive plan** — owner archives plan from settings → plan disappears from `/me` list → direct URL still resolves (soft-delete preserves data per D-05)
6. **Cross-RLS isolation** — User A's plan is NOT visible to User B who never had its invite token (Vitest unit + Playwright E2E; tests both authenticated-not-member and anon-with-wrong-plan_id-claim cases)

---

## Test Pyramid Mix

| Layer | Tooling | Coverage Target |
|-------|---------|-----------------|
| **Unit** | Vitest | All pure functions (token generation, URL parsing, microcopy helpers, date formatting). All RLS policy logic via `pg-tap` or `psql` assertions. ~80% line coverage on lib/ directory. |
| **Integration** | Vitest + local Supabase | Server Actions (`createPlan`, `mintInviteToken`, `revokeToken`, `archivePlan`) tested with a real Supabase test client, NOT mocked. Verify RLS policies enforce expected access patterns. |
| **E2E** | Playwright | The 6 critical paths above. Mobile viewport (375×667 WebKit) is the primary check; Chromium desktop is the secondary. |
| **Component (skipped Phase 1)** | — | Per STACK.md decision; bad ROI for solo dev in Phase 1. Revisit if visual regressions surface. |

---

## Mock-vs-Real Strategy

- **Database:** Real local Supabase via `supabase start`. No DB mocks. RLS policies must execute against real Postgres.
- **Auth (Google OAuth):** Real OAuth flow only in manual smoke testing. In CI E2E, use the test-only bypass helper that sets `sb-access-token` cookie directly with a seeded test user's JWT (see RESEARCH.md §Area 5 + §Open Questions Q1).
- **Time:** Use `vi.useFakeTimers()` only for tests verifying token expiry; otherwise use real time.
- **OG image generation:** Test that the route at `/api/og/[plan_slug]` returns a 200 with `image/png` content-type; visual regression is deferred.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OG preview renders correctly in WhatsApp / iMessage | PLAN-02 (D-09) | Real third-party preview rendering; cannot automate from CI | Share `/i/[token]` from a phone to a real WhatsApp chat; visually confirm gradient + title + creator + date render |
| Apple Sign In not visible anywhere | AUTH-03 deferred | Cannot automate "absence of UI element across whole app" reliably | Audit sign-in bottom sheet (Surface 5) — only "Continuar con Google" button visible |
| Spanish neutrality (no regional slang) | D-20 | Linguistic judgment, not automatable | Read all es.json keys; confirm neutral tone, 2nd-person "tú", no regional words |
| Empty state copy renders creator's display name correctly | D-08 | Visual confirmation that interpolation works for varying name lengths | Open a plan as anon viewer; confirm "{Creator} sigue agregando detalles…" renders with the OAuth-provided first name |

---

## Done Criteria (qualitative — Nyquist Dimension 8)

Phase 1 is validation-complete when:

1. All 6 critical-path E2E specs pass on Chromium desktop AND WebKit mobile (375×667)
2. RLS policy unit tests cover anon-with-correct-claim, anon-with-wrong-claim, authenticated-member, authenticated-non-member, and owner-only cases for all 3 Phase 1 tables
3. Walking Skeleton E2E passes against a fresh `supabase start` instance (proves repeatability)
4. Unit suite reports ≥80% line coverage on `lib/` (token gen, URL helpers, formatting)
5. No test marked `.skip` or `.todo` in the final commit
6. Manual verifications above performed and recorded in commit message or VERIFY.md

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (filled by planner)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (`--watch` excluded from CI scripts)
- [ ] Feedback latency < 30s for unit suite
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---

*Phase 1 validation strategy. Generated from RESEARCH.md §Validation Architecture; will be refined by planner during PLAN.md task breakdown.*
