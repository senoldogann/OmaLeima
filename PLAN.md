# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/native-scanner-location-proof`
- **Goal:** Enable native iOS/Android foreground location proof for scanner scans without collecting location silently.

## Architectural Decisions

- Use `npx expo install expo-location` so the dependency matches Expo SDK 55.
- Add `expo-location` plugin configuration with a clear when-in-use permission string.
- Keep the existing scanner opt-in panel as the only place that requests foreground location.
- Use browser geolocation on web and `expo-location` on native.
- Keep scans working when location permission is denied or unavailable.
- Stage only dependency changes from `package.json`, leaving user-owned script edits unstaged.

## Edge Cases

- Native permission denied: location proof shows an error but scanner still sends null coordinates.
- Native permission granted: current balanced-accuracy coordinates are sent with camera and manual scans.
- Web preview continues to use `navigator.geolocation`.
- Expo export should still pass for web with `expo-location` imported.

## Ordered Follow-Up Queue

1. Add named scanner device/PIN for stronger audit identity.
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
