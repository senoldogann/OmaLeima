# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-04
- **Branch:** `bug/media-url-resilience`
- **Goal:** Make profile/event media uploads and image rendering more resilient, especially for native runtimes and old zero-byte Supabase public objects.

## Architectural Decisions

- Keep one shared upload helper for business, club profile, and event cover images.
- Replace runtime-dependent `atob` decoding with a deterministic pure TypeScript base64 decoder.
- Add a small media health module that normalizes URLs, tracks known broken remote image URLs, and validates public URLs with HEAD when possible.
- Make `CoverImageSurface` consult and update the broken URL registry so any failed remote image consistently falls back.
- Update event cover prefetch to HEAD-check URL readability and zero-byte content before `Image.prefetch`.

## Edge Cases

- Base64 strings with whitespace or data URI prefixes should decode correctly.
- Invalid base64 must raise a clear upload error instead of silently producing a bad file.
- `content-length` can be missing; that should not be treated as failure.
- `content-length: 0` must be treated as a broken image and skipped.
- Existing zero-byte rows still require re-upload; the app should show fallback instead of black/empty UI.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `npm --prefix apps/admin run typecheck`
  - `npm --prefix apps/admin run lint`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
