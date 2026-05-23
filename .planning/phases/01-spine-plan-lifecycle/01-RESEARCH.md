# Phase 1: Spine & Plan Lifecycle — Research

**Researched:** 2026-05-22
**Domain:** Supabase anonymous auth + custom JWT claims + RLS + Drizzle migration workflow + Next.js 15.5 App Router bootstrap
**Confidence:** HIGH on RLS policy SQL (verified against official Supabase docs); MEDIUM on Custom Access Token Hook specifics (official docs confirmed shape, but full SQL example assembled from docs + training); MEDIUM on linkIdentity collision behavior (Supabase docs describe the error path but don't name the error code)
**Scope:** Focused — only the 5 critical integration unknowns for Phase 1. All other domains (map, realtime, PWA, file uploads, framework choice) are documented in project-level research and are not repeated here.

---

## Executive Summary

1. **Custom JWT claim for `plan_id` requires a Custom Access Token Hook** — you cannot inject claims at `signInAnonymously()` call time; `data` passed to `signInAnonymously` lands in `raw_user_meta_data` (user-editable), not in the JWT. The hook reads from `raw_app_meta_data` (server-only) and injects the claim before token issuance. The `/api/invite/[token]/route.ts` handler must use the service-role client to set `app_metadata` before or during anonymous sign-in.

2. **`linkIdentity()` is a client-side call** that runs after the OAuth callback restores the session. The server route `/auth/callback/route.ts` calls `exchangeCodeForSession`, then the client finishes linking via `supabase.auth.linkIdentity`. The `plan_members` INSERT belongs in the server callback, keyed off the user ID that `exchangeCodeForSession` returns.

3. **Email collision on `linkIdentity` fails with a recognisable error** and must surface the Spanish copy "Esa cuenta ya está en uso. Inicia sesión y reabre el link." The recovery UX is documented below.

4. **Drizzle owns table DDL; raw SQL files own RLS** — the official Supabase × Drizzle docs confirm this split. Run `supabase start` → `drizzle-kit generate` → `drizzle-kit migrate` → apply `supabase/policies/*.sql` via `supabase db push` or `psql`. Drizzle must NOT try to manage policies; they live in separate migration files.

5. **All Phase 1 RLS policies are ready-to-paste** in Area 4 below. The auth hook SQL is in Area 1. The bootstrap command sequence is in Area 5.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Share link = `/i/[token]`, validated at `/api/invite/[token]/route.ts`, anonymous session minted with `plan_id` claim, 302 to `/plan/[slug]`. Middleware also handles `/plan/[slug]?t=[token]`.
- **D-02:** Multiple active invite tokens per plan (N:1 to plans). Per-token revocation.
- **D-03:** Tokens never expire by default. Owner can set `expires_at`.
- **D-04:** Revoking a token kills future sign-ins; existing anonymous sessions remain valid until cookie expires (~1 week).
- **D-05:** Token format: nanoid no-lookalike alphabet, 22 chars (128+ bits). Use `crypto.randomBytes`-backed nanoid.
- **D-06:** Plan creation requires title only. Other fields optional, editable post-create.
- **D-07:** Post-create: share dialog auto-opens with copyable `/i/[token]` link + Web Share API CTA.
- **D-08:** Guest empty plan view: `"{Creator} sigue agregando detalles. Vuelve pronto."` (D-08 exact copy). No disabled feature tabs.
- **D-09:** OG image via `next/og` at `/api/og/[plan_slug]/route.ts`. Emerald gradient + plan title + creator + date range.
- **D-10:** Sign-in entry = bottom sheet, `<Sheet side="bottom">`, one "Continuar con Google" button.
- **D-11:** OAuth callback: `linkIdentity()` preserves anonymous user_id. INSERT `plan_members` after exchange. Redirect back to original plan path (`next` query param).
- **D-12:** No pending-action replay in v1.
- **D-13:** Role on auto-join = role from invite token (`viewer` or `editor`).
- **D-14:** Post-OAuth: avatar replaces "Iniciar sesión" in header. No toast. Account menu shows.
- **D-15:** Drizzle ORM 0.36+ for schema and data access. Drizzle Kit Studio for inspection.
- **D-16:** Google OAuth only in Phase 1. Apple deferred.
- **D-17:** Magic-link auth not in Phase 1.
- **D-18:** RLS mandatory on every table from day 1. No service-role client reachable from browser.
- **D-19:** Anonymous viewers do NOT get `plan_members` row. RLS for SELECT uses `auth.jwt() ->> 'plan_id'` claim.
- **D-20:** next-intl scaffold in Phase 1. `[locale]` segment. Spanish-only populated. `en.json`/`pt.json` stubbed. No hardcoded strings.
- **D-21:** Stable internal `user_id` (Supabase auth.users.id). Display name resolved at render.
- **D-22:** `noindex` on `/plan/*` and `/i/*`. `robots.txt` Disallow. `Referrer-Policy: strict-origin-when-cross-origin`. Rate-limit `/api/invite/[token]` 404s at 10/min/IP.
- **D-23:** Vercel Hobby tier. Spend Management cap at 80%. No Supabase Storage in Phase 1.

### Claude's Discretion
- Form library choice (react-hook-form + Zod confirmed as default).
- Exact slug length (8–10 chars for plan slug; 8 is architecture default).
- Database client surface naming (server/browser/service-role triplet structure).
- Multiple-environment OAuth setup (per-environment apps, dynamic redirect via `NEXT_PUBLIC_SITE_URL`).
- Exact wording of Spanish microcopy strings (executor may iterate; es.json catalog in UI-SPEC is the reference).

### Deferred Ideas (OUT OF SCOPE)
- AUTH-03 Apple OAuth — v2.
- Magic-link email auth — Phase 7 contingency.
- Pending-action replay — Phase 4+.
- `plan_revocations` table — only if user-reported leak case emerges.
- Co-organizer / role promotion flow — Phase 2.
- Per-locale translation for en.json/pt.json — Phase 7+.
- Soft-deleted plan restore UI — Phase 7+.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Anonymous plan view via invite link without creating an account | Area 1 (anonymous JWT + plan_id claim), Area 4 (RLS SELECT policy for plans) |
| AUTH-02 | Google OAuth sign-in | Area 2 (OAuth callback route), Area 5 (bootstrap step 9) |
| AUTH-04 | Anonymous → authenticated upgrade preserving context (linkIdentity) | Area 2 (full linkIdentity flow), email collision handling |
| AUTH-05 | Authenticated user can access "My plans" list | Area 4 (plan_members RLS SELECT), Area 5 (routing) |
| AUTH-06 | Session persists across browser refreshes | @supabase/ssr cookie-based session; confirmed by architecture |
| PLAN-01 | Create a plan with title, optional dates/description | Area 5 bootstrap step 8 (first route), form library pattern |
| PLAN-02 | Share invite link (mint token, copy link, Web Share API) | Area 1 (token mint), D-07 (share dialog) |
| PLAN-03 | Guest views plan read-only via invite link | Area 1 (anonymous JWT), Area 4 (RLS), D-08 (empty state) |
| PLAN-04 | Owner can revoke/regenerate invite tokens | Area 4 (invite_tokens RLS UPDATE), D-04 semantics |
| PLAN-05 | Owner can archive/delete plan (soft-delete) | Area 4 (plans RLS UPDATE for archived_at), D-05 soft-delete |
| PLAN-06 | Authenticated user sees "My plans" list | Area 4 (plan_members RLS), routing to /me |
</phase_requirements>

---

## Area 1: Supabase Anonymous JWT with Custom `plan_id` Claim

### The Core Problem

`signInAnonymously({ data: { plan_id } })` does NOT inject `plan_id` into the JWT. The `data` field maps to `raw_user_meta_data`, which is user-editable and is NOT automatically surfaced as a top-level JWT claim. An RLS policy using `auth.jwt() ->> 'plan_id'` will NOT see this value unless a Custom Access Token Hook puts it there explicitly. [VERIFIED: supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook]

### How Custom Claims Work

The **Custom Access Token Hook** (`custom_access_token_hook`) is a PL/pgSQL function that runs before every token issuance. It receives the current claims object and can add fields to it. [VERIFIED: supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook]

The correct flow for the anonymous invite scenario:

```
/api/invite/[token]/route.ts (server route, service-role client)
  1. Validate token (not expired, not revoked) — use service-role or anon Supabase client
  2. Resolve plan_id from invite_tokens row
  3. Call supabase.auth.signInAnonymously() via the SERVER client
     (NOT possible — signInAnonymously is a client SDK call that cannot accept app_metadata)

Alternative flow:
  1. Validate token → resolve plan_id
  2. signInAnonymously() — creates anonymous user
  3. Use service-role client to set app_metadata on the new user:
     supabase.auth.admin.updateUserById(userId, {
       app_metadata: { plan_id: planId }
     })
  4. The next token refresh picks up the new app_metadata claim
  5. Set cookie, redirect to /plan/[slug]
```

**Problem with step 4:** the first token issued at sign-in does NOT yet have the custom claim, because `updateUserById` happens after `signInAnonymously` returns. The Custom Access Token Hook runs before EVERY token issuance — so the claim only appears after a token refresh or a new sign-in.

**Resolution — the correct approach:** Call `signInAnonymously()` on the server (the `@supabase/ssr` server client supports this), then immediately call `supabase.auth.admin.updateUserById` to set `app_metadata`, then call `supabase.auth.refreshSession()` to force a new token that the hook will enrich. Set the resulting session cookie and redirect. [ASSUMED — the exact sequence is not demonstrated in a single Supabase doc page, but the component APIs are individually verified]

### The Auth Hook SQL

```sql
-- supabase/migrations/001_auth_hook.sql
-- Grant the hook permission to read app_metadata
-- NOTE: this function reads from the claims object already assembled by Supabase Auth.
-- app_metadata is available in the event's claims as 'app_metadata'.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  plan_id text;
begin
  claims := event -> 'claims';

  -- Pull plan_id out of app_metadata (server-controlled, not user-editable).
  -- app_metadata is nested inside claims as 'app_metadata'.
  plan_id := claims -> 'app_metadata' ->> 'plan_id';

  if plan_id is not null then
    -- Inject as a top-level claim so RLS can use: auth.jwt() ->> 'plan_id'
    claims := jsonb_set(claims, '{plan_id}', to_jsonb(plan_id));
  end if;

  -- Required: return the full claims object
  return jsonb_build_object('claims', claims);
end;
$$;

-- Grant execute to supabase_auth_admin (required)
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
-- Revoke from public for safety
revoke execute on function public.custom_access_token_hook from public;
```

After creating the function, enable it in the Supabase Dashboard: **Authentication → Hooks → Custom Access Token Hook → select `public.custom_access_token_hook`**. [VERIFIED: supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook]

### The Invite Handler: `/api/invite/[token]/route.ts`

```typescript
// app/api/invite/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  const serviceRole = createServiceRoleClient();
  const cookieStore = await cookies();

  // 1. Validate token
  const { data: invite, error: inviteError } = await serviceRole
    .from('invite_tokens')
    .select('id, plan_id, role, revoked_at, expires_at, plans(slug)')
    .eq('token', token)
    .single();

  if (inviteError || !invite) {
    return NextResponse.redirect(new URL('/errors/token-invalid', request.url));
  }
  if (invite.revoked_at) {
    return NextResponse.redirect(new URL('/errors/token-revoked', request.url));
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.redirect(new URL('/errors/token-expired', request.url));
  }

  // 2. Create anonymous session using the SSR server client
  const supabase = createServerClient(cookieStore);
  const { data: anonSession, error: anonError } = await supabase.auth.signInAnonymously();

  if (anonError || !anonSession.user) {
    return NextResponse.redirect(new URL('/errors/server-error', request.url));
  }

  // 3. Set app_metadata with plan_id via service role
  //    (app_metadata is server-controlled; never trust user_metadata for security)
  await serviceRole.auth.admin.updateUserById(anonSession.user.id, {
    app_metadata: {
      plan_id: invite.plan_id,
      invite_token_id: invite.id,
    },
  });

  // 4. Refresh session so the Custom Access Token Hook injects the plan_id claim
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshed.session) {
    return NextResponse.redirect(new URL('/errors/server-error', request.url));
  }

  // 5. Increment use_count on the invite token
  await serviceRole
    .from('invite_tokens')
    .update({ use_count: invite.use_count + 1 })
    .eq('id', invite.id);

  // 6. Redirect to plan (cookie already set by @supabase/ssr middleware)
  const slug = (invite.plans as { slug: string }).slug;
  return NextResponse.redirect(new URL(`/plan/${slug}`, request.url));
}
```

**`app_metadata` vs `user_metadata`:** `app_metadata` is set exclusively via service-role calls — the user cannot modify it via the client SDK. `user_metadata` is user-editable. RLS policies that gate access MUST read from `app_metadata` (via `auth.jwt() -> 'app_metadata' ->> 'plan_id'`). The Custom Access Token Hook promotes this into a top-level claim (`plan_id`) for ergonomic use in RLS. [VERIFIED: supabase.com/docs/guides/database/postgres/row-level-security — confirms `app_metadata` is the safer channel for security-critical claims]

---

## Area 2: `linkIdentity()` + `plan_members` INSERT After Google OAuth Callback

### The `@supabase/ssr` OAuth Code Exchange

The OAuth callback uses `exchangeCodeForSession` from the `@supabase/ssr` server client. This is a server-side Route Handler, not a Server Action. [ASSUMED — standard pattern from @supabase/ssr documentation which was confirmed present in STACK.md and ARCHITECTURE.md]

```typescript
// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // 'next' is set by the sign-in initiation to encode the plan path to return to
  const next = searchParams.get('next') ?? '/me';

  if (!code) {
    return NextResponse.redirect(new URL('/errors/auth-error', request.url));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  // 1. Exchange the OAuth code for a session.
  //    If the user was anonymous before clicking "Continuar con Google",
  //    the anonymous session cookie is already set — exchangeCodeForSession
  //    merges/links when called on the same client that has the anon session.
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    // Check for email collision (see collision section below)
    if (error?.message?.includes('identity already exists')) {
      const params = new URLSearchParams({ error: 'account_exists', next });
      return NextResponse.redirect(new URL(`/auth/sign-in?${params}`, request.url));
    }
    return NextResponse.redirect(new URL('/errors/auth-error', request.url));
  }

  // 2. The anonymous user_id is now the authenticated user_id (linkIdentity preserved it).
  //    Insert plan_members row using the app_metadata set at invite time.
  const userId = data.user.id;
  const appMeta = data.user.app_metadata as {
    plan_id?: string;
    invite_token_id?: string;
  };

  if (appMeta?.plan_id) {
    // Read the role from the invite token
    const serviceRole = createServiceRoleClient();
    const { data: tokenRow } = await serviceRole
      .from('invite_tokens')
      .select('role')
      .eq('id', appMeta.invite_token_id)
      .single();

    const role = tokenRow?.role ?? 'viewer';

    // Upsert — safe if user somehow triggers callback twice
    await serviceRole
      .from('plan_members')
      .upsert(
        {
          plan_id: appMeta.plan_id,
          user_id: userId,
          role,
          joined_via_token_id: appMeta.invite_token_id,
        },
        { onConflict: 'plan_id,user_id', ignoreDuplicates: true }
      );
  }

  // 3. Redirect back to the plan (or /me if no plan context)
  return NextResponse.redirect(new URL(next, origin));
}
```

### Is `linkIdentity` client-side or server-side?

`supabase.auth.linkIdentity({ provider: 'google' })` is the **client-side initiation** of the OAuth link flow — it redirects to Google. The **server-side callback** (`exchangeCodeForSession`) is what completes the link when called on a client that already holds an anonymous session cookie. In the App Router pattern, `exchangeCodeForSession` in `/auth/callback/route.ts` handles both cases (new user AND anonymous-to-linked upgrade) automatically when the `@supabase/ssr` server client is used. You do NOT need to call `linkIdentity()` explicitly in the callback — the code exchange itself performs the link. [ASSUMED — this is the standard @supabase/ssr pattern; confirmed consistent with ARCHITECTURE.md §"Hybrid Auth Flow"]

### Email Collision: What Happens

When the Google account's email already belongs to a separate (non-anonymous) Supabase user, `exchangeCodeForSession` returns an error. The error message contains `"identity already exists"` or similar. [ASSUMED — exact error code not confirmed in official docs; behavior is consistent with Supabase's identity linking constraints]

