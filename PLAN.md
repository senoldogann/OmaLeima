# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-02
- **Branch:** `feature/club-mobile-operations`
- **Goal:** Add the next organizer mobile operations layer: preferences, support, and safe event create/update/cancel flows.

## Architectural Decisions

- Add `/club/profile` for organizer preferences, support, and sign-out.
- Extend support requests with `CLUB` area and optional `club_id`; RLS must require the user to be an active club member for inserts.
- Generalize `SupportRequestSheet` enough to support club targets without breaking student/business support.
- Add `/club/events` with a compact event manager: select event, create draft, update DRAFT/PUBLISHED/ACTIVE, and soft cancel.
- Reuse `create_club_event_atomic` for creation and RLS-backed direct event updates/cancel for edit/cancel.
- Keep the dashboard as the default route and add clear navigation buttons to profile/events.
- Keep announcement creation out of this branch. Document it as next slice because it needs audience targeting, moderation, expiry, and push consent.
- Do not stage or modify user-owned local script changes or editor metadata.

## Alternatives Considered

- Make club support use BUSINESS area with fake business id:
  - rejected because it would break authorization semantics and create confusing support history
- Add announcement push now:
  - rejected because it is a separate trust/consent feature, not a form-only UI task
- Hard-delete events:
  - rejected because scan, registration, and reward history must remain auditable

## Edge Cases

- Club support insert must fail unless the selected club belongs to the signed-in user.
- Support history should still show own rows only.
- Create event must reject invalid dates before invoking RPC.
- Event update/cancel must not succeed for completed/cancelled/outside-club rows.
- Staff users without create rights should see events but not the create form.
- Typecheck, lint, export, migration push, and diff checks must pass where available.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
