# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-01
- **Branch:** `feature/business-media-upload`
- **Scope:** Replace manual business media URL entry with a Supabase Storage backed gallery upload flow, apply the remote storage policies, and capture Finnish appro/leima product research for the next roadmap slice.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `docs/FINNISH_APPRO_PRODUCT_NOTES.md`
- `supabase/migrations/20260501103000_business_media_storage.sql`
- `apps/mobile/app.config.ts`
- `apps/mobile/package.json`
- `apps/mobile/package-lock.json`
- `apps/mobile/src/features/business/business-media.ts`
- `apps/mobile/src/app/business/profile.tsx`

## Risks

- Storage uploads must not allow arbitrary authenticated users to overwrite business media.
- Public business images are acceptable because logo and cover images are marketing/profile assets, but uploads must remain manager-only.
- iOS and Android builds need the `expo-image-picker` config plugin so gallery permission copy is available in native binaries.
- Uploaded media must keep using the existing `businesses.logo_url` and `businesses.cover_image_url` fields so scanner/profile rendering does not need a second data source.
- Appropassi behavior differs by event: some events allow one stamp per venue, others allow two, and degree thresholds differ. The product plan cannot assume one global rule.

## Dependencies

- `public.is_business_manager_for(business_id)` remains the authority for OWNER/MANAGER/platform admin media writes.
- Supabase Storage RLS on `storage.objects` guards upload, update, and delete.
- `CoverImageSurface` remains the rendering/caching layer for logo and cover images.
- `expo-image-picker` handles device gallery selection.
- Existing business profile mutation persists the resulting public Storage URL into `public.businesses`.

## Existing Logic Checked

- Business profile already has typed draft/update logic for `logoUrl` and `coverImageUrl`.
- Scanner context already reads the business logo/cover through `useBusinessHomeOverviewQuery`.
- Storage had no project bucket/policies for business media before this slice.
- The master plan already models `1 student + 1 event + 1 venue = maximum 1 leima`; research shows this should become configurable per event/venue before broader rollout.

## Review Outcome

Do a focused full-stack slice:

- create a hosted `business-media` Storage bucket with public reads and manager-only writes
- add image picker dependency and native permission config
- remove business media URL text fields from the mobile profile editor
- add direct gallery upload buttons for cover and logo
- keep the existing scanner/profile read model unchanged by saving public URLs back to the business row
- document Finnish appro product gaps around stamps, venue limits, degree tiers, patch claims, and event-day operations
