# Pixeliia — Implementation Plan

Source requirements: `docs/Pixeliia_PRD_v1.0.md`.
Rule: build in small verified phases (`tsc` + `expo lint` + `expo-doctor` green before every commit).

## Services in use (exact inventory)

| # | Service | What it does for Pixeliia | Package / plan | Keys & where they live | Cost | Status |
|---|---------|---------------------------|----------------|------------------------|------|--------|
| 1 | **Expo SDK 57** (incl. Router, Image Picker/Manipulator, Media Library, File System, SQLite, Splash, Symbols, WebBrowser) | Entire app framework: navigation, photo pick/compress, gallery save, session storage, in-app browser for ads | `expo@~57.0.26` + modules, `expo-router` tabs+stack | None | Free, open source | Wired |
| 2 | **React Native 0.86 + React 19** | UI runtime (Hermes engine) | `react-native@0.86.3`, `react@19.2.3` | None | Free | Wired |
| 3 | **Supabase Postgres + RLS** | `edit_jobs`, `app_events`, `ad_*` tables; row-level security is the entire authz model | Any project (Free tier fits dev) | `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` (git-ignored) | Free tier; paid if limits exceeded | Code done, project needed |
| 4 | **Supabase Auth (anonymous + email)** | Passwordless guest identity at launch; email upgrade via `updateUser` (uid preserved) | Same project | Same public keys; needs Anonymous sign-ins toggled in Dashboard | Included | Code done, toggle needed |
| 5 | **Supabase Storage (private `pixeliia` bucket)** | Source uploads + AI results; app reads only via short-lived service-role signed URLs | Same project | Same public keys (RLS-scoped) | Included in free tier limits | Migration written, bucket created by migration |
| 6 | **Supabase Edge Functions (Deno)** | `process-edit-job` worker: claims job, calls Replicate, stores result, marks job done | Same project | `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_ANON_KEY` auto-provided in function env; `REPLICATE_API_TOKEN` via `supabase secrets set` | Included (execution limits on free tier) | Code done, deploy needed |
| 7 | **Replicate (pay-per-use GPU)** | AI models: Flux Kontext Pro (edits), Real-ESRGAN (HD upscale), rembg (background removal) | No package — plain HTTPS from the worker | `REPLICATE_API_TOKEN` as function secret only (never in the app) | Per-run GPU cents; billing on Replicate account | Code done, token needed |
| 8 | **GitHub** | Source of truth (`kola777/pixeliia`, `main`) | Free private repo | `gh` CLI token on dev machine | Free | Live, in sync |
| 9 | **EAS Build/Submit (`eas.json`)** | Dev/preview/production binaries, store submission (not yet run) | `eas-cli`, profiles in `eas.json` | Expo account login at build time | Free allowance; paid for heavy cadence | Config done, no builds run |
| 10 | **Apple Developer / Google Play** | Store submission only | — | Apple (~$99/yr), Play (~$25 once) | Paid, when submitting | Not started |

Deliberately **not** used: Firebase, Sentry/crash SDK, third-party ad networks (direct-sold ads via our own tables), third-party analytics SDKs (own `app_events` pipeline), `expo-file-system/legacy` APIs (all deprecated paths avoided per SDK 57 docs).

### Environment variables (complete list)

