# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/scanner-staff-pin`
- **Goal:** Add optional scanner staff PINs that are enforced by the backend during QR scans.

## Architectural Decisions

- Store PIN hashes in `business_scanner_device_pins`, not in the staff-readable device registry table.
- Add `pin_set_at` to `business_scanner_devices` as non-sensitive UI state.
- Use `crypt()` / `gen_salt('bf')` from `pgcrypto` for PIN hashing.
- Add `set_business_scanner_device_pin` and `clear_business_scanner_device_pin` RPCs for the device creator or business manager.
- Extend `register_business_scanner_device` to return `pinRequired` so the scanner knows whether to prompt.
- Extend `scan_stamp_atomic` with `p_scanner_pin` and return `SCANNER_PIN_REQUIRED` / `SCANNER_PIN_INVALID` when needed.
- Pass `scannerPin` through mobile scanner transport and edge function validation.
- Keep PIN UX compact: setup lives in business profile device cards; scanner screen shows one numeric field only when required.

## Edge Cases

- Device has no PIN: scan behaves exactly as before.
- Device has PIN and scanner sends empty PIN: scan returns `SCANNER_PIN_REQUIRED`.
- Device has PIN and scanner sends wrong PIN: scan returns `SCANNER_PIN_INVALID`.
- Device has PIN and scanner sends correct PIN: existing QR/device/event checks continue normally.
- Scanner role sets PIN on its own device: allowed.
- Business manager sets or clears PIN on any business device: allowed.
- PIN format: 4-8 digits, practical for event-day staff and explicit enough for validation.

## Ordered Follow-Up Queue

1. Add admin/club fraud review actions for `SCANNER_DISTANCE_ANOMALY`.
2. Add typed event rules builder for leima quotas and venue-specific limits.
3. Add announcement/push opt-in/read-receipt model.
4. Add scanner PIN reset audit review in admin/club tools if operators need central oversight.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
