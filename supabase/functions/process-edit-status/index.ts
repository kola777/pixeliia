// Pixeliia edit worker, part 2 of 2 (Supabase Edge Function, Deno).
//
// Polled by the client every few seconds after process-edit-job starts a
// prediction. Each call is short and self-contained:
//   - returns the current state for queued/fresh-processing jobs
//   - advances running predictions (succeeded -> download/upload/mark done,
//     failed/canceled -> mark failed)
//   - heals stale jobs (processing > 15 min): re-checks the prediction —
//     terminal states finalize, vanished predictions fail retryably, only
//     genuinely still-running predictions stay processing
//
// Idempotent and race-safe: final transitions use conditional updates
// (eq status processing), so concurrent callers cannot finalize twice.
// Never leaves a job stuck: every path returns a terminal or live state.
//
// Deploy:  supabase functions deploy process-edit-status
// Secrets: same as process-edit-job (REPLICATE_API_TOKEN).

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const REPLICATE_TOKEN = Deno.env.get("REPLICATE_API_TOKEN") ?? "";
const BUCKET = "pixeliia";

// processing older than this with no live prediction behind it is dead.
const STALE_MS = 15 * 60 * 1000;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

type JobRow = {
  id: string;
  status: string;
  result_path: string | null;
  error: string | null;
  user_id: string | null;
  replicate_prediction_id: string | null;
  started_at: string | null;
};

type PredictionState = {
  status: string;
  output?: unknown;
  error?: unknown;
};

async function fetchPrediction(predictionId: string): Promise<PredictionState | null> {
  const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Prediction check failed (${response.status}).`);
  }
  return (await response.json()) as PredictionState;
}

function firstHttpUrl(output: unknown): string | null {
  const first = Array.isArray(output) ? output[0] : output;
  return typeof first === "string" && first.startsWith("http") ? first : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    // NOTE: 204 must carry a null body — any body string throws per the
    // Fetch spec and the runtime answers 500 instead.
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "POST with { jobId } required." }, 405);
  }
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    return json({ ok: false, error: "Worker misconfigured (Supabase env)." }, 500);
  }
  if (!REPLICATE_TOKEN) {
    return json({ ok: false, error: "Worker misconfigured (REPLICATE_API_TOKEN missing)." }, 500);
  }

  let jobId = "";
  try {
    jobId = ((await req.json()) as { jobId?: string }).jobId ?? "";
  } catch {
    return json({ ok: false, error: "Invalid JSON body." }, 400);
  }
  if (!jobId) {
    return json({ ok: false, error: "jobId required." }, 400);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return json({ ok: false, error: "Sign-in required." }, 401);
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return json({ ok: false, error: "Sign-in required." }, 401);
  }
  const callerId = userData.user.id;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Owner-scoped: RLS only returns this caller's own rows.
  const { data: job, error: jobError } = await userClient
    .from("edit_jobs")
    .select("id,status,result_path,error,user_id,replicate_prediction_id,started_at")
    .eq("id", jobId)
    .single();
  if (jobError || !job) {
    return json({ ok: false, error: "Edit job not found." }, 404);
  }
  const row = job as JobRow;
  if (row.user_id && row.user_id !== callerId) {
    return json({ ok: false, error: "Not your edit job." }, 403);
  }

  const state = (extra: Record<string, unknown> = {}) =>
    json({ ok: true, status: row.status, result_path: row.result_path, error: row.error, ...extra });

  if (row.status === "succeeded") return state();
  if (row.status === "failed") return state();
  if (row.status === "queued") return state();

  // From here: processing. Settle it or report it live.
  const ageMs = row.started_at ? Date.now() - new Date(row.started_at).getTime() : 0;
  const stale = ageMs > STALE_MS;

  const failStalled = async (message: string) => {
    // Conditional: only transition out of processing, never clobber a
    // concurrent finalizer.
    const { data: updated } = await supabase
      .from("edit_jobs")
      .update({ status: "failed", error: message, completed_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("status", "processing")
      .select("id,status,result_path,error");
    const current = (updated as { id: string; status: string; result_path: string | null; error: string | null }[] | null)?.[0];
    if (!current) {
      return json({ ok: true, status: "processing", result_path: null, error: null });
    }
    return json({ ok: true, status: current.status, result_path: current.result_path, error: current.error });
  };

  const finalizeSuccess = async (resultPath: string) => {
    const { data: updated } = await supabase
      .from("edit_jobs")
      .update({
        status: "succeeded",
        result_path: resultPath,
        error: null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("status", "processing")
      .select("id,status,result_path,error");
    const current = (updated as { id: string; status: string; result_path: string | null; error: string | null }[] | null)?.[0];
    if (!current) {
      return json({ ok: true, status: "processing", result_path: null, error: null });
    }
    return json({ ok: true, status: current.status, result_path: current.result_path, error: current.error });
  };

  const finalizeFailed = async (message: string) => {
    const { data: updated } = await supabase
      .from("edit_jobs")
      .update({ status: "failed", error: message.slice(0, 500), completed_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("status", "processing")
      .select("id,status,result_path,error");
    const current = (updated as { id: string; status: string; result_path: string | null; error: string | null }[] | null)?.[0];
    if (!current) {
      return json({ ok: true, status: "processing", result_path: null, error: null });
    }
    return json({ ok: true, status: current.status, result_path: current.result_path, error: current.error });
  };

  if (!row.replicate_prediction_id) {
    // Legacy rows from before prediction tracking: only age can judge them.
    if (stale) return await failStalled("Processing timed out. Please try again.");
    return state();
  }

  let prediction: PredictionState | null;
  try {
    prediction = await fetchPrediction(row.replicate_prediction_id);
  } catch {
    // Transient check failure: report live unless already stale.
    if (stale) return await failStalled("Processing timed out. Please try again.");
    return state();
  }
  if (!prediction) {
    // Prediction vanished server-side: unrecoverable, fail retryably.
    return await failStalled("Processing timed out. Please try again.");
  }
  if (prediction.status === "succeeded") {
    const outputUrl = firstHttpUrl(prediction.output);
    if (!outputUrl) return await finalizeFailed("AI finished without an image. Try again.");
    try {
      const outputRes = await fetch(outputUrl, {
        headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` },
      });
      if (!outputRes.ok) throw new Error("download failed");
      const bytes = new Uint8Array(await outputRes.arrayBuffer());
      const contentType = outputRes.headers.get("content-type") ?? "image/png";
      const extension =
        contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
      const ownerId = row.user_id ?? callerId;
      const resultPath = `results/${ownerId}/${jobId}.${extension}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(resultPath, bytes, {
        contentType,
        upsert: true,
      });
      if (uploadError) throw new Error(`Could not store the result: ${uploadError.message}`);
      return await finalizeSuccess(resultPath);
    } catch {
      return await finalizeFailed("Could not fetch the finished edit. Try again.");
    }
  }
  if (prediction.status === "failed" || prediction.status === "canceled") {
    const detail =
      typeof prediction.error === "string"
        ? prediction.error
        : JSON.stringify(prediction.error ?? "unknown");
    return await finalizeFailed(`AI edit failed: ${detail.slice(0, 300)}`);
  }
  // Still running: only age decides. Genuinely slow work keeps processing;
  // anything older than the stale bound fails retryably.
  if (stale) return await failStalled("Processing timed out. Please try again.");
  return state();
});
