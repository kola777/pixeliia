# PIXELIIA — PRODUCT REQUIREMENTS DOCUMENT
*Version 1.0 • One-click AI photo editing • Free editing • Lightweight UX*

## 1. Product Summary
Pixeliia is a lightweight mobile AI photo editor designed around one-click actions rather than text prompts. Users select a photo, choose a tool, and Pixeliia performs the edit automatically. Basic editing is free. The product should feel fast, clean, visual, beginner-friendly, and natural—not like a complex professional editor.

## 2. Product Vision
Make high-quality AI photo editing as simple as choosing a button.
- No prompt writing required for core editing.
- One clear action per tool.
- Natural-looking results: improve the photo while preserving the person's identity and scene.
- Fast, lightweight interface with minimal navigation.
- Advertising funds free editing without interrupting users.
- Premium export capabilities provide an additional revenue stream.

## 3. Target Users
- Everyday smartphone photographers.
- Social-media users who want quick improvements.
- People who want portrait, outfit, body, age, background, and camera-look changes without learning complex software.
- Small businesses and creators who need quick visual edits.

## 4. Core Product Principles
1. Photo first: the image is always the primary focus.
1. One-click first: common edits should require one tap.
1. Progressive disclosure: advanced controls appear only when useful.
1. Natural by default: avoid over-smoothed skin, distorted bodies, fake lighting, or obvious AI artifacts.
1. No intrusive advertising: no pop-ups, forced ads, or full-screen interruptions.
1. Lightweight: keep the mobile app small and move heavy AI processing to backend services.
1. Fast feedback: show clear processing status and a before/after comparison.

## 5. Primary Navigation
- Home — featured tools, recent projects, premium billboard ad.
- Edit — photo selection and editing workflow.
- My Photos — recent edits/projects and saved results.
- Profile — account, settings, purchases, privacy, help.
Avoid obsolete wallet/earn navigation for ordinary users. Basic editing does not use a user credit economy.

## 6. Main User Flow
1. Open Pixeliia.
1. Select a photo or take a photo.
1. Choose a category or use Auto Edit.
1. Tap a one-click tool.
1. AI processes the photo.
1. Show Before/After comparison.
1. Allow optional intensity adjustment where appropriate.
1. Save/download using the selected export option.

## 7. Feature Requirements

### 7.1 Auto Edit
- One-tap automatic enhancement.
- Balances exposure, color, contrast, sharpness, skin appearance, and overall image quality.
- Should remain natural rather than applying a heavy preset.
- Offer Before/After and optional intensity.

### 7.2 Enhance / Quality
- Enhance Photo.
- HD Enhance / upscale.
- Sharpen.
- Reduce noise.
- Improve low-light photo.
- Recover detail where technically possible.

### 7.3 Face & Skin
- Smooth Skin.
- Remove Spots.
- Remove Pimples.
- Reduce Wrinkles.
- Remove Blemishes.
- Reduce Dark Circles.
- Brighten Skin.
- Even Skin Tone.
- Fresh Skin.
- Natural Beauty.
- Face Enhance.
- Teeth Whitening.
- Eye Enhance.
Default behavior: preserve pores, texture, facial structure, hair, shadows, and identity. Natural intensity is the default.

### 7.4 Body & Proportion
- Slimmer.
- Wider.
- Taller.
- Shorter.
- More Muscular.
- More Athletic.
- More Defined.
- Larger Build.
- Smaller Build.
- Adjust Waist, Shoulders, Legs, and Arms.
Preserve identity, pose, clothing, lighting, and background as much as possible. Prevent obvious warping.

### 7.5 Age Adjustment
- Age slider from 0–100.
- Quick presets: Newborn, Child, Teen, Adult, Senior, 100 Years.
- Preserve recognizable identity where possible.
- Clearly label generated age transformations as AI edits.

### 7.6 Appearance Studio
- Skin tone adjustment.
- Hair color.
- Hair style.
- Hair texture/style transformations.
- Makeup looks.
- Facial hair options.
- Fashion/style looks.
- Overall appearance presets.
Use appearance/style terminology rather than presenting race or ethnicity as a simple editable attribute. Preserve identity and avoid implying that ethnicity is reducible to skin, hair, or facial features.