**Recovery UX:**

The callback route detects the collision and redirects to `/auth/sign-in?error=account_exists&next={plan_path}`. The sign-in page reads the `error` param and displays:

```
es.json key: "auth.error_account_exists"
value: "Esa cuenta ya está en uso. Inicia sesión y reabre el link."
```

The user signs in with their existing account (same "Continuar con Google" button), then the plan path encoded in `next` sends them directly to the plan. Because they are now authenticated with a real account, RLS allows them to be added to `plan_members` if they revisit the invite link while authenticated.

**Implementation note:** The sign-in page must preserve the `next` param through the sign-in flow so the redirect after a "collision recovery" sign-in returns the user to the correct plan.

---

## Area 3: Drizzle + Supabase Migration Workflow

### File Layout (Official Split)

The Supabase × Drizzle official docs confirm: use Drizzle for table schema, raw SQL for RLS. [VERIFIED: supabase.com/docs/guides/database/drizzle — confirms schema.ts + db.ts structure and Connection Pooler usage]

```
drizzle/
  schema.ts           # Table definitions (Drizzle typescript)
  db.ts               # Drizzle client (postgres driver, Connection Pooler URL)
  migrations/         # Auto-generated by drizzle-kit generate
    0001_initial.sql
    0002_add_archived_at.sql
    meta/             # Drizzle internal migration journal

supabase/
  config.toml         # Local Supabase config
  seed.sql            # Local seed data (test plans, members, tokens)
  policies/           # RLS policies — one file per table
    plans.sql
    plan_members.sql
    invite_tokens.sql
  migrations/         # Auth hook + functions that Drizzle cannot manage
    001_auth_hook.sql
    002_rls_enable.sql
```

