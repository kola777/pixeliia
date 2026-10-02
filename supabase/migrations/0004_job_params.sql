-- Pixeliia: generic per-tool parameters on edit jobs (age target today,
-- outfit colors, background choices tomorrow). The worker reads them when
-- building model prompts; unknown keys are ignored.
alter table public.edit_jobs
  add column if not exists params jsonb not null default '{}';
