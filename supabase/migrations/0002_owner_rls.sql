-- Pixeliia Phase 6: owner-scoped access for anonymous-authenticated users.
-- Requires "Anonymous sign-ins" enabled (Dashboard > Authentication > Sign-In).
-- Clients must never complete jobs; only the service-role worker does that.

alter table public.edit_jobs
  add column if not exists user_id uuid references auth.users on delete cascade;

-- Retire the open MVP policies from 0001.
drop policy if exists "anon insert jobs" on public.edit_jobs;
drop policy if exists "anon read jobs" on public.edit_jobs;

drop policy if exists "owners insert own jobs" on public.edit_jobs;
create policy "owners insert own jobs"
  on public.edit_jobs for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "owners read own jobs" on public.edit_jobs;
create policy "owners read own jobs"
  on public.edit_jobs for select to authenticated
  using (user_id = auth.uid());

grant insert, select on public.edit_jobs to authenticated;

-- Storage: clients upload only into their own uploads/ folder. Result files
-- are fetched exclusively through service-role signed URLs, so no select
-- policy is granted here at all.
drop policy if exists "anon upload sources" on storage.objects;
drop policy if exists "anon read pixeliia objects" on storage.objects;

drop policy if exists "users upload own sources" on storage.objects;
create policy "users upload own sources"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pixeliia'
    and (storage.foldername(name))[1] = 'uploads'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
