-- Pixeliia Phase 3: edit-job queue + private storage bucket.
-- Apply with: supabase db push  (CLI)  or paste into the Supabase SQL Editor.
-- The AI worker (Phase 4) uses the service_role key, which bypasses RLS,
-- to mark jobs processing/succeeded/failed and write result files.

create table if not exists public.edit_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tool_id text not null,
  intensity integer not null default 50,
  source_path text not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'succeeded', 'failed')),
  result_path text,
  error text
);

alter table public.edit_jobs enable row level security;

-- MVP: anonymous app instances can submit jobs and poll their own rows.
-- Tighten to authenticated users (auth.uid() = user_id) when sign-in lands.
drop policy if exists "anon insert jobs" on public.edit_jobs;
create policy "anon insert jobs"
  on public.edit_jobs for insert to anon
  with check (true);

drop policy if exists "anon read jobs" on public.edit_jobs;
create policy "anon read jobs"
  on public.edit_jobs for select to anon
  using (true);

-- Clients must never mark their own jobs done; only the worker does that.
grant insert, select on public.edit_jobs to anon, authenticated;

-- Private bucket for source + result images. Results are fetched by the app
-- through short-lived signed URLs and cached locally (never stored as URLs).
insert into storage.buckets (id, name, public)
values ('pixeliia', 'pixeliia', false)
on conflict (id) do nothing;

drop policy if exists "anon upload sources" on storage.objects;
create policy "anon upload sources"
  on storage.objects for insert to anon
  with check (bucket_id = 'pixeliia');

drop policy if exists "anon read pixeliia objects" on storage.objects;
create policy "anon read pixeliia objects"
  on storage.objects for select to anon
  using (bucket_id = 'pixeliia');
