# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Fix the student event-detail navigation break, tighten the event discovery surface, and redesign the leaderboard so it feels like an actual standings view instead of a plain list.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/features/events/components/event-card.tsx`
- `apps/mobile/src/app/student/events/[eventId].tsx`
- `apps/mobile/src/app/student/leaderboard.tsx`
- `apps/mobile/src/features/leaderboard/components/leaderboard-entry-card.tsx`

## Risks

- The event list currently links into detail pages, so the route fix must be explicit and robust across web and native.
- Leaderboard already has realtime-backed data; the redesign must stay presentation-only and not disturb selection or refresh behavior.
- Podium-style top-three layouts can become gimmicky fast, so the composition has to stay readable on narrow mobile widths.
- Event discovery is a high-traffic screen, so any redesign must reduce clutter rather than add decorative noise.

## Dependencies

- Existing STARK redesign branch state in `feature/full-ui-redesign-foundation`
- Student event routing through Expo Router
- Leaderboard query and realtime logic in `apps/mobile/src/features/leaderboard/student-leaderboard.ts`
- Existing hosted showcase events already seeded in preview

## Existing Logic Checked

- `student/events/index` currently pushes `./${eventId}` which is fragile and likely the reason the detail page fails to resolve.
- `EventCard` still repeats several low-value metadata lines and can be tightened without hiding core event facts.
- `student/leaderboard` already has the right data shape for a podium treatment: top10, current user, selected event, refresh metadata.
- `LeaderboardEntryCard` still carries old blue/slate styling and feels disconnected from the newer black/lime system.

## Review Outcome

Do a focused event-and-standings pass:

- replace fragile relative event-detail routing with an explicit route push
- trim event discovery so each card carries only the information that matters
- redesign leaderboard around a podium / standings feel with stronger hierarchy
- keep the underlying event and realtime logic untouched
- re-run mobile validation and then reassess the next remaining design gaps
