# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/club-event-preview-flow`
- **Scope:** Make club event images open a lightweight in-club preview before explicit editing.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/club/home.tsx`
- `apps/mobile/src/app/club/events.tsx`
- `apps/mobile/src/app/club/upcoming.tsx`
- `apps/mobile/src/features/club/components/club-event-preview-modal.tsx`
- `apps/mobile/src/features/club/types.ts`

## Existing Logic Checked

- Club home currently shows a separate `Klubit` card even when the organizer has one active club; the user wants the club name surfaced in the opening header instead.
- The active/live slider belongs under the `Hallinnoi tapahtumia` action area and should show only active events.
- Club schema has `logo_url` but no cover image or announcement field; mobile profile has no edit/upload controls for club identity.
- `event-media` storage now has safe club-scoped policies and can be reused for club-owned logo/cover uploads under club paths.
- Club event images in organizer home/upcoming currently route directly into editing; the corrected UX should first show an in-club event preview and make editing a deliberate action.

## Risks

- Club media update must remain RLS-protected by `is_club_staff_for`.
- Do not reintroduce a noisy multi-club card on the home page.
- Event image navigation should not create an unhandled back/go-back state.
- Preview should reuse the same event summary read model and avoid new backend fetches.

## Review Outcome

Add a shared organizer event preview modal for home/upcoming images, with a clear edit action that reuses `/club/events?eventId=...`.
