# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `bug/scanner-location-type-erasure`
- **Goal:** Let the business scanner route load even when the current dev build lacks the native `expo-location` module and Metro is using a stale or strict route transform.

## Architectural Decisions

- Remove every route-level `expo-location` reference from `business/scanner.tsx`, including type-only import expressions.
- Dynamically import `expo-location` only when native location proof is requested.
- Treat missing native module as a recoverable optional location-proof error.
- Keep web geolocation and rebuilt native dev builds on the same scan payload path.

## Edge Cases

- Old dev build without `ExpoLocation`: scanner route opens; location proof button shows a clear error.
- Rebuilt dev build with `ExpoLocation`: location proof permission and coordinates work as before.
- Web preview: browser geolocation path is unchanged.
- Scan without location proof: scan payload still sends null coordinates and remains valid.

## Ordered Follow-Up Queue

1. Restart Metro with `--clear` after this fix so the physical iPhone receives the new bundle.
2. Rebuild the iOS dev client when native location proof needs to be exercised.
3. Add announcement/push opt-in/read-receipt model.
4. Add scanner PIN reset audit review in admin/club tools if operators need central oversight.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
