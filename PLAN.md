# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-04
- **Branch:** `bug/media-business-scanner-audit`
- **Goal:** Make profile/event photo upload reliable on native devices and verify scanner-only accounts cannot manage event memberships.

## Architectural Decisions

- Request base64 data from Expo Image Picker for business, club, and club-event media picks.
- Extend the shared storage upload helper to decode base64 into a typed `ArrayBuffer` and still validate non-empty byte length.
- Keep the existing file URI reader as the explicit path when a picker asset does not contain base64.
- Auto-save club profile cover/logo uploads so users do not need a second hidden save step.
- Keep event cover uploads draft-based for new events, because a new event row does not exist until submit; editing an existing event still persists on submit.
- Keep scanner-only join/leave disabled in UI and protected by the existing Supabase RPC migrations.
- Make remote cover prefetch warnings one-per-URL to avoid noisy repeated warnings from old zero-byte storage objects.

## Edge Cases

- Picker cancellation keeps current draft untouched.
- Unsupported MIME types still raise actionable upload errors.
- Empty base64 or empty file URI read raises before a public URL is saved.
- Club media auto-save can fail after upload; the error must stay visible and the URL must not be silently assumed saved.
- Scanner accounts must still see joined live events for scanning but not join/leave/manage actions.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
