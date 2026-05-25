-- Phase 1 seed. Runs AFTER Drizzle migrations + RLS policies.
--
-- psql against postgres user bypasses RLS implicitly. Service-role clients
-- (used by E2E test helpers) also bypass RLS.
--
-- Seeded UUIDs and tokens are referenced by Plans 01-03 (anon link view) and
-- 01-05 (OAuth bypass tests). Do NOT change these values without updating
-- those plans' fixtures.

begin;

-- Test owner user (Plan 01-05 OAuth bypass uses this account via
-- signInWithPassword to sidestep Google OAuth in CI).
insert into auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'test@groupcoordinator.local',
  crypt('test-password-do-not-use-in-prod', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Test Owner"}'::jsonb,
  false,
  now(), now(),
  '', '', '', ''
)
on conflict (id) do nothing;

-- Email identity row — required for password sign-in.
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000099',
  jsonb_build_object(
    'sub', '00000000-0000-0000-0000-000000000099',
    'email', 'test@groupcoordinator.local',
    'email_verified', true
  ),
  'email',
  now(), now(), now()
)
on conflict (id) do nothing;

-- Second test user (for cross-RLS isolation tests — they are NOT a member of
-- the seed plan).
insert into auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000088',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'other@groupcoordinator.local',
  crypt('other-password-do-not-use-in-prod', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Other User"}'::jsonb,
  false,
  now(), now(),
  '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000088',
  '00000000-0000-0000-0000-000000000088',
  '00000000-0000-0000-0000-000000000088',
  jsonb_build_object(
    'sub', '00000000-0000-0000-0000-000000000088',
    'email', 'other@groupcoordinator.local',
    'email_verified', true
  ),
  'email',
  now(), now(), now()
)
on conflict (id) do nothing;

-- Seed plan.
insert into public.plans (
  id, slug, title, description, owner_id, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000001',
  'seed-plan',
  'Plan de prueba (seed)',
  'Plan used by Phase 1 integration tests.',
  '00000000-0000-0000-0000-000000000099',
  now() - interval '1 day',
  now() - interval '1 day'
)
on conflict (id) do nothing;

-- Owner is implicitly a plan_member with role=owner for membership lookups.
insert into public.plan_members (
  id, plan_id, user_id, role, joined_at
)
values (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000099',
  'owner',
  now() - interval '1 day'
)
on conflict (id) do nothing;

-- Valid invite token. Token strings are exactly 22 chars from the no-lookalike
-- alphabet (23456789abcdefghjkmnpqrstuvwxyz).
insert into public.invite_tokens (
  id, plan_id, token, role, created_by, created_at
)
values (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'seedvakjdtpken22charsx',
  'viewer',
  '00000000-0000-0000-0000-000000000099',
  now() - interval '12 hour'
)
on conflict (id) do nothing;

-- Revoked invite token.
insert into public.invite_tokens (
  id, plan_id, token, role, created_by, created_at, revoked_at
)
values (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'seedrevpkedtpken22char',
  'viewer',
  '00000000-0000-0000-0000-000000000099',
  now() - interval '6 hour',
  now() - interval '1 hour'
)
on conflict (id) do nothing;

-- Expired invite token.
insert into public.invite_tokens (
  id, plan_id, token, role, created_by, created_at, expires_at
)
values (
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000001',
  'seedexpjredtpken22cha2',
  'viewer',
  '00000000-0000-0000-0000-000000000099',
  now() - interval '2 day',
  now() - interval '1 day'
)
on conflict (id) do nothing;

commit;
