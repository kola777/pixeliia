import { File, Paths } from 'expo-file-system';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabase, isSupabaseConfigured } from './supabase';

/**
 * Edit pipeline.
 *
 * - Backend configured: upload the photo to the `pixeliia` storage bucket,
 *   insert an `edit_jobs` row (see supabase/migrations/0001_edit_jobs.sql),
 *   poll until the worker finishes, then download the result into the app
 *   cache and return its local URI. Failures throw so the editor can offer
 *   Retry — a failed backend never silently returns the original.
 * - Backend missing: local placeholder returns the original photo so the
 *   full editor UX stays testable without keys.
 */

const BUCKET = 'pixeliia';
const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 120_000;

type EditJobRow = {
  id: string;
  status: 'queued' | 'processing' | 'succeeded' | 'failed';
  result_path: string | null;
  error: string | null;
};

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

  const startedAt = Date.now();
  for (;;) {
    if (Date.now() - startedAt > TIMEOUT_MS) {
      throw new Error('Edit timed out. Try again.');
    }
    await delay(POLL_INTERVAL_MS);
    const { data, error } = await supabase
      .from('edit_jobs')
      .select('id,status,result_path,error')
      .eq('id', jobId)
      .single();
    if (error) {
      throw new Error(`Edit status check failed: ${error.message}`);
    }
    const row = data as EditJobRow;
    if (row.status === 'succeeded') {
      if (!row.result_path) {
        throw new Error('Edit finished without a result. Try again.');
      }
      return downloadResultToCache(supabase, row.result_path);
    }
    if (row.status === 'failed') {
      throw new Error(row.error || 'Edit failed. Try again.');
    }
  }
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
