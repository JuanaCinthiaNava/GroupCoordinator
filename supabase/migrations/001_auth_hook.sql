-- Custom Access Token Hook — promotes app_metadata.plan_id (server-only,
-- service-role-set) to a top-level JWT claim so RLS policies can read
-- `auth.jwt() ->> 'plan_id'` directly.
--
-- Pitfall 1 reference: signInAnonymously({ data: { plan_id } }) writes to
-- raw_user_meta_data (user-editable, not a JWT claim). The correct flow uses
-- service-role updateUserById({ app_metadata: { plan_id } }) followed by
-- refreshSession() — and THIS hook surfaces the claim on the new token.
--
-- Source: RESEARCH §Area 1, supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook

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

  -- app_metadata is server-controlled; users cannot write to it via the client SDK.
  plan_id := claims -> 'app_metadata' ->> 'plan_id';

  if plan_id is not null then
    claims := jsonb_set(claims, '{plan_id}', to_jsonb(plan_id));
  end if;

  return jsonb_build_object('claims', claims);
end;
$$;

-- supabase_auth_admin is the role that GoTrue uses to invoke hooks.
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
-- Defense in depth: revoke from public so no other client role can call it.
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
