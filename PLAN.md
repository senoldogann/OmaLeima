# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-04
- **Branch:** `bug/media-upload-render-recovery`
- **Goal:** Stop old zero-byte media URLs from poisoning role/profile/event image surfaces and make upload verification reliable after native picker uploads.

## Architectural Decisions

- Keep upload paths unique and keep existing bucket policies intact.
- Strengthen `verifyPublicImageUrlAsync` instead of weakening validation: retry verification, use HEAD first, then a tiny range GET to prove bytes are readable.
- Remove a URL from the in-memory broken set when it verifies successfully.
- Add a migration that clears only DB references to known zero-byte storage objects; fallback artwork then appears instead of black/broken media.
- Avoid hard-coded host names in migration by matching the storage public path suffix.

## Edge Cases

- Zero-byte event cover: `events.cover_image_url` becomes `null`, preserving event row and letting UI fallback render.
- Zero-byte club/business cover or logo: only the broken field becomes `null`; the other valid field remains.
- HEAD returns no content length: range GET proves at least one byte before accepting.
- Upload verification fails repeatedly: mark the URL broken and raise a clear error with the URL and last verification failure.

## Validation Plan

- Run:
  - `npx supabase@2.95.4 db push --yes`
  - `npx supabase@2.95.4 db lint --linked`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
