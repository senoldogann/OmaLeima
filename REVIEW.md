# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/organizer-profile-rls-keyboard-polish`
- **Scope:** Fix organizer media/profile RLS, Finnish organizer profile copy, and keyboard coverage around club profile/event editing inputs.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/components/app-screen.tsx`
- `apps/mobile/src/app/club/profile.tsx`
- `apps/mobile/src/app/club/events.tsx`
- `supabase/migrations/20260503223000_harden_club_media_profile_policies.sql`

## Existing Logic Checked

- Club profile cover/logo upload writes to the `event-media` storage bucket under `clubs/{clubId}/...`.
- Existing storage policy routes through `public.is_event_media_object_manager(name)`, and the club profile update routes through `public.clubs` update RLS.
- Organizer profile Finnish copy still had Turkish text for the announcement label.
- `AppScreen` uses `automaticallyAdjustKeyboardInsets`, but club event date/time modal inputs are inside a plain modal card.

## Risks

- Storage and table policies must remain role-bound, not public writable.
- Policy functions must avoid unsafe UUID casts on malformed storage paths.
- Keyboard changes must not break normal scrolling or modal layout.
- Remote Supabase must receive the migration because the reported RLS error happens on-device against hosted backend.

## Review Outcome

Recreate club profile/media policies with owner/organizer/platform admin checks, keep event-media public read-only, fix Finnish text, and make organizer form inputs keyboard-aware.
