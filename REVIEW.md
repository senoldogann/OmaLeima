# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-04
- **Branch:** `bug/media-url-resilience`
- **Scope:** Harden mobile media upload/rendering after reports that role profile/event images can upload to black/empty screens and broken Supabase public image URLs keep warning during prefetch.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/media/storage-upload.ts`
- `apps/mobile/src/features/media/remote-image-health.ts`
- `apps/mobile/src/components/cover-image-surface.tsx`
- `apps/mobile/src/features/events/event-visuals.ts`

## Existing Logic Checked

- Business, club, and club event media uploads already route through the shared `storage-upload` helper.
- The helper asks the picker for base64, but decoding currently depends on `globalThis.atob`; native runtime availability is not a good enough assumption for this upload-critical path.
- `CoverImageSurface` renders a fallback asset behind a remote image, but broken remote URLs can still be retried across screens.
- `prefetchEventCoverUrls` catches image prefetch errors once per URL, but it does not detect zero-byte Supabase objects before asking React Native to decode the image.
- The reported Supabase event cover URL returns `content-length: 0`, so old stored objects can remain broken even after upload code is fixed.

## Risks

- HEAD checks must not reject valid images when servers omit `content-length`.
- Broken URL quarantine should be in-memory only; real persisted URLs still need re-upload or DB cleanup.
- Upload body decoding must preserve binary bytes exactly and keep errors explicit.

## Review Outcome

Add a pure base64 decoder for native image uploads, centralize remote image health tracking, skip known broken/zero-byte cover URLs during prefetch, and let every `CoverImageSurface` mark failed remote images as broken so fallbacks stop fighting failed URLs.
