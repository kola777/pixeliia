-- Pixeliia async job flow: the worker creates the Replicate prediction and
-- returns fast; a status function advances/finalizes the job. Additive only.

alter table public.edit_jobs
  add column if not exists replicate_prediction_id text,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

-- Clients and Edge Functions download results through service-role signed
-- URLs, but creating a signed URL requires SELECT on the object. Without
-- this policy every download path fails. Scoped to the caller's own
-- uploads/ and results/ folders; nothing becomes public.
drop policy if exists "users read own objects" on storage.objects;
create policy "users read own objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'pixeliia'
    and (storage.foldername(name))[1] in ('uploads', 'results')
    and (storage.foldername(name))[2] = auth.uid()::text
  );
