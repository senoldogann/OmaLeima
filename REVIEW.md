# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-04
- **Branch:** `feature/media-storage-business-scanner-fixes`
- **Scope:** Fix empty Supabase Storage uploads from native image pickers, keep business event rails centered for single-card categories, and prevent scanner-only accounts from joining or leaving events.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/media/storage-upload.ts`
- `apps/mobile/src/features/business/business-media.ts`
- `apps/mobile/src/features/club/club-media.ts`
- `apps/mobile/src/features/club/club-event-media.ts`
- `apps/mobile/src/features/business/business-home.ts`
- `apps/mobile/src/features/business/types.ts`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/app/business/events.tsx`
- `supabase/migrations/20260504000604_restrict_scanner_event_management.sql`

## Existing Logic Checked

- The reported event-media URL returns `200 OK` with `content-length: 0`, proving the stored object exists but has no image bytes.
- Business, club profile, and club event cover helpers all used `response.blob()` from native file URIs before upload; this can produce an empty body on React Native.
- Business home already has an image-backed rail, but single items are left-aligned.
- Business events screen exposes join/leave actions to all business memberships; scanner-only accounts should scan only.
- Existing join/leave RPCs validate active business staff membership but do not reject `SCANNER` role explicitly.

## Risks

- Existing zero-byte uploaded objects cannot be repaired client-side; affected covers/logos must be re-uploaded after the helper fix.
- HEAD verification after upload can fail if storage public policies are wrong; surfacing that error is preferred over silently saving a broken URL.
- UI hiding is not sufficient for scanner permissions, so RPC hardening is required.
- Single-card centering should not break multi-card horizontal scrolling.

## Review Outcome

Replace native image upload bodies with non-empty `ArrayBuffer` reads plus public URL verification, add server-side role checks to business join/leave RPCs, filter joinable opportunities to manager roles, hide leave actions for scanners, and center single-card rails.