### 7.7 Outfit Studio
- Change Outfit Color — change clothing color while preserving the garment where possible.
- Change Outfit Style — modify the style of the existing outfit.
- Change Outfit — transform the outfit into another clothing type/style.
- Replace Clothing — replace selected clothing with a new outfit.
- Suggested style presets: Casual, Formal, Business, Traditional, Sports, Party, Wedding, Streetwear, Summer, Winter.
Preserve face, body, pose, lighting, background, and realistic garment folds/texture.

### 7.8 Camera Look
- Camera-style presets inspired by popular phone-camera processing.
- Examples: iPhone 12 Camera Look, Samsung Galaxy S10 Camera Look, Google Pixel Look, Xiaomi Look, Huawei Look, OnePlus Look.
- Adjust color rendering, HDR feel, contrast, highlight/shadow handling, sharpening, noise reduction, white balance, saturation, skin tones, and portrait rendering.
- Label as a camera look/style simulation—not proof that the photo was actually captured on that device.

### 7.9 Background
- Remove Background.
- Blur Background.
- Replace Background.
- Sky Replace.
- Background Cleanup.
- Extend/Expand Image.
- Studio Background.
- Portrait Background.

### 7.10 Remove / Cleanup
- Remove Object.
- Remove Person.
- Remove Blemish.
- Remove Background.
- Remove Watermark.
- Remove Text.
- Remove Date Stamp.
- Remove Unwanted Distraction.
Watermark removal should be presented for images the user owns or has permission to edit. The tool may support third-party watermarks, text, logos, and multiple watermarks.

### 7.11 Color & Lighting
- Auto Color.
- Brightness.
- Contrast.
- Saturation.
- Temperature.
- Tint.
- Highlights.
- Shadows.
- Exposure.
- Vibrance.
- Golden Hour.
- Night Enhance.
- Portrait Lighting.

### 7.12 Export & Watermark Options
- Standard Download — free and includes Pixeliia watermark.
- HD Download — 2 ESPEE.
- Remove Pixeliia Watermark — 1 ESPEE.
- Add Phone/Camera Watermark — 1 ESPEE.
- Remove External/Third-Party Watermark — 3 ESPEE.
These prices are the current product assumptions and can be changed later without redesigning the editor.

## 8. Advertising Product
Advertising is visible but never interrupts editing.
- No pop-up ads.
- No forced full-screen ads.
- No ads covering controls.
- No forced ad viewing to continue editing.
- One designated smaller ad space on other pages.
- Ad formats: video, graphic, or text.
- Home page has a premium, prominent billboard.

### 8.1 Premium Home Billboard — Hourly ESPEE Pricing

| Time | Euro reference rate | ESPEE rate* |
| --- | --- | --- |
| 12am–6am | €30/hour | ≈ 21.34 ESPEE/hour |
| 6am–12pm | €75/hour | ≈ 53.33 ESPEE/hour |
| 12pm–6pm | €100/hour | ≈ 71.11 ESPEE/hour |
| 6pm–12am | €150/hour | ≈ 106.67 ESPEE/hour |
*Conversion based on the ESPEE value shown by the user: 1 ESPEE = 1.6 USDT, with the euro reference rate used for planning. The platform should store the actual booking price in ESPEE and avoid silently changing a confirmed booking.
The billboard is billed by booked hour, not by impressions or clicks. The premium position should be exclusive during a purchased time slot.

### 8.2 Standard Ads
- Standard ad spaces are billed separately from the premium billboard.
- Campaign objectives: impressions or clicks.
- Working product assumption: 1 ESPEE = 500 verified impressions OR 20 verified clicks.
- Keep impression and click campaigns as separate campaign types.
- Use fraud protection and verified measurement.
- Do not count a photo edit itself as an ad impression unless an actual ad was displayed according to measurement rules.

## 9. Advertising UX
- Reserve a fixed ad slot in the page layout so the UI does not jump when an ad loads.
- If no ad is available, show a subtle empty/house placeholder or collapse only where appropriate.
- Ads must not block the editor.
- Ads should have clear visual separation from editing controls.

