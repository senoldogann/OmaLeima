# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-01
- **Branch:** `feature/admin-organizer-panel-polish`
- **Scope:** Remove the remaining admin/organizer confusion on native mobile, normalize keyboard behavior, and make the organizer event panel useful enough for pilot operations.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/auth/login.tsx`
- `apps/mobile/src/components/app-screen.tsx`
- `apps/mobile/src/features/auth/components/business-password-sign-in.tsx`
- `apps/mobile/src/features/i18n/translations.ts`
- `apps/admin/src/app/api/club/events/*`
- `apps/admin/src/app/globals.css`
- `apps/admin/src/features/club-events/*`
- `apps/admin/src/features/dashboard/*`

## Risks

- Native mobile admin/organizer password sign-in is not the same product surface as hosted web admin. The app must explain that clearly instead of looking like a broken bounce.
- Keyboard fixes must reduce over-pushing without reintroducing hidden focused inputs in login and support forms.
- Event delete should not hard-delete operational history because registrations, stamps, QR uses, and reward claims cascade from events. Safe cancellation is the correct pilot behavior.
- Organizer event updates must stay protected by existing club OWNER/ORGANIZER RLS and route-level access checks.
- Admin/club UI polish should improve scanning and action clarity without inventing unimplemented backend features.

## Dependencies

- Mobile `fetchSessionAccessAsync` currently routes only `STUDENT` and active `business_staff` memberships into native app areas.
- Admin web `resolveAdminAccessAsync` remains the role router for `/admin` and `/club`.
- Existing `create_club_event_atomic` covers draft creation; update/cancel can use the strict `club organizers can manage own events` policy.
- Event counts can be read from `event_registrations` and `event_venues` in one query per table for the visible event set.

## Existing Logic Checked

- `BusinessPasswordSignIn` signs out every non-business session after password auth and displays a generic business access error.
- `AppScreen` combines `KeyboardAvoidingView` padding with `ScrollView.automaticallyAdjustKeyboardInsets`, which can double-shift content.
- `LoginScreen` hides the hero when the business keyboard opens, creating a large layout jump.
- `ClubEventsPanel` can create draft events but cannot update, cancel, or show registrations/venues, making the organizer panel feel incomplete.

## Review Outcome

Implement a focused polish slice: make native admin/organizer login produce an explicit web-panel message, simplify keyboard inset handling, add event operational counts, and add safe update/cancel actions to organizer-visible events. Keep new organizer account creation as a separate admin-only feature because it requires Auth Admin API handling and membership creation as one audited workflow.
