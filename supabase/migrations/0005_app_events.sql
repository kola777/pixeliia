-- Pixeliia success metrics (PRD section 15): raw event stream for funnel,
-- retention and reliability analytics. Aggregates and dashboards come later;
-- this ships the append-only foundation with owner-scoped writes.
create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users on delete set null,
  session_id text not null,
  name text not null,
  props jsonb not null default '{}'
);

alter table public.app_events enable row level security;

drop policy if exists "owners insert own events" on public.app_events;
create policy "owners insert own events"
  on public.app_events for insert to authenticated
  with check (user_id = auth.uid());

grant insert on public.app_events to authenticated;