## 10. Screens — Recommended First 10
1. Splash.
1. Onboarding.
1. Home with premium billboard.
1. Photo Picker.
1. Main Editor.
1. Face & Skin.
1. Body / Age / Appearance / Outfit.
1. Camera Look + Before/After.
1. Export / Download & premium options.
1. Profile / Settings.

## 11. UI / Visual Design
- Light, clean interface.
- White or very light neutral background.
- One recognizable Pixeliia accent color.
- Large photo preview.
- Large touch targets.
- Rounded controls used consistently.
- Simple icons plus short labels.
- Minimal shadows and visual clutter.
- Use bottom sheets for secondary options rather than adding more screens.
- Dark mode can be added later if it does not increase initial complexity.

## 12. Performance Requirements
- App should launch quickly on mid-range Android devices.
- Avoid shipping large AI models inside the initial mobile binary where possible.
- Perform heavy AI generation/enhancement on backend infrastructure.
- Compress/resize uploads intelligently while preserving enough detail for the requested operation.
- Cache recent thumbnails and project metadata.
- Show immediate UI feedback while processing.
- Gracefully recover from failed uploads or AI jobs.

## 13. Technical Direction
- Mobile: React Native + Expo.
- Navigation: Expo Router.
- Photo selection: Expo Image Picker.
- Basic image operations: Expo Image Manipulator or appropriate native/image libraries.
- Backend/auth/storage: Supabase.
- AI editing: dedicated AI image APIs/models behind a Pixeliia backend.
- Publishing: EAS.
- Advertising backend: campaign management, creative storage, targeting, impression/click measurement, billing, ESPEE ledger, fraud controls.

## 14. Core Backend Entities
- User.
- Photo/Project.
- Edit Job.
- Generated Image.
- Export.
- Advertiser.
- Campaign.
- Ad Creative.
- Ad Placement.
- Billboard Booking.
- Impression Event.
- Click Event.
- ESPEE Wallet/Ledger.
- Purchase/Transaction.

## 15. Success Metrics
- Time from opening app to first successful edit.
- Percentage of users who complete a first edit.
- Edit completion rate by feature.
- AI job success rate.
- Average processing time.
- Export conversion rate.
- HD/watermark feature purchase rate.
- 7-day and 30-day retention.
- Ad impressions and verified clicks.
- Advertiser campaign completion and repeat purchase rate.
- Crash-free sessions and app size.

## 16. MVP Scope
The first release should not attempt to ship every possible AI capability.
- Home + premium billboard slot.
- Photo picker.
- Auto Edit.
- Enhance.
- Face & Skin core tools.
- Body core tools.
- Background Remove/Blur.
- Object Remove.
- Change Outfit Color.
- Change Outfit Style.
- Replace Clothing.
- Camera Look.
- Before/After.
- Standard and HD export.
- Pixeliia watermark.
- Basic profile/settings.
- One fixed standard ad slot per applicable page.

## 17. Phase 2
- Age 0–100 transformations.
- Full Appearance Studio.
- Advanced outfit replacement.
- External watermark removal.
- Phone/camera watermark library.
- Advanced lighting.
- More camera looks.
- More background generation.
- Advertiser dashboard.
- Automated ESPEE billing and campaign analytics.

## 18. Product Guardrails
- AI edits should be clearly represented as edits when they materially alter a photo.
- Avoid misleading camera/device claims when a camera look is simulated.
- Protect user photos and provide clear privacy controls.
- Do not use user photos for model training without appropriate consent and product/legal controls.
- Watermark removal should be positioned for content the user owns or is authorized to edit.

## 19. Definition of Done — Core Edit
1. User can select a photo in under a few taps.
1. User can find a common tool without searching or typing.
1. Tool performs the edit with one primary action.
1. Processing state is clear.
1. Before/After is available.
1. User can undo or return to the original.
1. Export options are clearly priced.
1. No advertisement interrupts the workflow.

## 20. One-Sentence Product Definition
Pixeliia is a lightweight, free-to-use, one-click AI photo editor that lets anyone improve, transform, and personalize photos without writing prompts, while generating revenue through unobtrusive advertising and optional premium exports.
