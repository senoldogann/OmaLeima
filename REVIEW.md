# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/media-upload-manager-account-fix`
- **Scope:** Make uploaded cover/logo images resilient across mobile roles and create a hosted pilot business manager account.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/components/cover-image-surface.tsx`
- `apps/admin/package.json`
- `apps/admin/scripts/bootstrap-pilot-business-manager.ts`

## Existing Logic Checked

- Business, club, and event media upload helpers write to Supabase Storage and persist public URLs on the relevant row.
- Shared image display flows use `CoverImageSurface` for hero/cover rendering, so one missing remote fallback can affect organizer, business, club, event, and student screens.
- Business access already models staff roles as `OWNER`, `MANAGER`, and `SCANNER`; mobile routing grants business area access when a user has an active business staff membership.
- Scanner accounts intentionally remain read-only for official business profile fields. `OWNER` and `MANAGER` can update business identity/media.

## Risks

- Do not grant scanner accounts manager permissions while creating the new test account.
- Do not expose generated passwords in committed files or logs.
- Image fallback must not hide valid images permanently after the user changes to a new uploaded URL.
- Keep uploaded image URLs as the source of truth; the UI fallback should only protect rendering when the remote image fails to load.

## Review Outcome

Harden the shared cover image renderer with per-source error recovery, add a focused hosted bootstrap script for `pilot-business-manager@example.com`, and validate mobile/admin builds without touching unrelated local changes.
