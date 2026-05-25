-- RLS policies for invite_tokens. Verbatim from RESEARCH §Area 4 §invite_tokens.
--
-- 3 policies: SELECT owner, INSERT owner, UPDATE owner.
-- No DELETE policy (hard-delete forbidden — audit trail / revoked_at soft-delete).
-- Anon role NEVER granted on this table (D-22, threat T-02-02 — token enumeration).

-- SELECT (authenticated): only the plan owner can list invite tokens.
drop policy if exists invite_tokens_select_owner on public.invite_tokens;
create policy invite_tokens_select_owner
on public.invite_tokens for select
to authenticated
using (
  (select auth.uid()) in (
    select owner_id from public.plans where id = plan_id
  )
);

-- INSERT (authenticated): only the plan owner can mint tokens.
-- created_by must equal the caller — defense in depth against a misbehaving client.
drop policy if exists invite_tokens_insert_owner on public.invite_tokens;
create policy invite_tokens_insert_owner
on public.invite_tokens for insert
to authenticated
with check (
  (select auth.uid()) in (
    select owner_id from public.plans where id = plan_id
  )
  and created_by = (select auth.uid())
);

-- UPDATE (authenticated): only the plan owner. Used for revoke (revoked_at = now())
-- and for incrementing use_count (the /api/invite/[token] handler uses
-- service-role for the increment, but owner UPDATE is allowed for completeness).
drop policy if exists invite_tokens_update_owner on public.invite_tokens;
create policy invite_tokens_update_owner
on public.invite_tokens for update
to authenticated
using (
  (select auth.uid()) in (
    select owner_id from public.plans where id = plan_id
  )
)
with check (
  (select auth.uid()) in (
    select owner_id from public.plans where id = plan_id
  )
);

-- NO DELETE policy. Default deny — preserves audit trail.
