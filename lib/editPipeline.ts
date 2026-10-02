import { File, Paths } from 'expo-file-system';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabase, isSupabaseConfigured } from './supabase';

/**
 * Edit pipeline.
 *
 * - Backend configured: upload the photo to the `pixeliia` storage bucket,
 *   insert an `edit_jobs` row (see supabase/migrations/0001_edit_jobs.sql),
 *   invoke the `process-edit-job` Edge Function worker and download the
 *   result into the app cache, returning its local URI. Failures throw so
 *   the editor can offer Retry — a failed backend never silently returns
 *   the original.
 * - Backend missing: local placeholder returns the original photo so the
 *   full editor UX stays testable without keys.
 */

const BUCKET = 'pixeliia';
// Matches the platform's function wall-clock budget; the worker polls
// Replicate server-side, so the app holds one connection until it answers.
const INVOKE_TIMEOUT_MS = 150_000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadResultToCache(
  supabase: SupabaseClient,
  resultPath: string
): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(resultPath, 300);
  if (error || !data?.signedUrl) {
    throw new Error(`Could not fetch the edited photo: ${error?.message ?? 'unknown error'}`);
  }
  const destination = new File(Paths.cache, `pixeliia-result-${Date.now()}.jpg`);
  const downloaded = await File.downloadFileAsync(data.signedUrl, destination);
  return downloaded.uri;
}

async function runBackendEdit(
  photoUri: string,
  toolId: string,
  intensity: number
): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Photo backend is not configured yet.');
  }

  const extension = photoUri.split('.').pop()?.split('?')[0]?.toLowerCase() === 'png' ? 'png' : 'jpg';
  const sourcePath = `uploads/${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(
    sourcePath,
    new File(photoUri),
    {
      contentType: extension === 'png' ? 'image/png' : 'image/jpeg',
      upsert: false,
    }
  );
  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: job, error: jobError } = await supabase
    .from('edit_jobs')
    .insert({ tool_id: toolId, intensity, source_path: sourcePath, status: 'queued' })
    .select('id')
    .single();
  if (jobError || !job) {
    throw new Error(`Could not start the edit job: ${jobError?.message ?? 'unknown error'}`);
  }
  const jobId = (job as { id: string }).id;

  const { data, error: invokeError } = await Promise.race([
    supabase.functions.invoke<{
      ok: boolean;
      result_path?: string | null;
      error?: string;
    }>('process-edit-job', { body: { jobId } }),
    delay(INVOKE_TIMEOUT_MS).then((): never => {
      throw new Error('Edit timed out. Try again.');
    }),
  ]);
  if (invokeError) {
    throw new Error(`Edit worker unreachable: ${invokeError.message}`);
  }
  if (!data?.ok || !data.result_path) {
    throw new Error(data?.error || 'Edit failed. Try again.');
  }
  return downloadResultToCache(supabase, data.result_path);
}

export async function runEdit(
  photoUri: string,
  toolId: string,
  intensity: number
): Promise<string> {
  if (!isSupabaseConfigured()) {
    await delay(900);
    return photoUri;
  }
  return runBackendEdit(photoUri, toolId, intensity);
}
