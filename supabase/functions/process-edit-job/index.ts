// Pixeliia Phase 4: AI edit worker (Supabase Edge Function, Deno).
//
// Flow: client uploads source -> inserts edit_jobs row (status queued) ->
// invokes this function with { jobId } -> worker claims the job, runs the
// Replicate model for the tool, stores the result in the private `pixeliia`
// bucket and marks the job succeeded/failed. The client awaits this response.
//
// Deploy:  supabase functions deploy process-edit-job
// Secrets:  supabase secrets set REPLICATE_API_TOKEN=r8_... \
//             REPLICATE_EDIT_MODEL=black-forest-labs/flux-kontext-pro \
//             REPLICATE_UPSCALE_MODEL=nightmareai/real-esrgan \
//             REPLICATE_BG_MODEL=cjwbw/rembg
// Invoke auth: verify_jwt is false in supabase/config.toml so the anonymous
// app can trigger its own jobs; the function only ever processes rows still
// in `queued` state and the Replicate token never leaves the server.
//
// Model slugs and input keys below are best-known defaults. Before first
// production use, open each model's API tab on replicate.com and confirm the
// slug plus input field names; overrides need only `supabase secrets set`
// (no code change) except for input shapes, which live in buildModelInput().

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const REPLICATE_TOKEN = Deno.env.get("REPLICATE_API_TOKEN") ?? "";
const EDIT_MODEL =
  Deno.env.get("REPLICATE_EDIT_MODEL") ?? "black-forest-labs/flux-kontext-pro";
const UPSCALE_MODEL =
  Deno.env.get("REPLICATE_UPSCALE_MODEL") ?? "nightmareai/real-esrgan";
const BG_MODEL = Deno.env.get("REPLICATE_BG_MODEL") ?? "cjwbw/rembg";
// Kontext-style edit models name their image field differently; override
// without redeploying code if the API tab shows another name.
const EDIT_IMAGE_KEY = Deno.env.get("REPLICATE_EDIT_IMAGE_KEY") ?? "input_image";

const BUCKET = "pixeliia";
const REPLICATE_POLL_MS = 3000;
const REPLICATE_TIMEOUT_MS = 8 * 60 * 1000;

type JobRow = {
  id: string;
  tool_id: string;
  intensity: number;
  source_path: string;
  status: string;
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
  "face-enhance": "Natural face quality pass preserving facial structure, hair and identity",
  slimmer: "Make the body subtly slimmer without warping the background",
  "more-athletic": "Make the build slightly more athletic while keeping pose and clothing",
  "adjust-waist": "Subtly adjust the waist while preserving identity and background",
  "outfit-color": "Change only the clothing color, keep the garment shape and folds",
  "outfit-style": "Restyle the existing outfit while keeping the person and pose",
  "replace-clothing": "Replace the clothing with a stylish new outfit, keep face, body and pose",
  "iphone-look": "Apply a natural iPhone-style camera look: clean color, balanced HDR",
  "pixel-look": "Apply a Google Pixel-style camera look: crisp detail, vivid yet natural color",
  "galaxy-look": "Apply a Samsung Galaxy-style camera look: rich color, smooth rendering",
  "blur-background": "Blur the background with a portrait effect, keep the subject sharp",
  "remove-object": "Remove the most prominent unwanted object or distraction, fill in naturally",
};

const INTENSITY_WORDS: Array<[number, string]> = [
  [75, "with a strong but still believable effect"],
  [50, "keeping the result natural"],
  [0, "very subtly"],
];

function promptFor(toolId: string, intensity: number): string {
  const base =
    TOOL_PROMPTS[toolId] ?? "Improve this photo while keeping it natural";
  const strength =
    INTENSITY_WORDS.find(([min]) => intensity >= min)?.[1] ?? "keeping the result natural";
  return `${base}, ${strength}. Preserve the person's identity, pose, clothing, lighting and background unless the tool says otherwise. Avoid plastic skin, warped shapes and fake lighting.`;
}

