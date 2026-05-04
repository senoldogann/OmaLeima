# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-04
- **Branch:** `bug/mobile-actionable-errors-event-visibility`
- **Scope:** Fix student live-event join visibility and stop mobile organizer/student action errors from escaping to the red development overlay.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/events/components/event-card.tsx`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/student/events/[eventId].tsx`
- `apps/mobile/src/app/club/events.tsx`

## Existing Logic Checked

- Student event list passes `onJoinPress` to both active and upcoming cards. `EventCard` currently shows the join CTA whenever the student is not registered, even for active/live events where registration should already be closed.
- Student event preview repeats the same registration-only condition for the join CTA.
- Student detail already calculates `joinAvailability`, but it still renders a disabled primary join button for non-joinable live/closed states.
- Club event save/cancel handlers await `mutateAsync` without a `try/catch`; client validation errors from `parseDraft` can therefore surface as unhandled promise rejections and trigger the red development overlay.
- Existing UI has message cards and localized copy access; the fix can stay client-side and avoid schema changes.

## Risks

- Join CTA visibility must not block legitimate upcoming registration.
- Mutation errors must remain visible and actionable, not swallowed.
- Organizer validation must preserve developer context while giving students/organizers localized UI feedback.
- Announcement authoring is larger than this bugfix and should remain a follow-up feature slice.

## Review Outcome

Limit join CTA rendering to upcoming not-registered events, catch action mutation failures in student/club screens, and present localized inline error cards instead of letting promise rejections escape to the runtime overlay.
