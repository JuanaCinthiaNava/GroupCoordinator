-- Enable RLS on every Phase 1 table + role grants + updated_at trigger.
--
-- RESEARCH §Area 4 prelude. Run AFTER Drizzle migrations (Drizzle creates the
-- tables; this file enables RLS on them).

alter table public.plans enable row level security;
alter table public.plan_members enable row level security;
alter table public.invite_tokens enable row level security;

-- Role grants. RLS is the gate; without a role grant the role can't even
-- evaluate policies. Anon never gets write access on any table.
grant select, insert, update, delete on public.plans to authenticated;
grant select on public.plans to anon;

grant select, insert, update, delete on public.plan_members to authenticated;
grant select on public.plan_members to anon;

grant select, insert, update, delete on public.invite_tokens to authenticated;
-- NOTE: invite_tokens deliberately NOT granted to anon (D-22, threat T-02-02).
-- The /api/invite/[token] route validates tokens via the service-role client.

-- updated_at auto-touch trigger for plans. Drizzle does not emit triggers from
-- schema.ts so this lives here.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();