function operationFor(toolId: string): "upscale" | "remove-background" | "edit" {
  if (toolId === "hd-enhance") return "upscale";
  if (toolId === "remove-background") return "remove-background";
  return "edit";
}

// Isolated input-shape builders: if a model run fails with a schema error,
// only these need adjusting (verify against each model's API tab).
function buildModelInput(
  operation: "upscale" | "remove-background" | "edit",
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
  return { model: EDIT_MODEL, input: { [EDIT_IMAGE_KEY]: imageUrl, prompt } };
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

async function runPrediction(
  model: string,
  input: Record<string, unknown>,
): Promise<string> {
  const [owner, name] = model.split("/");
  if (!owner || !name) throw new Error(`Bad model slug: ${model}`);
  const created = (await (await replicateFetch(`/models/${owner}/${name}/predictions`, {
    method: "POST",
    headers: { Prefer: "wait=60" },
    body: JSON.stringify({ input }),
  })).json()) as ReplicatePrediction;

  let prediction = created;
  const startedAt = Date.now();
  while (prediction.status === "starting" || prediction.status === "processing") {
    if (Date.now() - startedAt > REPLICATE_TIMEOUT_MS) {
      throw new Error("AI model timed out. Try again.");
    }
    await new Promise((resolve) => setTimeout(resolve, REPLICATE_POLL_MS));
    prediction = (await (await replicateFetch(`/predictions/${prediction.id}`)).json()) as ReplicatePrediction;
  }
  if (prediction.status !== "succeeded") {
    const detail =
      typeof prediction.error === "string" ? prediction.error : JSON.stringify(prediction.error ?? "unknown");
    throw new Error(`AI edit failed: ${detail.slice(0, 300)}`);
  }
  const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (typeof output !== "string" || !output.startsWith("http")) {
    throw new Error("AI model returned no image. Try again.");
  }
  return output;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "POST with { jobId } required." }, { status: 405 });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return Response.json({ ok: false, error: "Worker misconfigured (Supabase env)." }, { status: 500 });
  }
  if (!REPLICATE_TOKEN) {
    return Response.json(
      { ok: false, error: "Worker misconfigured (REPLICATE_API_TOKEN missing)." },
      { status: 500 },
    );
  }

  let jobId = "";
  try {
    jobId = ((await req.json()) as { jobId?: string }).jobId ?? "";
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  if (!jobId) {
    return Response.json({ ok: false, error: "jobId required." }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const fail = async (message: string) => {
    await supabase.from("edit_jobs").update({ status: "failed", error: message }).eq("id", jobId);
    return Response.json({ ok: false, error: message });
  };

  const { data: job, error: jobError } = await supabase
    .from("edit_jobs")
    .select("id,tool_id,intensity,source_path,status")
    .eq("id", jobId)
    .single();
  if (jobError || !job) return await fail("Edit job not found.");
  const row = job as JobRow;
  if (row.status === "succeeded") {
    const { data: done } = await supabase
      .from("edit_jobs")
      .select("result_path")
      .eq("id", jobId)
      .single();
    return Response.json({ ok: true, result_path: (done as { result_path: string } | null)?.result_path ?? null });
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
    return Response.json({ ok: false, error: "Edit job already claimed." }, { status: 409 });
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
      promptFor(row.tool_id, row.intensity),
    );
    const outputUrl = await runPrediction(model, input);

    const outputRes = await fetch(outputUrl);
    if (!outputRes.ok) throw new Error("Could not download the AI result.");
    const bytes = new Uint8Array(await outputRes.arrayBuffer());
    const contentType = outputRes.headers.get("content-type") ?? "image/png";
    const extension = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
    const resultPath = `results/${jobId}.${extension}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(resultPath, bytes, {
      contentType,
      upsert: true,
    });
    if (uploadError) throw new Error(`Could not store the result: ${uploadError.message}`);

    await supabase
      .from("edit_jobs")
      .update({ status: "succeeded", result_path: resultPath, error: null })
      .eq("id", jobId);
    return Response.json({ ok: true, result_path: resultPath });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Edit failed. Try again.";
    return await fail(message.slice(0, 500));
  }
});
