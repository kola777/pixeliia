// Pixeliia edit worker, part 1 of 2 (Supabase Edge Function, Deno).
//
// Async flow: client uploads source -> inserts edit_jobs row (queued) ->
// invokes this function -> it claims the job, CREATES the Replicate
// prediction, stores replicate_prediction_id, marks processing and returns
// FAST. It never waits for the model. Part 2 (process-edit-status, polled
// by the client) advances and finalizes the job.
//
// Deploy:  supabase functions deploy process-edit-job
// Secrets:  supabase secrets set REPLICATE_API_TOKEN=r8_... \
//             REPLICATE_EDIT_MODEL=black-forest-labs/flux-kontext-pro \
//             REPLICATE_UPSCALE_MODEL=nightmareai/real-esrgan \
//             REPLICATE_BG_MODEL=cjwbw/rembg
// Invoke auth: verify_jwt is false (gateway would reject browser CORS
// preflights) and the function verifies the caller JWT itself, scoping
// every job read through RLS. Service-role access is used only for status
// updates and result storage; the Replicate token never leaves the server.
//
// Model slugs and input keys below are best-known defaults. Before first
// production use, open each model's API tab on replicate.com and confirm the
// slug plus input field names; overrides need only `supabase secrets set`
// (no code change) except for input shapes, which live in buildModelInput().

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const REPLICATE_TOKEN = Deno.env.get("REPLICATE_API_TOKEN") ?? "";
const EDIT_MODEL =
  Deno.env.get("REPLICATE_EDIT_MODEL") ?? "black-forest-labs/flux-kontext-pro";
const UPSCALE_MODEL =
  Deno.env.get("REPLICATE_UPSCALE_MODEL") ?? "nightmareai/real-esrgan";
const BG_MODEL = Deno.env.get("REPLICATE_BG_MODEL") ?? "cjwbw/rembg";
// Specialized models. Slugs below are best-known defaults — confirm on
// replicate.com before production. INPAINT_MODEL has no default: when unset,
// object removal falls back to the instruction-edit model.
const FACE_RESTORE_MODEL =
  Deno.env.get("REPLICATE_FACE_MODEL") ?? "tencentarc/gfpgan";
const INPAINT_MODEL = Deno.env.get("REPLICATE_INPAINT_MODEL") ?? "";
// Kontext-style edit models name their image field differently; override
// without redeploying code if the API tab shows another name.
const EDIT_IMAGE_KEY = Deno.env.get("REPLICATE_EDIT_IMAGE_KEY") ?? "input_image";

const BUCKET = "pixeliia";

type JobRow = {
  id: string;
  tool_id: string;
  intensity: number;
  source_path: string;
  status: string;
  user_id: string | null;
  params: { age?: number; variant?: string } | null;
};

// One-click tools become short natural-language instructions. Intensity is
// baked into wording (25 Subtle / 50 Natural / 75 Strong) so any
// instruction-following image model behaves consistently.
const TOOL_PROMPTS: Record<string, string> = {
  "auto-edit":
    "Automatically enhance this photo: balanced exposure, natural color and contrast, clean sharpness",
  "enhance-photo": "Improve overall photo quality with a natural finish, no heavy preset look",
  sharpen: "Gently sharpen this photo while keeping edges natural",
  "reduce-noise": "Reduce grain and noise while preserving fine detail",
  "low-light": "Brighten this low-light photo naturally without blowing out highlights",
  "smooth-skin": "Soften skin very slightly while keeping pores, texture and identity",
  "remove-blemishes": "Remove spots and pimples, keep skin texture natural",
  "reduce-dark-circles": "Reduce under-eye dark circles while keeping a natural look",
  "teeth-whitening": "Whiten teeth slightly without a fake glow",
  "eye-enhance": "Subtly brighten and clarify the eyes",
  // NOTE: face-enhance routes to the dedicated restore model, which takes
  // no prompt — do not add a prompt entry here, it would be dead code.
  slimmer: "Make the body subtly slimmer without warping the background",
  "more-athletic": "Make the build slightly more athletic while keeping pose and clothing",
  "adjust-waist": "Subtly adjust the waist while preserving identity and background",
  "iphone-natural": "Reproduce flagship-natural camera characteristics: true-to-life color, accurate skin tones, gentle contrast, balanced HDR preserving highlights, fine natural sharpness, clean low noise, realistic lens rendering",
  "iphone-portrait": "Reproduce flagship-natural camera characteristics plus a portrait depth effect: true-to-life color, accurate skin tones, soft background blur with clean subject separation, balanced highlights",
  "pixel-natural": "Reproduce computational-photography characteristics: crisp detail, smart HDR, natural skin processing, clean shadows, balanced sharpness without halos",
  "samsung-vivid": "Reproduce vivid-flagship characteristics: rich saturated color, high detail and micro-contrast, punchy yet believable highlights, sharp lens feel",
  "pixeliia-natural": "Apply the balanced Pixeliia signature finish: natural color, soft contrast, clean natural skin, invisible processing with no telltale AI artifacts",
  "blur-background": "Blur the background with a portrait effect, keep the subject sharp",
  "remove-object": "Remove the most prominent unwanted object or distraction, fill in naturally",
};

