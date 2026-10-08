import { File, Paths } from 'expo-file-system';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

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
// Starting the worker must answer fast: it only creates the prediction.
const WORKER_START_TIMEOUT_MS = 30_000;
const DOWNLOAD_TIMEOUT_MS = 60_000;
// Status polling rhythm: one short call every few seconds, never hammering.
const STATUS_POLL_MS = 4000;
const STATUS_CALL_TIMEOUT_MS = 25_000;
const STATUS_TIMEOUT_MS = 240_000;
// Backstop over the whole backend path: no stall may ever outlive this.
const OVERALL_TIMEOUT_MS = 420_000;

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
  if (Platform.OS === 'web') {
    // No app cache on web: keep the bytes as a session object URL instead.
    const response = await fetch(data.signedUrl);
    if (!response.ok) {
      throw new Error('Could not download the edited photo.');
    }
    const blob = await response.blob();
    const createObjectURL = (URL as unknown as {
      createObjectURL?: (blob: unknown) => string;
    }).createObjectURL;
    if (typeof createObjectURL !== 'function') {
      throw new Error('This browser cannot hold the edited photo.');
    }
    return createObjectURL.call(URL, blob);
  }
  const destination = new File(Paths.cache, `pixeliia-result-${Date.now()}.jpg`);
  const downloaded = await File.downloadFileAsync(data.signedUrl, destination);
  return downloaded.uri;
}

/**
 * Native uploads stream the file straight from disk. Web has no filesystem
 * access, so the photo URI (blob:/data:/https:) is fetched into a Blob.
 */
async function readUploadBody(photoUri: string): Promise<Blob> {
  if (Platform.OS === 'web') {
    const response = await fetch(photoUri);
    if (!response.ok) {
      throw new Error('Could not read the photo for upload.');
    }
    return response.blob();
  }
  return new File(photoUri);
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
  const uploadBody = await readUploadBody(photoUri);
  const { error: uploadError } = await withTimeout(
    supabase.storage.from(BUCKET).upload(sourcePath, uploadBody, {
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

  // Fire: the worker only creates the prediction and returns fast.
  const { data: started, error: startError } = await withTimeout(
    supabase.functions.invoke<{
      ok: boolean;
      job_id?: string;
      prediction_id?: string;
      error?: string;
    }>('process-edit-job', { body: { jobId } }),
    WORKER_START_TIMEOUT_MS,
    'Could not start the edit. Try again.'
  );
  if (startError) {
    throw new Error(`Edit worker unreachable: ${startError.message}`);
  }
  if (!started?.ok) {
    throw new Error(started?.error || 'Edit failed. Try again.');
  }

  // Poll the status function until terminal. Each call is short; a missed
  // beat simply retries on the next tick. No single long-lived request.
  const pollingSince = Date.now();
  for (;;) {
    if (Date.now() - pollingSince > STATUS_TIMEOUT_MS) {
      throw new Error('Edit is taking too long. Try again.');
    }
    await delay(STATUS_POLL_MS);
    let state: {
      ok: boolean;
      status?: string;
      result_path?: string | null;
      error?: string;
    } | null = null;
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke<{
          ok: boolean;
          status?: string;
          result_path?: string | null;
          error?: string;
        }>('process-edit-status', { body: { jobId } }),
        STATUS_CALL_TIMEOUT_MS,
        'status check timed out'
      );
      if (!error) state = data;
    } catch {
      // Transient: keep polling on the next tick.
    }
    if (!state?.ok) continue;
    if (state.status === 'succeeded' && state.result_path) {
      return withTimeout(
        downloadResultToCache(supabase, state.result_path),
        DOWNLOAD_TIMEOUT_MS,
        'Download timed out. Your edit is saved — try exporting again.'
      );
    }
    if (state.status === 'failed') {
      throw new Error(state.error || 'Edit failed. Try again.');
    }
  }
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
      ? await withTimeout(
          runBackendEdit(photoUri, toolId, intensity, params),
          OVERALL_TIMEOUT_MS,
          'Edit is taking too long. Try again on a stronger connection.'
        )
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
