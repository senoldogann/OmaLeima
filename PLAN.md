# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-01
- **Branch:** `feature/business-media-upload`
- **Goal:** Make business cover/logo management real by uploading from the device gallery to Supabase Storage, then preserve the Finnish appro research as the next product roadmap input.

## Architectural Decisions

- Use one public Storage bucket named `business-media` for business logos and cover images.
- Store files under `businesses/{businessId}/{kind}-{timestamp}.{extension}` so RLS can authorize by folder.
- Reuse `public.is_business_manager_for()` for Storage write authorization; SCANNER accounts can view but cannot upload official venue media.
- Keep `businesses.logo_url` and `businesses.cover_image_url` as the canonical app-facing URLs.
- Use `expo-image-picker` instead of raw URL inputs because venue owners/managers should be able to select images from the phone gallery.
- Treat the appro research as product planning, not immediate schema churn in this branch.

## Alternatives Considered

- Keep URL inputs:
  - rejected because it is poor UX for venues and does not match the user's requested gallery flow
- Store images in a private bucket with signed URLs:
  - rejected for this slice because logo/cover assets are public profile assets and public CDN URLs simplify scanner rendering
- Let SCANNER accounts upload media:
  - rejected because event-day scanner accounts should not edit official business identity
- Add event-rule schema changes immediately:
  - rejected because this branch is focused on media upload; the appro rule model needs a separate reviewed migration

## Edge Cases

- User cancels the gallery picker: no mutation should run.
- Gallery permission is denied: show a clear upload error.
- Upload succeeds but profile update fails: surface the mutation error so the owner can retry.
- Existing logo/cover URLs still render normally until replaced.
- Multiple business memberships must upload into the selected business folder only.
- Supabase Storage RLS must reject uploads outside `businesses/{businessId}` or from non-manager accounts.
- Future appro events may need per-venue stamp limits of one or two, event-specific degree thresholds, and patch inventory limits.

## Validation Plan

- Install `expo-image-picker` through Expo project dependencies.
- Add the native image picker config plugin and permission text.
- Add and push the Storage migration to hosted Supabase.
- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
- Record the implementation and handoff in `PROGRESS.md`.
