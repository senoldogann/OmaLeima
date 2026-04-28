# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-business-join-and-scanner-foundation`
- **Scope:** Phase 4 business event join flow plus the first real scanner screen and scan request state machine.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `supabase/migrations/*`
- `docs/DATABASE.md`
- `apps/mobile/src/app/business/*`
- `apps/mobile/src/features/business/*`
- `apps/mobile/src/features/scanner/*`
- `apps/mobile/app.config.ts`
- `apps/mobile/package.json`

## Risks

- Business join currently has no write path, so the new RPC must be atomic and enforce time-based rules in the database.
- Scanner flow depends on `scan-qr`, so the client must always send explicit `businessId` for multi-business staff accounts.
- Camera preview must unlock after success, failure, and timeout; otherwise staff can get stuck on event day.
- Expo camera support is platform-sensitive, so web preview needs a fallback input path that still exercises the real networked scan behavior.
- Rapid duplicate scans can happen both from camera callbacks and impatient taps, so the scanner state machine must debounce locally before the backend responds.

## Dependencies

- Existing business auth/access resolver and `business/home` route.
- Existing `scan-qr` Edge Function and `scan_stamp_atomic` RPC.
- Existing `event_venues`, `events`, and `business_staff` schema foundation.
- Current Expo Router mobile shell and Supabase session bootstrap.

## Existing Logic Checked

- `business/home` already shows joined and opportunity context, but it has no real action path yet.
- `scan-qr` already supports explicit `businessId`, optional `scannerDeviceId`, and optional location payloads.
- Student registration already uses the repo pattern we want here: DB RPC from mobile plus targeted query invalidation.
- There is no current mobile scanner module or camera dependency in `apps/mobile`.

## Review Outcome

Add a database RPC for business event join, build a dedicated business events screen that can join public city events, add a scanner feature module with permission, timeout, locked-scan, and result-state handling, and wire `business/home` into those routes so Phase 4 gets its first true action path.
