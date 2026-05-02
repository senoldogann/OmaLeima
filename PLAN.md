# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/scanner-device-audit`
- **Goal:** Tie every event-day scan to a named business scanner device when the scanner can register itself.

## Architectural Decisions

- Add `business_scanner_devices` with one active device row per `business_id + installation_id`.
- Register devices through a `security definer` RPC that requires active business staff membership.
- Keep `scannerDeviceId` as text in existing scan tables to avoid a destructive type migration; store the UUID string returned by the registry.
- Validate any non-null `scannerDeviceId` inside `scan_stamp_atomic` before inserting `qr_token_uses` and `stamps`.
- Store the install ID locally using SecureStore on native and localStorage on web.
- Use a simple generated label per platform/business for now; editable scanner names/PIN setup can be a later UI slice.

## Edge Cases

- Active staff scans from a fresh install: device row is created and scan uses its UUID.
- Same install scans the same business later: device row is updated with `last_seen_at`.
- Same install scans another business: a separate device row is created for that business.
- Forged or deleted scanner device ID: scan RPC returns `SCANNER_DEVICE_NOT_ALLOWED`.
- Device registration failure: scanner shows an error and does not submit QR reads.

## Ordered Follow-Up Queue

1. Add editable scanner device names and optional staff PIN.
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
