# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/scanner-device-management`
- **Goal:** Let business operators see, rename, and revoke scanner devices without weakening scan security.

## Architectural Decisions

- Keep direct SELECT reads for `business_scanner_devices`; the existing RLS policy already limits rows to business staff.
- Add `rename_business_scanner_device` as a `security definer` RPC that permits the device creator or business manager to update the label.
- Add `revoke_business_scanner_device` as a manager-only RPC so scanner-role staff cannot remove other operators' devices.
- Update `register_business_scanner_device` so a revoked installation returns `DEVICE_REVOKED` instead of silently becoming active again.
- Preserve manually renamed scanner labels when the same installation checks in again.
- Add the mobile surface to business profile, not the scanner screen, so the event-day scanner stays focused.
- Replace the stale `scan_stamp_atomic` reward unlock block with the current `reward_tiers.status = 'ACTIVE'` model and remove writes to non-existent event registration cache columns.
- Keep staff PIN as the next dedicated slice; enforcing a PIN correctly needs separate UX, hashing/storage, and scan RPC validation.

## Edge Cases

- Revoked current device opens scanner again: registration returns a clear error and scan submission remains blocked.
- Scanner-role staff renames the device they created: allowed.
- Scanner-role staff tries to revoke a device: denied by RPC.
- Owner/manager revokes a stale device: later scans using that device fail with `SCANNER_DEVICE_NOT_ALLOWED`.
- Empty or too-long labels: RPC rejects empty labels and truncates overly long labels to the existing 80 character limit.
- Reward tier unlock after a successful scan: returns newly unlocked active reward tiers without auto-inserting invalid reward claims.
- Event completion after a successful scan: sets `completed_at` when the valid stamp count reaches `minimum_stamps_required`.

## Ordered Follow-Up Queue

1. Add staff PIN setup and scan-time PIN verification.
2. Add admin/club fraud review actions for `SCANNER_DISTANCE_ANOMALY`.
3. Add typed event rules builder for leima quotas and venue-specific limits.
4. Add announcement/push opt-in/read-receipt model.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
