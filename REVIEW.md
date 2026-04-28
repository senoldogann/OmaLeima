# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/realtime-readiness-audit`
- **Scope:** Audit the current mobile Realtime state against the master plan, make the current deferred decision explicit, and add a repo-owned command that can tell future agents whether mobile Realtime is still missing or has started to land.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `README.md`
- `docs/TESTING.md`
- `LEIMA_APP_MASTER_PLAN.md`
- `apps/mobile/README.md`
- `package.json`
- `tests/run-mobile-realtime-readiness.mjs`
- `apps/mobile/package.json`
- `apps/mobile/scripts/audit-realtime-readiness.mjs`

## Risks

- The master plan explicitly promises Supabase Realtime for leaderboard and stamp updates, but the current mobile app may still be query-only. If we do not document that gap clearly, future agents can mistake "not implemented yet" for "implemented somewhere else."
- An audit that is too clever can become brittle when the eventual Realtime slice lands. The command should detect the current state clearly without overfitting to one file layout.
- This slice must not reopen the postponed full UI pass. The user already said the broad visual redo will happen later.

## Dependencies

- The current student mobile data flows in `apps/mobile/src/features/leaderboard`, `apps/mobile/src/features/qr`, and `apps/mobile/src/providers`.
- The master-plan sections that describe `leaderboard_updates`, stamp update pings, and the planned `apps/mobile/src/features/realtime` area.
- Existing repo QA conventions where focused audits get a package-level command plus an optional root wrapper.

## Existing Logic Checked

- `apps/mobile/src/providers/session-provider.tsx` only subscribes to auth state changes; it does not subscribe to database changes.
- `apps/mobile/src/features/qr/student-qr.ts` uses controlled polling via `refetchInterval` for QR rotation.
- `apps/mobile/src/features/leaderboard/student-leaderboard.ts` loads leaderboard snapshots through plain React Query fetches with no Realtime channel or refetch cadence.
- The master plan still describes `leaderboard_updates` as a Realtime ping path and names `apps/mobile/src/features/realtime` as an expected output for the Realtime agent.

## Review Outcome

Build the smallest Realtime-readiness slice that:

- adds a deterministic repo-owned audit command for the current mobile Realtime state
- makes the current deferred-versus-implemented decision explicit in the repo docs and plan notes
- avoids pretending the planned Realtime slice is already done
- leaves the broader UI redesign explicitly out of scope
