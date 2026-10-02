/**
 * Edit pipeline seam.
 *
 * Phase 2: local placeholder so the full editor UX (auto-run, intensity,
 * Before/After, export) is testable without a backend. Returns the original
 * photo, exactly like the previous inline mock did.
 *
 * Phase 3: replace the body with a Supabase/AI edit-job
 * create + poll loop. The signature stays the same so no screen changes.
 */
export async function runEdit(
  photoUri: string,
  _toolId: string,
  _intensity: number
): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return photoUri;
}