const INTENSITY_WORDS: Array<[number, string]> = [
  [75, "with a strong but still believable effect"],
  [50, "keeping the result natural"],
  [0, "very subtly"],
];

const STUDIO_BASE: Record<string, string> = {
  "hair-color": "Change only the hair color",
  "makeup-look": "Apply a makeup look",
  "facial-hair": "Adjust the facial hair",
  "style-preset": "Restyle the overall fashion look",
};

const OUTFIT_BASE: Record<string, string> = {
  "outfit-color": "Change only the clothing color",
  "outfit-style": "Restyle the existing outfit",
  "replace-clothing": "Transform the outfit into a new clothing type",
};

const BACKGROUND_BASE: Record<string, string> = {
  "replace-background": "Replace the background with a new scene",
};

function promptFor(
  toolId: string,
  intensity: number,
  params: { age?: number; variant?: string } | null,
): string {
  if (toolId === "age-edit") {
    const target = Math.min(100, Math.max(0, Math.round(params?.age ?? 30)));
    const stage =
      target <= 2
        ? "a newborn baby"
        : target <= 12
          ? `a ${target}-year-old child`
          : target <= 19
            ? `a ${target}-year-old teenager`
            : target <= 59
              ? `a ${target}-year-old adult`
              : `a ${target}-year-old senior`;
    return `Reimagine the person in this photo as ${stage}, keeping their identity, pose, clothing, lighting and background recognizable. Natural skin texture appropriate for that age, no plastic smoothing, no warped shapes, no fake lighting.`;
  }
  const rawVariant = params?.variant;
  const variant =
    typeof rawVariant === "string" ? rawVariant.trim().slice(0, 40) : "";
  const look = variant ? ` (${variant})` : "";
  const studioBase = STUDIO_BASE[toolId];
  if (studioBase) {
    return `${studioBase}${look}, keeping the person recognizable: same face, identity, pose and background. Realistic blending, natural texture, no plastic skin, no distortion.`;
  }
  const outfitBase = OUTFIT_BASE[toolId];
  if (outfitBase) {
    return `${outfitBase}${look}, keeping the person's face, body, pose, lighting and background. Realistic garment folds and fabric texture, no warping.`;
  }
  const backgroundBase = BACKGROUND_BASE[toolId];
  if (backgroundBase) {
    return `${backgroundBase}${look}, keeping the subject identical: same person, face, pose, clothing and scale, with natural edge blending and lighting matched to the new scene.`;
  }
  const base =
    TOOL_PROMPTS[toolId] ?? "Improve this photo while keeping it natural";
  const strength =
    INTENSITY_WORDS.find(([min]) => intensity >= min)?.[1] ?? "keeping the result natural";
  return `${base}, ${strength}. Preserve the person's identity, pose, clothing, lighting and background unless the tool says otherwise. Avoid plastic skin, warped shapes and fake lighting.`;
}

type Operation = "upscale" | "remove-background" | "restore" | "inpaint" | "edit";

function operationFor(toolId: string): Operation {
  if (toolId === "hd-enhance") return "upscale";
  if (toolId === "remove-background") return "remove-background";
  if (toolId === "face-enhance") return "restore";
  if (toolId === "remove-object" && INPAINT_MODEL) return "inpaint";
  return "edit";
}

// Isolated input-shape builders: if a model run fails with a schema error,
// only these need adjusting (verify against each model's API tab).
function buildModelInput(
  operation: Operation,
  imageUrl: string,
  prompt: string,
): { model: string; input: Record<string, unknown> } {
  if (operation === "upscale") {
    return {
      model: UPSCALE_MODEL,
      input: { image: imageUrl, scale: 2, face_enhance: false },
    };
  }
  if (operation === "remove-background") {
    return { model: BG_MODEL, input: { image: imageUrl } };
  }
  if (operation === "restore") {
    return { model: FACE_RESTORE_MODEL, input: { img: imageUrl } };
  }
  if (operation === "inpaint") {
    return { model: INPAINT_MODEL, input: { image: imageUrl, prompt } };
  }
  // aspect_ratio/output_format made explicit (match upstream defaults) so a
  // future default change can't silently alter Pixeliia results.
  return {
    model: EDIT_MODEL,
    input: {
      [EDIT_IMAGE_KEY]: imageUrl,
      prompt,
      aspect_ratio: "match_input_image",
      output_format: "jpg",
    },
  };
}

