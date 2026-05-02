# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-02
- **Branch:** `feature/club-mobile-dashboard`
- **Goal:** Ship the first native mobile `/club` dashboard so active organizer/club staff accounts can enter OmaLeima and monitor event-day operations without using the venue scanner UI.

## Architectural Decisions

- Extend `SessionAccessArea` with `club` and add `/club/home` as the native organizer destination.
- Determine club access from active `club_members` rows whose clubs are still `ACTIVE`.
- Give business access priority when the same user also has active business staff membership, because scanner users need the venue flow during events.
- Keep `PLATFORM_ADMIN` unsupported in native mobile until a real admin mobile surface exists.
- Build a mobile-only read model in `apps/mobile/src/features/club/` instead of importing admin web server modules.
- Query club event data in batches: memberships/clubs, events, registrations, venues, reward tiers, reward claims, and stamps.
- Show a simple event-day dashboard: managed clubs, active/upcoming counts, participant total, joined venues, reward progress, and recent/next events.
- Route guards must redirect between `student`, `business`, and `club` areas deterministically.
- Keep all club dashboard operations read-only in this branch.
- Do not stage or modify user-owned local script changes or editor metadata.

## Alternatives Considered

- Route organizer accounts into `/business/home`:
  - rejected because organizer accounts manage event operations, not a single business checkpoint
- Add full event create/edit/delete in native mobile now:
  - rejected because this first slice is about unblocking access and read-only event-day visibility; mutations need more form validation, media upload, and audit review
- Add platform admin native dashboard now:
  - rejected because admin is safer and more useful as web-first until the native admin scope is explicitly designed

## Edge Cases

- A user with suspended/deleted profile must stay unsupported even if stale memberships exist.
- A club membership for a suspended/deleted club must not unlock `/club`.
- A user with both business and club memberships should still land in business first; later account switching can be added explicitly.
- Empty club event state must be clear and non-error.
- Completed/cancelled/draft events should not inflate the live event-day counters.
- All Supabase errors should include actionable context.
- Typecheck, lint, export, and diff checks must pass.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