App (`.env.local`, public, git-ignored):
`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Worker (function secrets, never in the app):
`REPLICATE_API_TOKEN` (required), `REPLICATE_EDIT_MODEL` / `REPLICATE_UPSCALE_MODEL` / `REPLICATE_BG_MODEL` / `REPLICATE_EDIT_IMAGE_KEY` (optional overrides, defaults in function header).

### Migrations (run in order)

`0001_edit_jobs.sql` (jobs + bucket), `0002_owner_rls.sql` (owner lockdown), `0003_ads.sql` (placements/campaigns/creatives/bookings/events + house seeds), `0004_job_params.sql` (`params` jsonb), `0005_app_events.sql` (analytics stream).

### Data flows

- **Local mode (no keys):** pick → compress (JPEG 0.8) → `runEdit` placeholder → Before/After → watermarked capture export → gallery + My Photos; ESPEE test ledger; house ads.
- **Backend mode:** pick → upload `uploads/{uid}/…` → insert `edit_jobs{user_id, params}` → invoke worker (150 s race) → worker claims (queued-only), signed-URL source → Replicate → result to `results/{uid}/{job}.ext` → job succeeded → app downloads via signed URL to cache → same export path. Failures throw to Retry; failed jobs never charge ESPEE (refund rule pending server billing).

## Shipped phases

- [x] Phase 0 — Stabilize: checkpoint commit, lint/typecheck scripts, AGENTS.md fix, empty folder removed, template lint errors fixed. (`415cdd4`)
- [x] Phase 1 — Local foundation: patch drift fixed, AsyncStorage persistence (projects/photo/onboarding), project restore bug fixed, real gallery save. (`1a5ac38`)
- [x] Phase 2 — Editor UX: `runEdit` pipeline seam, hold-to-compare Before/After, Reset to original, busy/error/retry states. (`a4f1218`)
- [x] Phase 3 — Backend client: supabase-js + sqlite session + file-system, lazy client with local fallback, upload → job flow, migration `0001`. (`7c52c4f`)
- [x] Phase 4 — AI worker: Edge Function on Replicate (Kontext/ESRGAN/rembg, 24 tool prompts, atomic claim), client invoke-await. (`435ac57`)
- [x] Phase 5 — Monetization shell: real watermarked Standard/HD captures (view-shot), clean export, persisted ESPEE ledger (5 welcome grant, test top-up), Profile purchases, `eas.json`. (`f21adb5`)
- [x] Phase 6 — Lockdown: anonymous auth at launch, owner-only RLS (`0002`), user-scoped storage, worker JWT ownership (401/403/404 never touch row state). (`2c7fb93`)
- [x] Auth upgrade: email linking (uid-preserving `updateUser`), `/auth` screen with validation/confirmation states, sign-out with guest-loss warning, live account row. (`72e6753`)
- [x] Ads backend: schema (`0003`), serving client (active-booking lookup, paid-first standard, 5-min cache, once-per-session impressions), tappable creatives via system browser, house fallbacks, fixed slot layouts. (`34c68de`)
- [x] Age Transform: Age category, 0–100 slider + 6 PRD presets, guardrail AI label, generic `params` channel (`0004`). (`9f5e4c5`)
- [x] Appearance Studio: Hair Color, Makeup Look, Facial Hair, Style Preset with one-tap variants; generic `Tool.variants` + `Tool.aiNotice`; worker studio prompts. (`2537d65`)
- [x] Analytics: offline AsyncStorage queue (500 cap, batched flush), fixed vocabulary (onboarding/photo/edit/export/auth), `app_events` (`0005`). (`ffe4298`)
- [x] Release polish: `aiNotice` on all altering tools (body/outfit/background/cleanup), export empty state, mode-aware editor note, Home thumbnails, a11y labels, onboarding pricing transparency. (`94b9b83`)
- [x] Plan doc: this file, plus services inventory and data flows. (`efb9f33`, `27b10af`)
- [x] Billing fairness: ESPEE refund on failed paid exports, permission checked before charging. (`b38e3cf`)
- [x] Web hardening: sqlite, view-shot, and media-library isolated behind platform splits (`deviceStorage`, `capturePhoto`, `gallery`); verified by loading `/`, `/export`, `/onboarding`, `/editor/auto-edit` on dev web. (`244c815`, `edaace0`)
- [x] Brand + catalog growth: `Logo` lockup on Home/Onboarding; outfit variants (6 colors, 10 style presets, 6 replacements, featured swap to Replace Clothing); 5-look characteristic-based camera system with iPhone Natural default. (`ec10862`, `3df7aa2`)

Current catalog: 31 tools across 10 categories (7 featured); 5 migrations (`0001`–`0005`); 0 secrets in repo.

## Go-live checklist (requires owner keys — no code substitutes)

- [ ] Create Supabase project, enable Anonymous sign-ins (Dashboard → Authentication → Sign-In).
- [ ] Run migrations `0001`–`0005` in order (SQL Editor or `supabase db push`).
- [ ] Set `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`, restart `expo start`.
- [ ] Replicate token (`supabase secrets set REPLICATE_API_TOKEN=…`), confirm model slugs in `supabase/functions/process-edit-job/index.ts`, `supabase functions deploy process-edit-job`.
- [ ] First real AI edit end-to-end → `eas init` → development → preview → production builds → store submission.

## Later code (ordered by value once live)

- [ ] Tool quality pass: per-tool prompt tuning from real outputs; intensity calibration; ESPEE refund on worker failure.
- [ ] Server-side ESPEE billing: ledger tables replace the test ledger; remove test top-up.
- [ ] Advertiser side: campaign dashboard, analytics aggregates, automated billing, billboard exclusivity enforcement.
- [ ] Long-tail tools: external watermark removal, phone/camera watermark library, extra camera looks/backgrounds/lighting.
- [ ] Release hardening: job retention/cleanup, storage lifecycle, mid-range Android performance pass, thumbnail caching.
