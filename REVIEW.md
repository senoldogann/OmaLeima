# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/scanner-device-management`
- **Scope:** Add safe scanner device management after scanner device audit identity.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/business/profile.tsx`
- `apps/mobile/src/features/scanner/scanner-device.ts`
- `apps/mobile/src/features/scanner/types.ts`
- `supabase/migrations/20260503134500_scanner_device_management.sql`
- `supabase/migrations/20260503140000_scanner_device_registration_preserve_label.sql`
- `supabase/migrations/20260503141000_scan_stamp_reward_status_fix.sql`
- `supabase/migrations/20260503142000_scan_stamp_minimum_stamps_fix.sql`
- `supabase/migrations/20260503143000_scan_stamp_registration_completion_fix.sql`

## Existing Logic Checked

- `business_scanner_devices` already records installation ID, label, platform, status, first seen, and last seen.
- Business staff can read scanner devices through RLS, but there is no mobile management surface.
- The registration RPC currently reactivates a revoked scanner on conflict, so revocation would not be meaningful.
- Business managers are already represented by `public.is_business_manager_for`.
- Remote Supabase lint also caught old `scan_stamp_atomic` schema drift: `reward_tiers.is_active`, `events.min_stamps_required`, and `event_registrations.stamp_count` no longer match the current schema.

## Risks

- Device labels are operational metadata; staff auth and event scan RPC checks remain the security boundary.
- Revoked devices must stay revoked until a deliberate restore flow exists.
- Scanner-role staff should not be able to revoke shared business devices.
- Profile UI must stay useful for event-day operators without turning into a dense admin console.
- Scan reward unlock fixes must preserve existing QR expiry, duplicate, registration, venue, device, leaderboard, and audit behavior.

## Review Outcome

Add RPCs for renaming and revoking scanner devices, prevent revoked devices from auto-reactivating, expose a compact scanner device section in the business profile, and repair the remote-linted scan reward/completion schema drift.
