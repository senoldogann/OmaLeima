# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-student-profile-tags`
- **Scope:** Phase 3 student profile screen for department-tag discovery, custom creation, primary selection, and self-management.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/features/profile/*`
- `apps/mobile/src/components/*`

## Risks

- The database foundation exists, but there is still no single RPC for create-and-attach, so the mobile flow must make the direct-write path feel reliable and explicit.
- Students can hold only 3 tags and 1 primary tag, so the UI must keep those constraints obvious before the server rejects writes.
- Official tags should appear before custom tags, otherwise the student flow will push duplicate custom tag growth too aggressively.
- Primary-tag switching is a two-step write with the current RLS model, so refetch behavior must keep the screen coherent after mutations.
- The screen already owns push registration, so the new profile surface must add tag management without turning the route into a confusing wall of unrelated states.

## Dependencies

- Existing Phase 3 mobile auth/session bootstrap and current `student/profile` route.
- Newly merged `department_tags` and `profile_department_tags` schema foundation plus RLS policies.
- Existing local student seed data and push-registration flow already on the profile tab.

## Existing Logic Checked

- `student/profile` currently still contains a placeholder tag note and the real push-registration section.
- The app already has good patterns for Supabase-backed read models with React Query in events, rewards, and leaderboard modules.
- The new database foundation allows direct student reads and `SELF_SELECTED` writes through RLS, so this slice can stay inside the mobile app without adding a new backend function first.
- Push registration should remain on this screen, but the tag-management surface now deserves to become the primary focus of the route.

## Review Outcome

Build a dedicated `features/profile` module that reads the current student profile plus available department tags, lets the student attach up to 3 tags, create a custom tag when needed, switch the primary tag, remove self-selected tags, and leaves the existing push-registration block intact as a secondary section.
