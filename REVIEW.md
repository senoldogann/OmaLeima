# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-04
- **Branch:** `bug/media-business-scanner-audit`
- **Scope:** Verify and harden image upload flows, business event rails, and scanner-only event permissions after the media regressions.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/media/storage-upload.ts`
- `apps/mobile/src/features/business/business-media.ts`
- `apps/mobile/src/features/club/club-media.ts`
- `apps/mobile/src/features/club/club-event-media.ts`
- `apps/mobile/src/app/club/profile.tsx`
- `apps/mobile/src/features/events/event-visuals.ts`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/app/business/events.tsx`
- `apps/mobile/src/features/business/business-home.ts`
- `supabase/migrations/20260504000604_restrict_scanner_event_management.sql`
- `supabase/migrations/20260504001159_restrict_scanner_event_leave_management.sql`

## Existing Logic Checked

- Business, club, and club-event image uploads share `readImageUploadBody`, but the helper currently reads picker file URIs with `fetch(uri)`.
- Picker calls do not request `base64`, so native file URI reads can still produce empty bodies on some iOS/RN paths.
- Business profile uploads immediately persist the uploaded URL through `useUpdateBusinessProfileMutation`.
- Club profile uploads only update local draft; a separate save is needed, which makes the media flow feel broken.
- Business home already centers a single rail item and left-aligns multiple items through `eventRailContentSingle`.
- Business events hides joinable opportunities for all-SCANNER accounts and hides leave action per scanner membership; backend RPCs also reject scanner-only join/leave.

## Risks

- Base64 upload bodies increase transient memory usage, but the existing picker quality and Supabase file limits keep this bounded.
- Existing broken zero-byte storage objects will not repair automatically; users must re-upload those photos.
- Club profile auto-save after media upload must preserve contact email and announcement fields in the current draft.
- Scanner permissions must remain server-enforced even if UI hides management actions.
- Image prefetch warnings should stay useful without spamming repeated zero-byte warnings.

## Review Outcome

Use picker base64 when available for upload bodies, keep file URI read as an explicit fallback with byte-length validation, auto-save club profile media after upload, and reduce repeated prefetch warnings. Existing business rail and scanner join/leave protections are present but will be revalidated.
