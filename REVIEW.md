# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-business-scan-history-and-leave-flow`
- **Scope:** Phase 4 leave-before-start business flow plus dedicated own-scan history and clearer scanner result states.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `supabase/migrations/*`
- `docs/DATABASE.md`
- `apps/mobile/src/app/business/*`
- `apps/mobile/src/features/business/*`
- `apps/mobile/src/features/scanner/*`

## Risks

- Leave flow must not allow a venue to escape an event once the event has started, even if the row is still technically `JOINED`.
- Event-venue status changes have to stay compatible with the existing join RPC so `LEFT` rows can be rejoined later only when rules allow it.
- Scan history should reflect operator-owned successful outcomes from `stamps`, not a noisy transport log.
- Result-state colors and copy need to stay consistent between camera scans and manual pasted-token scans.
- Multi-business accounts should not accidentally lose scanner context when jumping between events, scanner, and history.

## Dependencies

- Existing `join_business_event_atomic` RPC and business mobile event/scanner routes.
- Existing `scan-qr` Edge Function and `stamps` table.
- Existing RLS policy that allows business staff to read scan history rows for their businesses.
- Existing mobile auth/session bootstrap and business access resolver.

## Existing Logic Checked

- `business/events` already has a clear upcoming-joined section where leave CTA belongs.
- `stamps` already captures `scanner_user_id`, `student_id`, `business_id`, `event_id`, `scanned_at`, and `validation_status`, so a history screen can be read without a new table.
- `business/scanner` already has lock plus result state scaffolding; this slice should refine the result presentation rather than redesign the whole scanner.
- No leave RPC exists yet, and the roadmap rule is `event.status == PUBLISHED && now < start_at`.

## Review Outcome

Add `leave_business_event_atomic`, wire leave CTA into joined upcoming business events, add a dedicated `business/history` route backed by `stamps`, and tighten scanner result-state presentation so the remaining Phase 4 checklist items move from implicit to explicit product behavior.
