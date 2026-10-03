# Pixeliia — Implementation Plan

Source requirements: `docs/Pixeliia_PRD_v1.0.md`.
Rule: build in small verified phases (`tsc` + `expo lint` + `expo-doctor` green before every commit).

## Shipped

- [x] Phase 0 — Stabilize: checkpoint commit, lint/typecheck scripts, AGENTS.md fix, empty folder removed, template lint errors fixed. (`415cdd4`)
- [x] Phase 1 — Local foundation: patch drift fixed, AsyncStorage persistence (projects/photo/onboarding), project restore bug fixed, real gallery save. (`1a5ac38`)
- [x] Phase 2 — Editor UX: `runEdit` pipeline seam, hold-to-compare Before/After, Reset to original, busy/error/retry states. (`a4f1218`)
- [x] Phase 3 — Backend client: supabase-js + sqlite session + file-system, lazy client with local fallback, upload → job flow, migration `0001` (jobs table + bucket). (`7c52c4f`)
- [x] Phase 4 — AI worker: `process-edit-job` Edge Function on Replicate (instruction edit / upscale / background removal, 24 tool prompts, atomic claim), client switched to invoke-await. (`435ac57`)
- [x] Phase 5 — Monetization shell: real watermarked Standard/HD captures (view-shot), clean export, persisted ESPEE ledger, Profile purchases, `eas.json`. (`f21adb5`)
- [x] Phase 6 — Lockdown: anonymous auth at launch, owner-only RLS (migration `0002`), user-scoped storage, worker JWT ownership check. (`2c7fb93`)
- [x] Auth upgrade: email linking (uid-preserving via `updateUser`), `/auth` sign-in screen, sign-out with guest warning. (`72e6753`)
- [x] Ads backend: schema (migration `0003`: placements, campaigns, creatives, hourly billboard bookings, `ad_events`), serving client with 5-min cache, once-per-session impressions, house fallbacks, fixed slot layouts. (`34c68de`)
- [x] Age Transform: Age category + tool, 0–100 slider + 6 PRD presets, guardrail AI label, generic `params` job channel (migration `0004`). (`9f5e4c5`)
- [x] Appearance Studio: Hair Color, Makeup Look, Facial Hair, Style Preset with one-tap variants; generic `Tool.variants` + `Tool.aiNotice` fields; worker studio prompts. (`2537d65`)
- [x] Analytics: offline AsyncStorage queue with batched flush, fixed event vocabulary (onboarding/photo/edit/export/auth), `app_events` table (migration `0005`). (`ffe4298`)
- [x] Release polish: `aiNotice` guardrails on all altering tools (body/outfit/background/cleanup), export empty state, mode-aware editor note, Home thumbnails, accessibility labels, onboarding pricing transparency. (`94b9b83`)

## Go-live checklist (requires owner keys — no code substitutes)

- [ ] Create Supabase project, enable Anonymous sign-ins (Dashboard → Authentication → Sign-In).
- [ ] Run migrations `0001`–`0005` in order (SQL Editor or `supabase db push`).
- [ ] Set `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` (git-ignored), restart `expo start`.
- [ ] Replicate token (`supabase secrets set REPLICATE_API_TOKEN=…`), confirm model slugs in `supabase/functions/process-edit-job/index.ts`, `supabase functions deploy process-edit-job`.
- [ ] First real AI edit end-to-end → `eas init` → development → preview → production builds → store submission.

## Later code (ordered by value once live)

- [ ] Tool quality pass: per-tool prompt tuning from real outputs; intensity calibration; never charge ESPEE for failed jobs (ledger refund).
- [ ] Server-side ESPEE billing: ledger tables replace the test ledger; remove test top-up.
- [ ] Advertiser side: campaign dashboard, analytics aggregates, automated billing, billboard exclusivity enforcement.
- [ ] Long-tail tools: external watermark removal, phone/camera watermark library, extra camera looks/backgrounds/lighting.
- [ ] Release hardening: job retention/cleanup, storage lifecycle, mid-range Android performance pass, thumbnail caching.