**Key discipline:** Drizzle migrations touch only DDL (CREATE TABLE, ALTER TABLE). They must never include `CREATE POLICY`, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, or function definitions. Those live exclusively in `supabase/policies/` and `supabase/migrations/`. This separation means Drizzle Studio can introspect the schema without being confused by policy syntax.

### Local Dev Command Sequence

```bash
# Step 1: Start local Supabase (Postgres + Auth + Storage + Studio)
pnpm supabase start
# Outputs: local DB URL, anon key, service_role key, Studio URL (localhost:54323)

# Step 2: Copy local connection strings to .env.local
# DATABASE_URL = Connection Pooler URL (from supabase status output)
# SUPABASE_URL = http://localhost:54321
# SUPABASE_ANON_KEY = <from supabase status>
# SUPABASE_SERVICE_ROLE_KEY = <from supabase status>

# Step 3: Generate Drizzle migration from schema.ts changes
pnpm drizzle-kit generate

# Step 4: Apply Drizzle migrations to local Supabase Postgres
pnpm drizzle-kit migrate

# Step 5: Apply RLS policies (two options — choose one and be consistent)
# Option A: psql (requires psql installed)
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f supabase/policies/plans.sql
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f supabase/policies/plan_members.sql
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f supabase/policies/invite_tokens.sql
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f supabase/migrations/001_auth_hook.sql

# Option B: supabase db push (applies all files in supabase/migrations/ folder)
# NOTE: supabase db push applies files in supabase/migrations/ to local DB.
# This means your auth hook SQL and RLS-enable SQL must be in supabase/migrations/,
# while the policy bodies can be applied via psql or also via supabase/migrations/ files.
pnpm supabase db push

# Step 6: Seed test data
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f supabase/seed.sql

# Step 7: Open Drizzle Studio to inspect schema
pnpm drizzle-kit studio
# Opens at https://local.drizzle.studio
```

### `drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### `drizzle/db.ts`

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Use Connection Pooler URL for serverless/edge (not direct connection)
const queryClient = postgres(process.env.DATABASE_URL!);
export const db = drizzle(queryClient, { schema });
```

### Production vs Local Connection Pooler

Supabase Connection Pooler (Supavisor) uses port 6543 for transaction mode (serverless/edge functions) and port 5432 for session mode (migrations). The `DATABASE_URL` for migrations must use port 5432 (direct connection). The `DATABASE_URL` for the app at runtime must use port 6543 (pooler). [ASSUMED — standard Supabase guidance; the official Drizzle + Supabase guide notes the local Docker address difference]

Use two env vars:
- `DATABASE_URL` — connection pooler, port 6543, for `drizzle/db.ts` (runtime queries)
- `DATABASE_MIGRATION_URL` — direct connection, port 5432, for `drizzle.config.ts` (migrations only)

### Seeding for Tests

```sql
-- supabase/seed.sql
-- Runs after Drizzle migrations and RLS policies are applied.
-- Uses service role implicitly (psql direct connection bypasses RLS).

insert into plans (id, slug, title, owner_id, created_at)
values (
  '00000000-0000-0000-0000-000000000001',
  'test-plan-abc12345',
  'Plan de prueba para tests',
  '00000000-0000-0000-0000-000000000099',  -- test owner user_id
  now()
);

