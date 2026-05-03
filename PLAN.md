# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/media-upload-manager-account-fix`
- **Goal:** Ensure uploaded media never leaves black/empty cover surfaces and provide a real pilot business manager account for manager-level testing.

## Architectural Decisions

- Keep upload helpers bucket-specific and unchanged unless a concrete upload failure appears; the current symptom is display failure after a URL exists.
- Put image load failure handling in `CoverImageSurface`, because it is the shared display boundary for role-specific cover/hero surfaces.
- Reset the image error state whenever the source changes so a new upload can render immediately.
- Create the business manager as a business staff `MANAGER`, not a new database enum/profile role. This matches existing RLS and mobile access logic.
- Use a focused admin script that attaches the manager to the same active business as the pilot scanner account, then writes credentials to the Desktop only.

## Edge Cases

- Public URL temporarily returns an error: the app shows themed fallback instead of a black surface.
- User uploads a replacement image after an error: source key changes and the image is retried.
- Pilot scanner is missing or not attached to a business: manager bootstrap raises an explicit error.
- Existing manager account exists: auth user, profile, and business staff membership are updated idempotently.

## Validation Plan

- Run:
  - `npm --prefix apps/admin run bootstrap:pilot-business-manager`
  - `npm --prefix apps/admin run typecheck`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `npx supabase@2.95.4 db lint --linked`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
