# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/club-home-media-polish`
- **Scope:** Correct club home information hierarchy and add missing mobile club identity controls for logo, cover, and announcements.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/club/home.tsx`
- `apps/mobile/src/app/club/profile.tsx`
- `apps/mobile/src/app/club/events.tsx`
- `apps/mobile/src/app/club/upcoming.tsx`
- `apps/mobile/src/features/club/club-dashboard.ts`
- `apps/mobile/src/features/club/club-profile.ts`
- `apps/mobile/src/features/club/club-media.ts`
- `apps/mobile/src/features/club/types.ts`
- `supabase/migrations/*_club_profile_media.sql`

## Existing Logic Checked

- Club home currently shows a separate `Klubit` card even when the organizer has one active club; the user wants the club name surfaced in the opening header instead.
- The active/live slider belongs under the `Hallinnoi tapahtumia` action area and should show only active events.
- Club schema has `logo_url` but no cover image or announcement field; mobile profile has no edit/upload controls for club identity.
- `event-media` storage now has safe club-scoped policies and can be reused for club-owned logo/cover uploads under club paths.
- Club event images in organizer home/upcoming should route to the relevant event management surface.

## Risks

- Club media update must remain RLS-protected by `is_club_staff_for`.
- Do not reintroduce a noisy multi-club card on the home page.
- Event image navigation should not create an unhandled back/go-back state.
- Profile upload and save should invalidate the existing club dashboard query.

## Review Outcome

Move club identity into the home header, constrain the home slider to live events, and add club profile media/announcement editing in mobile.