type ReplicatePrediction = {
  id: string;
  status: string;
  output?: unknown;
  error?: unknown;
};

async function replicateFetch(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`https://api.replicate.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${REPLICATE_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Replicate ${path} failed (${response.status}): ${body.slice(0, 300)}`);
  }
  return response;
}

/**
 * Creates the Replicate prediction and returns immediately with its id.
 * Never waits for the model — process-edit-status advances the job.
 */
async function createPrediction(
  model: string,
  input: Record<string, unknown>,
): Promise<string> {
  const [owner, name] = model.split("/");
  if (!owner || !name) throw new Error(`Bad model slug: ${model}`);
  const created = (await (await replicateFetch(`/models/${owner}/${name}/predictions`, {
    method: "POST",
    body: JSON.stringify({ input }),
  })).json()) as ReplicatePrediction;
  if (!created.id) {
    throw new Error("AI did not start. Try again.");
  }
  return created.id;
}

// Browsers send a CORS preflight (OPTIONS) before the real POST whenever
// custom headers (authorization, apikey, content-type) are present — which
// supabase-js always sends. Answer it here, before any method handling,
// or the browser blocks the worker call and jobs sit in `queued` forever.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    // NOTE: 204 must carry a null body — new Response("ok", {status: 204})
    // throws per the Fetch spec and the runtime answers 500 instead.
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "POST with { jobId } required." }, 405);
  }
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    return json({ ok: false, error: "Worker misconfigured (Supabase env)." }, 500);
  }
  if (!REPLICATE_TOKEN) {
    return json(
      { ok: false, error: "Worker misconfigured (REPLICATE_API_TOKEN missing)." },
      500,
    );
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

  // Identify the caller through their own JWT. Never fail-mark another
  // caller's row: auth failures return before touching any job state.
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
  const fail = async (message: string) => {
    await supabase.from("edit_jobs").update({ status: "failed", error: message }).eq("id", jobId);
    return json({ ok: false, error: message });
  };

  // Owner-scoped read: RLS only returns this caller's own rows.
  const { data: job, error: jobError } = await userClient
    .from("edit_jobs")
    .select("id,tool_id,intensity,source_path,status,user_id,params")
    .eq("id", jobId)
    .single();
  if (jobError || !job) {
    return json({ ok: false, error: "Edit job not found." }, 404);
  }
  const row = job as JobRow;
  if (row.user_id && row.user_id !== callerId) {
    return json({ ok: false, error: "Not your edit job." }, 403);
  }
  if (row.status === "succeeded") {
    const { data: done } = await userClient
      .from("edit_jobs")
      .select("result_path")
      .eq("id", jobId)
      .single();
    return json({ ok: true, result_path: (done as { result_path: string } | null)?.result_path ?? null });
  }
  if (row.status !== "queued") return await fail("Edit job is already being processed.");

  // Atomic claim so double-invokes cannot run the model twice.
  const { data: claimed } = await supabase
    .from("edit_jobs")
    .update({ status: "processing" })
    .eq("id", jobId)
    .eq("status", "queued")
    .select("id");
  if (!claimed || (claimed as unknown[]).length === 0) {
    return json({ ok: false, error: "Edit job already claimed." }, 409);
  }

  try {
    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.source_path, 3600);
    if (signError || !signed?.signedUrl) {
      throw new Error(`Could not read source photo: ${signError?.message ?? "unknown"}`);
    }

    const operation = operationFor(row.tool_id);
    const { model, input } = buildModelInput(
      operation,
      signed.signedUrl,
      promptFor(row.tool_id, row.intensity, row.params),
    );
    // Fire-and-return: create the prediction, record it, hand off to the
    // status function. Never wait for the model here.
    const predictionId = await createPrediction(model, input);

    const { error: markError } = await supabase
      .from("edit_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        replicate_prediction_id: predictionId,
        error: null,
      })
      .eq("id", jobId);
    if (markError) throw new Error("Could not start the edit job.");
    return json({ ok: true, job_id: jobId, prediction_id: predictionId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Edit failed. Try again.";
    return await fail(message.slice(0, 500));
  }
});
