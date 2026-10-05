import { File, Paths } from 'expo-file-system';
import type { SupabaseClient } from '@supabase/supabase-js';

import { track } from './analytics';
import { ensureSignedIn, getSupabase, isSupabaseConfigured } from './supabase';

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
// Every network stage gets its own tripwire. Mobile connections stall
// silently (no error, no resolution), so an unwrapped await means an
// endless spinner. Failures throw so the editor can offer Retry.
// INVOKE matches the platform's function wall-clock budget; the worker
// polls Replicate server-side, so the app holds one connection until it
// answers.
const UPLOAD_TIMEOUT_MS = 60_000;
const JOB_TIMEOUT_MS = 30_000;
const INVOKE_TIMEOUT_MS = 150_000;
const DOWNLOAD_TIMEOUT_MS = 60_000;

async function withTimeout<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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

export type EditParams = {
  /** Target age for the age-transform tool (0-100). */
  age?: number;
  /** Selected one-tap variant for studio tools (e.g. "Auburn"). */
  variant?: string;
};

async function runBackendEdit(
  photoUri: string,
  toolId: string,
  intensity: number,
  params: EditParams
): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Photo backend is not configured yet.');
  }
  const userId = await ensureSignedIn();
  if (!userId) {
    throw new Error('Could not sign in to the photo backend. Try again.');
  }

  const extension = photoUri.split('.').pop()?.split('?')[0]?.toLowerCase() === 'png' ? 'png' : 'jpg';
  const sourcePath = `uploads/${userId}/${Date.now()}.${extension}`;
  const { error: uploadError } = await withTimeout(
    supabase.storage.from(BUCKET).upload(sourcePath, new File(photoUri), {
      contentType: extension === 'png' ? 'image/png' : 'image/jpeg',
      upsert: false,
    }),
    UPLOAD_TIMEOUT_MS,
    'Upload timed out. Check your connection and try again.'
  );
  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: job, error: jobError } = await withTimeout(
    supabase
      .from('edit_jobs')
      .insert({
        tool_id: toolId,
        intensity,
        source_path: sourcePath,
        status: 'queued',
        user_id: userId,
        params,
      })
      .select('id')
      .single(),
    JOB_TIMEOUT_MS,
    'Could not start the edit job. Try again.'
  );
  if (jobError || !job) {
    throw new Error(`Could not start the edit job: ${jobError?.message ?? 'unknown error'}`);
  }
  const jobId = (job as { id: string }).id;

  const { data, error: invokeError } = await withTimeout(
    supabase.functions.invoke<{
      ok: boolean;
      result_path?: string | null;
      error?: string;
    }>('process-edit-job', { body: { jobId } }),
    INVOKE_TIMEOUT_MS,
    'Edit timed out. Try again.'
  );
  if (invokeError) {
    throw new Error(`Edit worker unreachable: ${invokeError.message}`);
  }
  if (!data?.ok || !data.result_path) {
    throw new Error(data?.error || 'Edit failed. Try again.');
  }
  return withTimeout(
    downloadResultToCache(supabase, data.result_path),
    DOWNLOAD_TIMEOUT_MS,
    'Download timed out. Your edit is saved — try exporting again.'
  );
}

export async function runEdit(
  photoUri: string,
  toolId: string,
  intensity: number,
  params: EditParams = {}
): Promise<string> {
  const backend = isSupabaseConfigured();
  const startedAt = Date.now();
  try {
    const output = backend
      ? await runBackendEdit(photoUri, toolId, intensity, params)
      : await delay(900).then(() => photoUri);
    track('edit_succeeded', {
      tool: toolId,
      mode: backend ? 'backend' : 'local',
      ms: Date.now() - startedAt,
    });
    return output;
  } catch (err) {
    track('edit_failed', {
      tool: toolId,
      mode: backend ? 'backend' : 'local',
      reason: err instanceof Error ? err.message.slice(0, 120) : 'unknown',
    });
    throw err;
  }
}
