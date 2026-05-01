# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-01
- **Branch:** `feature/admin-organizer-panel-polish`
- **Goal:** Make native mobile auth behavior understandable for admin/organizer accounts, reduce keyboard jumps, and upgrade the club organizer web panel with practical event management.

## Architectural Decisions

- Keep native mobile focused on student and business-scanner workflows. Admin and club organizer accounts should open the hosted web panel, not enter native student/business tabs.
- Replace the generic business access error with role-aware guidance when a password account is `PLATFORM_ADMIN`, `CLUB_ORGANIZER`, or `CLUB_STAFF`.
- Let `ScrollView.automaticallyAdjustKeyboardInsets` handle most mobile keyboard spacing and remove global double-padding behavior.
- Extend club event read models with registration and venue counts using batched queries for the visible event IDs.
- Add safe organizer event update/cancel actions through route handlers. Cancellation updates `events.status = 'CANCELLED'`; it does not hard-delete rows.
- Improve admin/club shell clarity with a cleaner black/lime surface, responsive navigation, and less “placeholder dashboard” language.

## Alternatives Considered

- Add native admin and organizer tabs:
  - rejected for this slice because the existing product architecture already has a Next.js admin/club panel and mobile operator tabs are built for venue scanners
- Hard-delete events:
  - rejected because event cascades would delete registrations, stamps, token uses, and reward history
- Build new organizer account creation now:
  - rejected for this slice because a secure implementation needs Supabase Auth Admin user creation, profile upsert, membership insert, and audit logging in one admin-only route
- Keep current keyboard avoidance and tune offsets:
  - rejected because the current double mechanism is the source of large layout jumps

## Edge Cases

- Admin/organizer password login inside the native app should sign out and show actionable copy, not silently return to an empty login.
- Student and business-scanner login behavior must remain unchanged.
- Event update must reject invalid dates, invalid visibility/status values, and attempts against events outside the organizer's clubs.
- Cancelled events remain visible in organizer history and keep their operational history.
- Empty organizer memberships and read-only staff sessions should still show a clear no-action state.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `npm --prefix apps/admin run typecheck`
  - `npm --prefix apps/admin run lint`
  - `npm --prefix apps/admin run build`
- Record the handoff in `PROGRESS.md`.
- Leave `apps/mobile/package.json` user script changes unstaged unless explicitly requested.
