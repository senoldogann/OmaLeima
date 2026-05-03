# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/mobile-club-event-creation-polish`
- **Scope:** Improve mobile organizer event creation around real appro operations: phone cover upload, clearer date/time editing, create-time status, organizer upcoming navigation, and public student join CTA.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/club/events.tsx`
- `apps/mobile/src/app/club/home.tsx`
- `apps/mobile/src/app/club/upcoming.tsx`
- `apps/mobile/src/app/club/_layout.tsx`
- `apps/mobile/src/features/club/club-event-media.ts`
- `apps/mobile/src/features/club/club-event-mutations.ts`
- `apps/mobile/src/features/events/components/event-card.tsx`
- `supabase/migrations/*_event_media_storage.sql`

## Existing Logic Checked

- Mobile club event creation already exists in `apps/mobile/src/app/club/events.tsx`, but cover media is a raw URL field and date/time fields are raw local datetime strings.
- `expo-image-picker` is already used for business media, so event cover upload can reuse the existing native dependency pattern.
- Supabase Storage currently has a `business-media` bucket only; event covers need a club-scoped bucket/policy instead of overloading business media paths.
- Create mutation calls `create_club_event_atomic`, which creates drafts; create-time status needs a post-create status update when organizer explicitly chooses published/active.
- Student event cards already know registration state and route to details; adding a direct public join CTA requires wiring the existing join mutation rather than duplicating backend logic blindly.

## Risks

- Storage policies must restrict organizer uploads to clubs they manage.
- Date/time UX must still produce the existing `YYYY-MM-DDTHH:mm` values expected by current parser/RPC.
- Create-time status must not bypass RLS or allow completed/cancelled states.
- New event join CTA must avoid showing the wrong action for already joined, private, cancelled, or closed events.
- Mobile changes must not require adding a new native module to the already installed dev build.

## Review Outcome

Implement the organizer creation polish first, then finish the organizer upcoming page/home slider and student public join CTA in the same feature branch if validation remains green.
