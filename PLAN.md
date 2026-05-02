# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/scanner-location-consent`
- **Goal:** Make scanner location proof explicit and useful without silently collecting location or mixing user-owned package changes into this branch.

## Architectural Decisions

- Add a shared `ScannerLocationPayload` type and pass it through scanner UI -> scanner service -> scan transport.
- Keep location optional; when absent, backend behavior remains unchanged.
- Add a scanner UI panel that explains location proof and requires an operator tap before requesting browser geolocation.
- On web, use `navigator.geolocation` when available. On native, show an explicit unavailable state until the next `expo-location` dependency slice.
- Add backend fraud scoring only when both scanner coordinates and business coordinates are present.
- Create `SCANNER_DISTANCE_ANOMALY` fraud signals instead of blocking scans, because event-day operations should keep moving while suspicious data goes to review.
- Keep `apps/mobile/package.json` out of this branch because its current script changes are user-owned.

## Edge Cases

- If the operator does not opt in, scans must still work and send null coordinates.
- If location permission is denied, scans must still work and show a clear status.
- If venue coordinates are missing, backend should not create distance fraud signals.
- If distance is above threshold, the stamp should still be recorded and a fraud signal should be opened.
- Manual token fallback should send the same optional location proof as camera scans.

## Ordered Follow-Up Queue

1. Add `expo-location` in a clean dependency branch and enable native foreground location proof.
2. Add scanner device identity/PIN so distance anomalies can be tied to a named device.
3. Add admin/club fraud review actions for distance anomalies.
4. Add typed event rule builder for per-venue stamp limits and leima quotas.
5. Add announcement and push opt-in/read-receipt model.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Try `supabase db lint`; if Docker/local DB is still unavailable, record the blocker.
- Record the handoff in `PROGRESS.md`.
