-- RLS policies for plan_members. Verbatim from RESEARCH §Area 4 §plan_members.
--
-- 5 policies: anon SELECT, authenticated SELECT, INSERT (self-or-owner),
-- UPDATE (owner-or-self), DELETE (owner-or-self).

-- SELECT (anon): same plan_id claim that gates plans access.
drop policy if exists plan_members_select_anon_with_claim on public.plan_members;
create policy plan_members_select_anon_with_claim
on public.plan_members for select
to anon
using (
  plan_id = (auth.jwt() ->> 'plan_id')::uuid
);

-- SELECT (authenticated): any member of the same plan can see the member list.
drop policy if exists plan_members_select_member on public.plan_members;
create policy plan_members_select_member
on public.plan_members for select
to authenticated
using (
  plan_id in (
    select pm.plan_id from public.plan_members pm
    where pm.user_id = (select auth.uid())
  )
  or (select auth.uid()) in (
    select owner_id from public.plans where id = plan_members.plan_id
  )
);

-- INSERT (authenticated):
--   - User adding THEMSELVES (the OAuth callback path: user_id = auth.uid())
--   - OR plan owner adding someone else
drop policy if exists plan_members_insert_self_or_owner on public.plan_members;
create policy plan_members_insert_self_or_owner
on public.plan_members for insert
to authenticated
with check (
  user_id = (select auth.uid())
  or (select auth.uid()) in (
    select owner_id from public.plans where id = plan_id
  )
);

-- UPDATE (authenticated): self can edit own row; owner can edit any row of the plan.
drop policy if exists plan_members_update_owner_or_self on public.plan_members;
create policy plan_members_update_owner_or_self
on public.plan_members for update
to authenticated
using (
  user_id = (select auth.uid())
  or (select auth.uid()) in (
    select owner_id from public.plans where id = plan_members.plan_id
  )
)
with check (
  user_id = (select auth.uid())
  or (select auth.uid()) in (
    select owner_id from public.plans where id = plan_members.plan_id
  )
);

-- DELETE (authenticated): self-remove OR owner-remove.
drop policy if exists plan_members_delete_owner_or_self on public.plan_members;
create policy plan_members_delete_owner_or_self
on public.plan_members for delete
to authenticated
using (
  user_id = (select auth.uid())
  or (select auth.uid()) in (
    select owner_id from public.plans where id = plan_members.plan_id
  )
);
