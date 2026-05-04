# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-04
- **Branch:** `bug/media-upload-render-recovery`
- **Scope:** Recover profile/event media rendering after zero-byte uploads and make post-upload public URL verification more resilient.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/media/remote-image-health.ts`
- `supabase/migrations/20260504094444_prune_zero_byte_media_references.sql`

## Existing Logic Checked

- Storage object inspection shows older event/business/club media uploads with `size = 0`, while newer uploads are non-zero and publicly readable.
- Current `events`, `clubs`, and `businesses` rows can still point at old zero-byte public URLs, which keeps showing broken or black media even after upload code improvements.
- `verifyPublicImageUrlAsync` relies on a single immediate HEAD check; this can be brittle after upload and does not clear the in-memory broken URL set after a URL later verifies.
- `CoverImageSurface` already falls back when a URL is known broken, so the data references and health check are the weakest remaining link.

## Risks

- Data cleanup must not delete storage objects or valid URLs; it should only null DB references to storage objects that are already zero bytes.
- URL verification should avoid false negatives caused by short CDN/storage propagation, but still reject truly empty files.
- The fix must remain bucket-agnostic enough for local/hosted project refs and avoid hard-coded Supabase project URLs.

## Review Outcome

Add a data migration that nulls DB references to zero-byte `event-media` and `business-media` objects, and harden remote image verification with retry + range GET fallback + healthy URL cache clearing.
