# PLAN.md

Bu dosya her yeni feature branch'te koddan önce tasarımı netleştirmek için kullanılır.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-student-leaderboard`
- **Goal:** Add the first real student leaderboard screen with event selection, Top 10, and current-user rank visibility.

## Architectural Decisions

- Keep this slice event-scoped and read-only. The screen will select one relevant registered event at a time and fetch one leaderboard RPC for that event, instead of issuing one leaderboard request per registered event.
- Build one shared leaderboard data layer under `apps/mobile/src/features/leaderboard`:
  1. read the student's registered event ids
  2. load matching public event summaries in one query
  3. derive a stable event order: active first, then upcoming, then completed
  4. fetch the selected event leaderboard through `get_event_leaderboard`
  5. read `leaderboard_updates` for the selected event so the screen can explain freshness
- Keep the first UI scope tight:
  1. event switcher for registered events
  2. Top 10 list for the selected event
  3. separate current-user rank card even when the student is outside Top 10
  4. empty-state copy when the event has no leaderboard rows yet
- Do not add realtime subscriptions in this slice. The backend refresh job already exists, and the smallest correct step is a reliable fetch surface before adding live updates.

## Alternatives Considered

- Reading `leaderboard_scores` directly and ranking on the client: rejected because it would either overfetch all participants or reimplement the exact ranking logic the RPC already owns.
- Fetching leaderboard data for every registered event at once: rejected because it turns an event-scoped RPC into N+1 network work and does not match the current tab's need.
- Adding realtime subscriptions now: rejected because we should first land the stable event selection and read model before wiring live updates.

## Edge Cases

- The student has no registered public event eligible for leaderboard display.
- The selected event exists but `leaderboard_scores` has not been refreshed yet, so Top 10 is empty.
- The current student is outside Top 10 and only the separate `currentUser` card reveals their rank.
- Two students share stamp counts and are ordered by `last_stamp_at`, so local smoke data should cover tie handling.
- A registered event later becomes invisible to public reads; the tab should not tell the student to join an event again if they still have registrations.

## Validation Plan

- Reset local Supabase with the current migrations and seed data.
- Run `npm run lint` in `apps/mobile`.
- Run `npm run typecheck` in `apps/mobile`.
- Run `npm run export:web` in `apps/mobile`.
- Run local Supabase-authenticated smoke checks for:
  1. registered event leaderboard selection query
  2. `update_event_leaderboard` + `get_event_leaderboard` with seeded and fixture students
  3. empty leaderboard state on a registered event with no scores yet
- Start the local web preview and verify `/student/leaderboard` renders with the live leaderboard screen.
