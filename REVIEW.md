# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan önce sistem analizini kaydetmek için kullanılır.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-event-detail-and-join`
- **Scope:** Phase 3 student event detail route and secure event registration flow.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `docs/DATABASE.md`
- `supabase/migrations/*`
- `supabase/functions/generate-qr-token/index.ts`
- `apps/mobile/src/app/student/_layout.tsx`
- `apps/mobile/src/app/student/events/*`
- `apps/mobile/src/features/events/*`
- `apps/mobile/src/components/*`

## Risks

- Student registration must not depend on client-only checks for capacity or join deadline.
- Current `generate-qr-token` behavior can auto-register a student, so the join rules must be centralized or the new UI will be bypassable.
- Event detail needs to fetch venues and reward tiers without leaking private business or registration data outside current RLS rules.
- The current seed event is already active and its join deadline has passed, so success-path validation needs dedicated local fixture data.
- Navigation should gain a detail route without turning the tab bar into a second event tab.

## Dependencies

- `LEIMA_APP_MASTER_PLAN.md` sections for student event detail, event join flow, and QR access after registration.
- Existing `apps/mobile` auth foundation and route guard merged in Phase 3.
- Current Supabase client query surface and existing RLS policies on `events`, `event_venues`, `reward_tiers`, and `event_registrations`.

## Existing Logic Checked

- `apps/mobile` already has session bootstrap, route protection, and sign-out, so the events screen can assume authenticated access.
- Student events list is live and already merges public events with the signed-in student's own registration state.
- RLS allows public reads of public events, joined event venues, and active reward tiers, while students can read only their own registrations.
- Direct student insert/update policies still allow client-side registration writes today, so join deadline and capacity rules are not yet fully zero-trust.
- `generate-qr-token` currently auto-creates registrations and checks capacity, but it does not centralize the full event join rule set behind a shared atomic registration primitive.

## Review Outcome

Implement a real event detail route and move student registration into a backend-controlled atomic flow. The mobile screen should surface event overview, venue list, reward tiers, registration status, and join CTA states. Registration writes should stop relying on permissive direct table policies and should instead go through one shared rule path that also keeps `generate-qr-token` aligned.
