# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan önce sistem analizini kaydetmek için kullanılır.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-student-events-list`
- **Scope:** Phase 3 authenticated student events list with real Supabase reads.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/events.tsx`
- `apps/mobile/src/features/events/*`
- `apps/mobile/src/components/*`

## Risks

- Events list must only use data already visible to authenticated students under current RLS rules.
- The first query should not sprawl into detail screen, join mutations, or venue/reward overfetch.
- We need loading, empty, and error states that still make sense even before Google OAuth is fully configured in external dashboards.
- Seed data currently has one active event; query logic should still handle upcoming-only and empty results cleanly.
- Event timing and registration status should be derived on the client without inventing permissions or availability rules.

## Dependencies

- `LEIMA_APP_MASTER_PLAN.md` sections for student home screen, event discovery, and later event registration flow.
- Existing `apps/mobile` auth foundation and route guard merged in Phase 3.
- Current Supabase client query surface and existing RLS policies on `events` and `event_registrations`.

## Existing Logic Checked

- `apps/mobile` already has session bootstrap, route protection, and sign-out, so the events screen can assume authenticated access.
- `events.tsx` is still a placeholder shell with no live query.
- RLS allows public reads of `PUBLISHED`, `ACTIVE`, and `COMPLETED` public events, and students can read only their own `event_registrations`.
- Seed data currently includes one registered student and one active public event, which is enough for a smoke query against the live local backend.

## Review Outcome

Implement the first real student data surface in `apps/mobile`: query active and upcoming events from Supabase for an authenticated student, include the user's registration state, render clear loading/error/empty states, and keep the data model ready for the next event detail and join slice. Registration state should be fetched without accidentally filtering out visible public events.
