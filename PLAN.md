# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `bug/scanner-location-module-optional`
- **Goal:** Let the business scanner route load even when the current dev build lacks the native `expo-location` module.

## Architectural Decisions

- Remove the top-level `expo-location` import from `business/scanner.tsx`.
- Dynamically import `expo-location` only when native location proof is requested.
- Treat missing native module as a recoverable optional location-proof error.
- Keep web geolocation and rebuilt native dev builds on the same scan payload path.

## Edge Cases

- Old dev build without `ExpoLocation`: scanner route opens; location proof button shows a clear error.
- Rebuilt dev build with `ExpoLocation`: location proof permission and coordinates work as before.
- Web preview: browser geolocation path is unchanged.
- Scan without location proof: scan payload still sends null coordinates and remains valid.

## Ordered Follow-Up Queue

1. Rebuild the iOS dev client when native location proof needs to be exercised.
2. Add announcement/push opt-in/read-receipt model.
3. Add scanner PIN reset audit review in admin/club tools if operators need central oversight.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