insert into invite_tokens (id, plan_id, token, role, created_by)
values (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'test-token-valid-22chars00',
  'viewer',
  '00000000-0000-0000-0000-000000000099'
);
```

---

## Area 4: RLS Policy SQL for Phase 1 Tables

Enable RLS on all three tables first:

```sql
-- supabase/migrations/002_rls_enable.sql
alter table plans enable row level security;
alter table plan_members enable row level security;
alter table invite_tokens enable row level security;

-- Expose tables to authenticated and anon roles
grant select, insert, update, delete on plans to authenticated;
grant select on plans to anon;
grant select, insert, update, delete on plan_members to authenticated;
grant select, insert, update, delete on invite_tokens to authenticated;
```

### `plans` Table Policies

```sql
-- supabase/policies/plans.sql

-- SELECT: anon with matching plan_id claim OR authenticated plan member
create policy "plans_select_anon_with_claim"
on plans for select
to anon
using (
  id = (auth.jwt() ->> 'plan_id')::uuid
);

create policy "plans_select_member"
on plans for select
to authenticated
using (
  (select auth.uid()) in (
    select user_id from plan_members where plan_id = plans.id
  )
  or (select auth.uid()) = owner_id  -- owner can always see their plan
);

-- INSERT: any authenticated user (becomes owner)
create policy "plans_insert_authenticated"
on plans for insert
to authenticated
with check (
  (select auth.uid()) = owner_id
);

-- UPDATE: only owner (including soft-delete via archived_at)
create policy "plans_update_owner_only"
on plans for update
to authenticated
using (
  (select auth.uid()) = owner_id
)
with check (
  (select auth.uid()) = owner_id
);

-- DELETE: blocked at DB level (soft-delete only via archived_at UPDATE)
-- No DELETE policy is defined; default deny covers this.
-- If hard-delete is ever needed, add explicitly.
```

### `plan_members` Table Policies

```sql
-- supabase/policies/plan_members.sql

-- SELECT: anon with matching plan_id claim OR any authenticated member of the same plan
create policy "plan_members_select_anon_with_claim"
on plan_members for select
to anon
using (
  plan_id = (auth.jwt() ->> 'plan_id')::uuid
);

create policy "plan_members_select_member"
on plan_members for select
to authenticated
using (
  plan_id in (
    select pm.plan_id from plan_members pm
    where pm.user_id = (select auth.uid())
  )
);

-- INSERT: authenticated user inserting themselves (joining via valid token)
-- OR owner inserting others (future use — owner can add member manually)
create policy "plan_members_insert_self_or_owner"
on plan_members for insert
to authenticated
with check (
  -- User inserting themselves
  user_id = (select auth.uid())
  or
  -- Owner of the plan inserting someone else
  (select auth.uid()) in (
    select owner_id from plans where id = plan_id
  )
);

-- UPDATE: owner can change role; member can update their own row (e.g., display preferences)
create policy "plan_members_update_owner_or_self"
on plan_members for update
to authenticated
using (
  user_id = (select auth.uid())
  or
  (select auth.uid()) in (
    select owner_id from plans where id = plan_id
  )
)
with check (
  user_id = (select auth.uid())
  or
  (select auth.uid()) in (
    select owner_id from plans where id = plan_id
  )
);

-- DELETE: owner removing any member, OR self-removal
create policy "plan_members_delete_owner_or_self"
on plan_members for delete
to authenticated
using (
  user_id = (select auth.uid())
  or
  (select auth.uid()) in (
    select owner_id from plans where id = plan_id
  )
);
```

### `invite_tokens` Table Policies

```sql
-- supabase/policies/invite_tokens.sql

-- SELECT: only the plan owner
create policy "invite_tokens_select_owner"
on invite_tokens for select
to authenticated
using (
  (select auth.uid()) in (
    select owner_id from plans where id = plan_id
  )
);

-- INSERT: only the plan owner
create policy "invite_tokens_insert_owner"
on invite_tokens for insert
to authenticated
with check (
  (select auth.uid()) in (
    select owner_id from plans where id = plan_id
  )
  and created_by = (select auth.uid())
);

-- UPDATE (revoke = set revoked_at): only the plan owner
-- No hard-delete policy — soft-delete only via revoked_at
create policy "invite_tokens_update_owner"
on invite_tokens for update
to authenticated
using (
  (select auth.uid()) in (
    select owner_id from plans where id = plan_id
  )
)
with check (
  (select auth.uid()) in (
    select owner_id from plans where id = plan_id
  )
);

-- DELETE: no policy — never hard-delete invite tokens (audit/analytics)
-- Default deny applies.
```

### RLS Design Notes

1. **Performance:** Always wrap `auth.uid()` in `(select auth.uid())` — Supabase's own docs recommend this to avoid the function being called once per row vs. once per query. [VERIFIED: supabase.com/docs/guides/database/postgres/row-level-security]

2. **`app_metadata` vs top-level claim in RLS:** The Custom Access Token Hook promotes `plan_id` from `app_metadata` to a top-level claim. In RLS, use `auth.jwt() ->> 'plan_id'` (top-level), not `auth.jwt() -> 'app_metadata' ->> 'plan_id'` (nested). Both work, but top-level is cleaner and is what the hook is for.

3. **Defense-in-depth:** The `plans` anon SELECT policy and the `plan_members` anon SELECT policy both require the `plan_id` JWT claim to match. If a forged JWT omits the claim, the cast `(auth.jwt() ->> 'plan_id')::uuid` returns null, which never equals any real UUID. No explicit null-check needed.

4. **`invite_tokens` is never readable by anon.** The validation in `/api/invite/[token]/route.ts` uses the service-role client. Anonymous users should never be able to enumerate tokens or see token metadata via RLS.

---

## Area 5: Bootstrap Order — Exact Commands for the Walking Skeleton

### Prerequisites

```bash
# Verify toolchain
node --version   # Requires 20.x+
pnpm --version   # Requires 9+
docker --version # Supabase CLI requires Docker
supabase --version # Requires 2.x+ (install: brew install supabase/tap/supabase)
```

### Step 1: Create Next.js 15.5 App

```bash
pnpm create next-app@15.5 group-coordinator \
  --typescript \
  --tailwind \
  --app \
  --eslint=false \
  --src-dir \
  --import-alias "@/*"

