-- Pixeliia ads backend, PRD section 8.
-- Fixed layout slots (client reserves space, never jumps); billing and the
-- advertiser dashboard land in a later phase — this ships serving +
-- verified measurement primitives with house fallbacks.

create table if not exists public.ad_placements (
  id text primary key,
  name text not null
);

insert into public.ad_placements (id, name) values
  ('home_billboard', 'Premium home billboard'),
  ('standard', 'Standard ad slot')
on conflict (id) do nothing;

create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  kind text not null default 'impressions'
    check (kind in ('billboard', 'impressions', 'clicks')),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'completed')),
  budget_espee numeric not null default 0
);

create table if not exists public.ad_creatives (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  placement_id text not null references public.ad_placements (id),
  campaign_id uuid references public.ad_campaigns (id) on delete set null,
  title text not null,
  body text not null default '',
  image_url text,
  click_url text,
  is_house boolean not null default false,
  is_active boolean not null default true
);

-- Premium billboard is billed by booked hour, exclusive per time slot.
create table if not exists public.billboard_bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  campaign_id uuid not null references public.ad_campaigns (id) on delete cascade,
  creative_id uuid not null references public.ad_creatives (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  price_espee numeric not null default 0,
  check (ends_at > starts_at)
);

-- One table for verified measurement. Never count an edit as an impression:
-- rows are only written by explicit display/click tracking calls.
create table if not exists public.ad_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  campaign_id uuid references public.ad_campaigns (id) on delete set null,
  creative_id uuid references public.ad_creatives (id) on delete set null,
  placement_id text not null references public.ad_placements (id),
  kind text not null check (kind in ('impression', 'click')),
  user_id uuid references auth.users on delete set null
);

alter table public.ad_placements enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.ad_creatives enable row level security;
alter table public.billboard_bookings enable row level security;
alter table public.ad_events enable row level security;

-- Ad content is public to signed-in app users; analytics stay private.
drop policy if exists "users read placements" on public.ad_placements;
create policy "users read placements"
  on public.ad_placements for select to authenticated using (true);

drop policy if exists "users read campaigns" on public.ad_campaigns;
create policy "users read campaigns"
  on public.ad_campaigns for select to authenticated using (true);

drop policy if exists "users read creatives" on public.ad_creatives;
create policy "users read creatives"
  on public.ad_creatives for select to authenticated using (true);

drop policy if exists "users read bookings" on public.billboard_bookings;
create policy "users read bookings"
  on public.billboard_bookings for select to authenticated using (true);

drop policy if exists "users write own events" on public.ad_events;
create policy "users write own events"
  on public.ad_events for insert to authenticated
  with check (user_id = auth.uid());

grant select on public.ad_placements, public.ad_campaigns, public.ad_creatives,
  public.billboard_bookings to authenticated;
grant insert on public.ad_events to authenticated;

-- House fallbacks so slots render before the first paid campaign exists.
insert into public.ad_creatives
  (placement_id, title, body, is_house, is_active)
values
  ('home_billboard', 'Your brand, this hour',
    'Exclusive home placement. No pop-ups, never covers the editor.', true, true),
  ('standard', 'Reserved ad space', 'Never interrupts editing', true, true)
on conflict do nothing;
