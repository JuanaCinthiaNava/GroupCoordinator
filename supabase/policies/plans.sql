-- RLS policies for plans. Verbatim from RESEARCH §Area 4 §plans.
--
-- 4 policies — no DELETE policy (D-05 + RESEARCH §Open Question 5):
-- "Eliminar plan" UI sets archived_at via UPDATE; there is no hard delete in v1.

-- SELECT (anon): only if the JWT carries a plan_id claim matching this row's id.
-- The Custom Access Token Hook promotes app_metadata.plan_id to top-level.
-- If the claim is missing, the cast returns NULL which never equals any UUID.
drop policy if exists plans_select_anon_with_claim on public.plans;
create policy plans_select_anon_with_claim
on public.plans for select
to anon
using (
  id = (auth.jwt() ->> 'plan_id')::uuid
);

-- SELECT (authenticated): owner OR member.
drop policy if exists plans_select_member on public.plans;
create policy plans_select_member
on public.plans for select
to authenticated
using (
  (select auth.uid()) = owner_id
  or (select auth.uid()) in (
    select user_id from public.plan_members where plan_id = plans.id
  )
);

-- INSERT (authenticated): user creating their own plan becomes owner.
drop policy if exists plans_insert_authenticated on public.plans;
create policy plans_insert_authenticated
on public.plans for insert
to authenticated
with check (
  (select auth.uid()) = owner_id
);

-- UPDATE (authenticated): owner only. Covers archive (archived_at) and edits.
drop policy if exists plans_update_owner_only on public.plans;
create policy plans_update_owner_only
on public.plans for update
to authenticated
using (
  (select auth.uid()) = owner_id
)
with check (
  (select auth.uid()) = owner_id
);

-- NO DELETE policy. Default deny — hard-delete is forbidden in v1.