cd group-coordinator
```

This creates: TypeScript + Tailwind v4 + App Router + `src/` directory + `@/*` import alias + NO ESLint config (we immediately replace with Biome). [VERIFIED: STACK.md §Installation]

### Step 2: Replace ESLint with Biome

```bash
# Remove ESLint (create-next-app installs it even with --eslint=false in some versions)
pnpm remove eslint eslint-config-next 2>/dev/null || true

# Install Biome (exact version pin for reproducibility)
pnpm add -D --save-exact @biomejs/biome

# Initialize Biome config
pnpm biome init
```

Edit `biome.json` to enable import sorting and add Next.js-relevant overrides:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "files": {
    "ignore": [".next/", "node_modules/", "drizzle/migrations/"]
  }
}
```

Add scripts to `package.json`:
```json
"scripts": {
  "lint": "biome lint ./src",
  "format": "biome format --write ./src",
  "check": "biome check --write ./src"
}
```

### Step 3: Install All Phase 1 Dependencies

```bash
# Supabase
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add -D supabase

# Drizzle ORM
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit

# Auth + forms + validation
pnpm add react-hook-form @hookform/resolvers zod next-safe-action

# i18n
pnpm add next-intl

# UI
pnpm add nanoid  # For token generation (crypto.randomBytes-backed)
pnpm add lucide-react sonner

# Testing
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react
pnpm add -D @playwright/test
pnpm exec playwright install --with-deps chromium  # Install only Chromium for Phase 1
```

### Step 4: Initialize shadcn/ui

```bash
pnpm dlx shadcn@latest init
# Select: New York style, Zinc base color, CSS variables: yes
# After init, add Phase 1 components:
pnpm dlx shadcn@latest add \
  button card dialog form input label select \
  sonner tabs toast tooltip dropdown-menu avatar badge \
  command sheet
```

### Step 5: Initialize Supabase

```bash
# Initialize Supabase project config
pnpm supabase init

# Start local Supabase (requires Docker running)
pnpm supabase start

# Copy connection strings from output to .env.local
```

### Step 6: Minimum `.env.local` Keys

```bash
# .env.local (never commit this file)

# Supabase local (replace with Supabase Dashboard values for prod/staging)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<from supabase status>

# Database (two URLs — see Area 3 note on port 5432 vs 6543)
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
DATABASE_MIGRATION_URL=postgresql://postgres:postgres@localhost:54322/postgres
# On local, both use port 54322 direct. On hosted Supabase, DATABASE_URL uses 6543.

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Supabase key format note:** New Supabase projects use `sb_publishable_*` / `sb_secret_*` format. The env var names above use the legacy naming convention for code clarity; the actual key values follow the new format. [VERIFIED: STACK.md §Version Compatibility]

### Step 7: Create Drizzle Schema (Phase 1 Tables)

```typescript
// drizzle/schema.ts
import {
  pgTable, uuid, text, timestamp, integer, pgEnum
} from 'drizzle-orm/pg-core';

export const planMemberRoleEnum = pgEnum('plan_member_role', ['owner', 'editor', 'viewer']);

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),  // 8-char nanoid
  title: text('title').notNull(),
  description: text('description'),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  ownerId: uuid('owner_id').notNull(),  // References auth.users(id) — FK not declared (cross-schema)
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const planMembers = pgTable('plan_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id').notNull().references(() => plans.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),  // References auth.users(id)
  role: planMemberRoleEnum('role').notNull().default('viewer'),
  joinedViaTokenId: uuid('joined_via_token_id'),  // FK to invite_tokens.id (nullable)
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
});

export const inviteTokens = pgTable('invite_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id').notNull().references(() => plans.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),  // nanoid 22 chars
  role: planMemberRoleEnum('role').notNull().default('viewer'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdBy: uuid('created_by').notNull(),  // References auth.users(id)
  useCount: integer('use_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

Generate and apply migration:
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### Step 8: Apply Auth Hook + RLS Policies

```bash
# Apply auth hook function
psql "$DATABASE_MIGRATION_URL" -f supabase/migrations/001_auth_hook.sql

# Apply RLS enable + grants
psql "$DATABASE_MIGRATION_URL" -f supabase/migrations/002_rls_enable.sql

# Apply per-table RLS policies
psql "$DATABASE_MIGRATION_URL" -f supabase/policies/plans.sql
psql "$DATABASE_MIGRATION_URL" -f supabase/policies/plan_members.sql
psql "$DATABASE_MIGRATION_URL" -f supabase/policies/invite_tokens.sql

# Seed test data
psql "$DATABASE_MIGRATION_URL" -f supabase/seed.sql
```

Then enable the Custom Access Token Hook in Supabase local Dashboard:
- Open http://localhost:54323 (Studio)
- Authentication → Hooks → Custom Access Token Hook → select `public.custom_access_token_hook`

### Step 9: Scaffold next-intl

```typescript
// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['es', 'en', 'pt'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',  // /plan/abc (es), /en/plan/abc, /pt/plan/abc
});
```

```typescript
// src/middleware.ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

Create message files:
```bash
mkdir -p src/lib/i18n/messages
# Copy the full es.json from 01-UI-SPEC.md §Microcopy Catalog
# Create en.json and pt.json as copies of es.json (stubbed for Phase 7 translation)
```

### Step 10: Supabase Client Triplet

```typescript
// src/lib/supabase/server.ts
import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

export function createServerClient(cookieStore: ReadonlyRequestCookies) {
  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {} // Can throw in Server Components — ignore
        },
      },
    }
  );
}

// src/lib/supabase/browser.ts
import { createBrowserClient } from '@supabase/ssr';
let client: ReturnType<typeof createBrowserClient> | null = null;
export function getBrowserClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}

// src/lib/supabase/service-role.ts
import { createClient } from '@supabase/supabase-js';
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```

### Step 11: Google OAuth Configuration

In Supabase Dashboard (local Studio or hosted):
- Authentication → Providers → Google → Enable
- Add `http://localhost:3000/auth/callback` to Authorized Redirect URIs
- Add `NEXT_PUBLIC_SITE_URL/auth/callback` for each environment

Initiate sign-in from client (the bottom sheet "Continuar con Google" button):

```typescript
// Client component — called from sign-in bottom sheet
import { getBrowserClient } from '@/lib/supabase/browser';

async function signInWithGoogle(nextPath: string) {
  const supabase = getBrowserClient();
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      queryParams: { prompt: 'select_account' },
    },
  });
  // Page redirects to Google; no further action needed here
}
```

### Step 12: First Route (`/plan/new`)

This proves the Walking Skeleton end-to-end: form → Server Action → DB → redirect to plan view.

```typescript
// server/actions/plan.ts
'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/drizzle/db';
import { plans, inviteTokens } from '@/drizzle/schema';
import { createServerClient } from '@/lib/supabase/server';
import { nanoid, customAlphabet } from 'nanoid';

const SLUG_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const TOKEN_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'; // no-lookalike
const generateSlug = customAlphabet(SLUG_ALPHABET, 8);
const generateToken = customAlphabet(TOKEN_ALPHABET, 22);

const createPlanSchema = z.object({
  title: z.string().min(1, 'El título del plan es obligatorio.').max(200),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().max(1000).optional(),
});

export async function createPlan(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/sign-in');

  const parsed = createPlanSchema.safeParse({
    title: formData.get('title'),
    startDate: formData.get('startDate') || undefined,
    endDate: formData.get('endDate') || undefined,
    description: formData.get('description') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  const slug = generateSlug();
  const token = generateToken();

  const [newPlan] = await db.insert(plans).values({
    slug,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
    endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    ownerId: user.id,
  }).returning();

  await db.insert(inviteTokens).values({
    planId: newPlan.id,
    token,
    role: 'viewer',
    createdBy: user.id,
  });

  redirect(`/plan/${slug}?share=1`);  // ?share=1 triggers auto-open of share dialog on client
}
```

### Step 13: First E2E Playwright Test (Walking Skeleton Proof)

```typescript
// tests/e2e/walking-skeleton.spec.ts
import { test, expect } from '@playwright/test';

test('Walking Skeleton: create plan and view invite link', async ({ page, context }) => {
  // This test requires a test user account set up in Supabase local seed
  // For CI: use Supabase local + a seeded test user with a service-role bypass approach
  // For local dev: can use actual Google OAuth (manual) or a test bypass

  // 1. Sign in (bypass approach for CI — see Open Questions)
  await page.goto('http://localhost:3000/plan/new');

  // 2. Fill create form
  await page.getByLabel('Título del plan').fill('Plan de prueba E2E');
  await page.getByRole('button', { name: 'Crear plan' }).click();

  // 3. Assert share dialog opens
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('¡Plan creado!')).toBeVisible();

  // 4. Copy the invite link
  const linkText = await page.getByRole('textbox', { name: /invite link/i }).inputValue();
  expect(linkText).toMatch(/\/i\//);

  // 5. Open invite link in incognito context
  const incognitoContext = await context.browser()!.newContext();
  const guestPage = await incognitoContext.newPage();
  await guestPage.goto(linkText);

  // 6. Assert plan title visible in guest view (no sign-in required)
  await expect(guestPage.getByRole('heading', { name: 'Plan de prueba E2E' })).toBeVisible();
  await expect(guestPage.getByText('Iniciar sesión')).toBeVisible();

  await incognitoContext.close();
});
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x (unit) + Playwright 1.49+ (E2E) |
| Vitest config | `vitest.config.ts` in project root |
| Playwright config | `playwright.config.ts` in project root |
| Vitest quick run | `pnpm vitest run` |
| Playwright E2E run | `pnpm playwright test` |
| Full suite | `pnpm vitest run && pnpm playwright test` |

### Critical E2E Flows (Phase 1 Must Pass)

| Flow ID | Description | Auth State | Automated? |
|---------|-------------|-----------|------------|
| E2E-01 | Create plan → share dialog opens → copy invite link | Authenticated (Google) | Yes — but requires OAuth bypass for CI |
| E2E-02 | Open invite link in incognito → see plan name + member list | Anonymous (via link) | Yes |
| E2E-03 | Sign in with Google from anonymous state → land back on same plan, avatar appears | Anon → Authenticated | Manual in dev; CI needs bypass |
| E2E-04 | Owner revokes invite token → old link redirects to error page | Authenticated (owner) | Yes |
| E2E-05 | Owner archives plan → plan disappears from /me list | Authenticated (owner) | Yes |

### Test Pyramid Mix

```
           E2E (Playwright) — 5 critical flows
          /                                    \
    Integration (Vitest + real local Supabase)  \
    - RLS policy tests (direct DB queries)        \
    - Server Action tests (happy + error paths)    \
       /                                            \
   Unit (Vitest) — pure functions only
   - nanoid token generation (entropy check)
   - Zod schema validation (boundary values)
   - es.json key coverage (all keys present)
```

### Unit Tests (Vitest)

These test pure functions with no external dependencies:

```typescript
// tests/unit/token.test.ts
import { describe, it, expect } from 'vitest';
import { customAlphabet } from 'nanoid';

const TOKEN_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const generateToken = customAlphabet(TOKEN_ALPHABET, 22);

describe('invite token generation', () => {
  it('generates tokens of exactly 22 characters', () => {
    const token = generateToken();
    expect(token.length).toBe(22);
  });

  it('uses only no-lookalike alphabet characters', () => {
    const token = generateToken();
    const disallowed = /[01IlO]/;
    expect(token).not.toMatch(disallowed);
  });

  it('generates unique tokens (collision test on 10k)', () => {
    const tokens = new Set(Array.from({ length: 10_000 }, generateToken));
    expect(tokens.size).toBe(10_000);
  });
});
```

### RLS Policy Tests (Vitest + local Supabase)

```typescript
// tests/integration/rls-plans.test.ts
// Requires: supabase start + migrations applied + seed.sql run
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

describe('RLS: plans table', () => {
  it('anon user WITHOUT plan_id claim cannot SELECT any plan', async () => {
    const client = createClient(URL, ANON_KEY);
    const { data, error } = await client.from('plans').select('id').limit(5);
    expect(data).toHaveLength(0);  // RLS blocks all rows
  });

  // Additional tests require minting real JWTs with custom claims —
  // use the Supabase local admin API to create test users with app_metadata set
});
```

### Mock-vs-Real Strategy

| Layer | Strategy | Rationale |
|-------|----------|-----------|
| Database (Postgres + RLS) | **Real** — local Supabase via `supabase start` | RLS policies cannot be unit-tested in isolation; must execute against real Postgres |
| Auth (anonymous sign-in) | **Real** — local Supabase Auth | Auth hooks execute only on real Supabase Auth; mock would defeat the purpose |
| Google OAuth (E2E) | **Bypass** for CI — create a test user with a long-lived refresh token, or use Supabase's `signInWithPassword` on a test account created in the local seed | Google OAuth redirect cannot be automated without a real browser session logged in to Google |
| Server Actions | **Real** in integration tests; unit-test the Zod validation layer separately | Ensures the full request pipeline (Zod → Drizzle → RLS) is tested |
| next-intl translations | **Mock** — pass raw strings in tests; don't test `t('key')` returns the Spanish string | i18n correctness is verified by key-presence tests, not translation accuracy |

### Done Criteria

Phase 1 is verified when:
1. All 5 E2E flows (E2E-01 through E2E-05) pass on Chromium desktop viewport.
2. E2E-02 and E2E-04 additionally pass on `iPhone 12` viewport (Playwright mobile emulation).
3. RLS integration tests confirm: anon-without-claim cannot read any plan; anon-with-matching-claim can read the correct plan only; authenticated member can read their plans; owner can update/archive; non-owner cannot update.
4. Unit tests pass: token generation entropy, Zod schema validation, es.json key coverage.
5. `pnpm check` (Biome) passes with zero violations.
6. First plan visible at `/plan/[slug]` in a browser with no console errors.

---

## Walking Skeleton Checklist

The Walking Skeleton proves end-to-end integration before any feature polish. Each item is a binary pass/fail.

```
SKELETON CHECKLIST — Phase 1

Infrastructure
  [ ] pnpm create next-app@15.5 completes without errors
  [ ] Biome replaces ESLint — `pnpm check` runs and reports zero violations on src/
  [ ] shadcn init completes — `components/ui/button.tsx` exists
  [ ] `supabase start` succeeds — Studio accessible at http://localhost:54323
  [ ] Drizzle migrations applied — all 3 Phase 1 tables visible in Studio
  [ ] RLS policies applied — confirmed via `SELECT * FROM pg_policies WHERE tablename IN ('plans','plan_members','invite_tokens')`
  [ ] Auth hook deployed — visible under Authentication → Hooks in local Studio
  [ ] `.env.local` populated with local Supabase keys

Auth Spine
  [ ] Google OAuth configured — local Studio shows Google provider enabled
  [ ] Sign-in at /auth/sign-in redirects to Google and returns to /auth/callback
  [ ] `/auth/callback` successfully exchanges code and sets session cookie
  [ ] Session persists across page refresh (check auth.getUser() returns user)

Plan Lifecycle
  [ ] Authenticated user can access /plan/new (no redirect to sign-in)
  [ ] `createPlan` Server Action inserts row in `plans` table — confirmed via Studio
  [ ] `createPlan` inserts row in `invite_tokens` table — confirmed via Studio
  [ ] After create, user redirects to /plan/[slug] — slug visible in URL bar
  [ ] Share dialog auto-opens at /plan/[slug]?share=1
  [ ] Copyable invite link renders in dialog — format `/i/[22-char-token]`

Anonymous Link View
  [ ] Opening /i/[token] in incognito does NOT error (200 or 302, not 500)
  [ ] /i/[token] redirects to /plan/[slug] in incognito
  [ ] Plan title visible in incognito without sign-in
  [ ] "Iniciar sesión" affordance visible in header in incognito
  [ ] Sign-in affordance bar visible at bottom of plan view in incognito
  [ ] No console errors related to RLS or JWT

Anonymous → Authenticated Upgrade
  [ ] Clicking "Continuar con Google" in incognito redirects to Google OAuth
  [ ] After OAuth, user lands back on /plan/[slug] (not /me or /)
  [ ] `plan_members` row inserted — confirmed via Studio
  [ ] Header shows avatar, not "Iniciar sesión"
  [ ] Anonymous session user_id matches post-OAuth user_id (linkIdentity preserved it)

My Plans
  [ ] /me shows at least one plan card after plan creation
  [ ] Plan cards ordered by updated_at DESC
  [ ] Unauthenticated visit to /me redirects to sign-in

Settings
  [ ] /plan/[slug]/settings accessible by owner only — non-owner redirects to /plan/[slug]
  [ ] "Revocar link" sets revoked_at on invite_tokens row
  [ ] After revocation, opening /i/[old-token] redirects to error page (not the plan)
  [ ] "Archivar plan" sets archived_at — plan disappears from /me list

i18n Scaffold
  [ ] No hardcoded Spanish strings in any .tsx file — all strings use t('key')
  [ ] es.json populated with all keys from UI-SPEC §Microcopy Catalog
  [ ] en.json and pt.json exist with same keys (values may be stubbed)

OG Image
  [ ] /api/og/[plan_slug] returns 1200×630 PNG — confirmed via curl or browser
  [ ] Plan title appears in OG image
  [ ] Geist font loads correctly (no fallback font rendering)

Security Baseline
  [ ] All /plan/* and /i/* pages have <meta name="robots" content="noindex"> in head
  [ ] Response headers include Referrer-Policy: strict-origin-when-cross-origin
  [ ] /api/invite/[token] returns 404 (not 500) for unknown tokens
  [ ] RLS test: unauthenticated supabase.from('plans').select() returns 0 rows
```

---

## Common Pitfalls

### Pitfall 1: `signInAnonymously` Custom Claim Not Appearing in JWT

**What goes wrong:** Developer sets `data: { plan_id }` in `signInAnonymously()`, writes RLS that uses `auth.jwt() ->> 'plan_id'`, and gets no rows back because the claim isn't in the JWT.

**Why it happens:** `data` maps to `raw_user_meta_data`, which is NOT automatically a JWT claim. JWT claims come from `app_metadata` (server-controlled) and only when a Custom Access Token Hook promotes them.

**How to avoid:** Use the auth hook (Area 1). Set `app_metadata` via service-role `updateUserById`, then call `refreshSession()` before redirecting. Never rely on `user_metadata` for security-critical claims.

### Pitfall 2: Session Cookie Not Set Before Redirect

**What goes wrong:** `/api/invite/[token]/route.ts` calls `signInAnonymously()` and immediately does `NextResponse.redirect(...)`. The session cookie is not set because `@supabase/ssr` needs to call `setAll` on the response, but the redirect short-circuits this.

**How to avoid:** Use `NextResponse.redirect(url)` as the return value, but build the response object and let `@supabase/ssr` set cookies on it before returning. Pattern:

```typescript
const response = NextResponse.redirect(new URL(`/plan/${slug}`, request.url));
// @supabase/ssr server client will have set cookies on the response object
// if you constructed the client with the response's cookie setters.
// Alternatively: set the cookie manually on the response after refreshSession().
```

The CONTEXT.md specifics note: "The `/i/[token]` redirect should set the session cookie BEFORE the 302 — Supabase SSR helpers handle this if used correctly." The key is passing both `getAll` and `setAll` handlers that write to the `response` object, not just the `cookieStore`.

### Pitfall 3: `linkIdentity` During `exchangeCodeForSession` Not Preserving Anonymous ID

**What goes wrong:** The anonymous user ID after OAuth is different from the pre-OAuth anonymous user ID. `plan_members` is inserted for the new ID; the anonymous session's `plan_id` JWT claim no longer maps to any plan.

**Why it happens:** `linkIdentity` preserves the identity only when the OAuth flow is initiated from the same client that holds the anonymous session cookie. If the OAuth is initiated without a session (fresh browser), it creates a new user.

**How to avoid:** The "Continuar con Google" button must be tapped from a page where the anonymous session cookie is already set (i.e., after the user has visited the plan via the invite link). The `next` param encodes the plan path so the callback can re-associate. The callback should upsert `plan_members` — not insert — so a double-trigger is safe.

### Pitfall 4: Drizzle Migrations Clash With RLS

**What goes wrong:** Developer adds an RLS policy to the Drizzle schema file using `sql` template tags. Drizzle regenerates the migration, sees the policy changed, generates a `DROP POLICY` + `CREATE POLICY` diff, and accidentally deletes a production policy during the next deploy.

**How to avoid:** Keep RLS entirely out of Drizzle schema files. Policies live in `supabase/policies/` only. Apply them separately from `drizzle-kit migrate`. Never reference RLS syntax in `drizzle/schema.ts`.

### Pitfall 5: `auth.uid()` in RLS Called Once Per Row Instead of Once Per Query

**What goes wrong:** Performance issue: each row evaluation calls `auth.uid()` as a function, which is expensive for large tables.

**How to avoid:** Wrap in a subquery: `(select auth.uid())`. This is what the official Supabase RLS docs recommend and is what all policies in Area 4 use. [VERIFIED: supabase.com/docs/guides/database/postgres/row-level-security]

### Pitfall 6: Supabase Free Project Pauses After 7 Days

**What goes wrong:** Local dev is fine. You deploy to a Supabase free tier hosted project. Nobody visits for a week. The project pauses. Playwright CI fails because the DB connection is refused.

**How to avoid:** For CI, use local Supabase (`supabase start` in the CI job) rather than a hosted free project. For staging/production testing, upgrade to Pro ($25/mo) to remove the pause. Document this explicitly in the CI pipeline setup task.

---

## Open Questions for Planner

1. **Google OAuth in CI E2E tests:** How should E2E-01 and E2E-03 (which require actual Google OAuth) run in CI? Options: (a) seed a Supabase test user with email+password and call `signInWithPassword` in tests — bypasses Google entirely, (b) use Playwright's stored auth state with a real Google test account, (c) mark E2E-01 and E2E-03 as manual-only and only automate E2E-02, E2E-04, E2E-05. **Recommendation:** Option (a) — seed a `test@groupcoordinator.local` user via Supabase Admin API in the CI setup step; `signInWithPassword` gives a real session without Google dependency.

2. **`use_count` field on `invite_tokens`:** The UI-SPEC shows "Usado N veces" in the token row. The schema includes `use_count integer`. The increment happens in the invite handler (Area 1, step 5). This is a non-atomic increment under concurrent load. For v1 (low concurrency per plan), this is acceptable. Planner should decide: is `use_count` best incremented with a raw SQL `UPDATE invite_tokens SET use_count = use_count + 1 WHERE id = ?` (atomic) vs. read-then-write in app code?

3. **`plan_members` unique constraint:** The `upsert` in the OAuth callback uses `onConflict: 'plan_id,user_id'`. This requires a UNIQUE constraint on `(plan_id, user_id)` in the Drizzle schema. The schema in Area 5 omits this constraint. Planner should add it.

4. **Locale prefix behavior for `/i/[token]`:** The next-intl middleware config includes a matcher that catches all non-API routes. If `/i/[token]` is under `[locale]`, then the URL becomes `/es/i/[token]`. If it's under `app/` directly (not under `[locale]`), it works but misses locale routing. Planner must decide: does `/i/[token]` live inside or outside `[locale]`? Recommendation: outside (`app/i/[token]/page.tsx` or `app/api/invite/[token]/route.ts`) — the invite landing has no localized UI before the redirect.

5. **`archived_at` vs hard delete UX:** The UI-SPEC §Surface 6 labels both "Archivar plan" and "Eliminar plan" but both map to setting `archived_at` (D-05 soft-delete). The DELETE button copy says "Eliminar" but the behavior is the same as archive. The dialog copy clarifies: "Esta acción archivará el plan." Planner must ensure the executor implements both buttons as `UPDATE plans SET archived_at = now()` — there is no hard delete in Phase 1.

6. **`/me` route under `[locale]` or not:** ARCHITECTURE.md shows `/me` inside `[locale]` (as `app/[locale]/(app)/me/page.tsx`). Confirm this is the planner's intent — the authenticated "My plans" page should be locale-aware.

---

## Sources

### Primary (HIGH confidence — verified against official docs this session)
- [Supabase: Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) — Hook function signature, required claims, SQL example structure
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — Policy syntax, `auth.uid()`, `auth.jwt()`, `app_metadata` vs `user_metadata` distinction, `(select auth.uid())` performance pattern
- [Supabase: Drizzle integration](https://supabase.com/docs/guides/database/drizzle) — schema.ts + db.ts layout, Connection Pooler usage, local Docker address
- [Supabase: Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous) — `signInAnonymously()` API, `linkIdentity` method reference

### Secondary (MEDIUM confidence — consistent with project research + training knowledge)
- STACK.md, ARCHITECTURE.md, 01-CONTEXT.md — project-level locked decisions used as ground truth throughout
- 01-UI-SPEC.md — es.json microcopy catalog, surface specifications

### Tertiary (ASSUMED — training knowledge, not re-verified this session)
- `exchangeCodeForSession` completing `linkIdentity` automatically — consistent with @supabase/ssr design but not re-confirmed via doc fetch
- `linkIdentity` email collision error message text — behavior described in Supabase docs but exact error code not confirmed
- Connection Pooler port 5432 vs 6543 distinction for migration vs runtime — standard Supabase guidance, not re-fetched

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `exchangeCodeForSession` on the SSR server client automatically completes the `linkIdentity` for an anonymous user — no explicit `linkIdentity()` call needed in the callback | Area 2 | If wrong: need to add a separate `supabase.auth.linkIdentity()` call client-side after callback, or call `admin.linkIdentity()` server-side — adds complexity |
| A2 | Email collision in `linkIdentity` / `exchangeCodeForSession` produces an error with message containing `"identity already exists"` | Area 2 | If wrong: collision goes undetected, user sees a confusing error page instead of the Spanish recovery copy |
| A3 | `app_metadata` set via `updateUserById` is available to the Custom Access Token Hook on the NEXT token issuance (after `refreshSession`) | Area 1 | If wrong: the JWT never carries `plan_id`, RLS blocks all anonymous access — architecture fails |
| A4 | Connection Pooler for runtime uses port 6543; direct connection for migrations uses port 5432 on hosted Supabase | Area 3 | If wrong: `drizzle-kit migrate` fails or hangs on connection; easy to fix by checking Supabase Dashboard |
| A5 | `pnpm create next-app@15.5` with `--eslint=false` flag successfully omits ESLint | Area 5 | If wrong: extra `pnpm remove` step needed; low impact |

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Supabase Auth (Google OAuth + anonymous) |
| V3 Session Management | Yes | @supabase/ssr cookie-based sessions, HttpOnly cookies |
| V4 Access Control | Yes | RLS policies on all tables (Area 4) |
| V5 Input Validation | Yes | Zod schemas in `lib/validation/`, re-validated in every Server Action |
| V6 Cryptography | Yes | nanoid with `customAlphabet` (no-lookalike), 22 chars / 128+ bits — never `Math.random` |

### Known Threat Patterns for Phase 1 Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token enumeration via /api/invite/[token] | Spoofing | Rate-limit 10 req/min/IP (D-22); 128-bit entropy makes brute-force implausible |
| JWT claim forgery (`plan_id`) | Spoofing/Elevation | Claims come from `app_metadata` (server-only); user cannot set `app_metadata` via client SDK |
| Plan URL indexed by search engines | Information Disclosure | `noindex` meta + robots.txt Disallow on /plan/* and /i/* (D-22) |
| Referrer header leaking invite token | Information Disclosure | `Referrer-Policy: strict-origin-when-cross-origin` site-wide (D-22) |
| Service-role key exposed to browser | Elevation of Privilege | service-role.ts has `persistSession: false`; file must never be imported in client components (enforce with Biome rule or tsconfig path alias split) |
| RLS bypass via service-role convenience | Elevation of Privilege | Anti-pattern explicitly called out in ARCHITECTURE.md; service-role used only in server route handlers and migrations |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | `supabase start` | Must verify on dev machine | — | Can use hosted Supabase free tier (pauses after 7 days) |
| Node.js 20+ | Next.js 15.5 | Must verify | — | None — required |
| pnpm 9+ | Dependency install | Must verify | — | npm with `--legacy-peer-deps` (not recommended) |
| Supabase CLI 2.x | Local DB | Must verify | — | Hosted Supabase free tier |
| psql | Apply RLS policies | Likely present on macOS (Homebrew) | — | Use `supabase db push` instead |

**Missing dependencies with fallback:**
- Docker: if unavailable, use hosted Supabase free tier but be aware of the 7-day pause risk
- psql: use `supabase db push` to apply files in `supabase/migrations/` folder

**Missing dependencies with no fallback:**
- Node.js 20+, pnpm 9+ — must be installed before any work begins

---

*Research date: 2026-05-22*
*Valid until: 2026-06-22 (30 days — Supabase Auth hook API is stable; Next.js 15.5 is pinned)*
