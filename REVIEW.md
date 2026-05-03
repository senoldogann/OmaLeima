# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/fraud-signal-review-actions`
- **Scope:** Add explicit admin and club review actions for open fraud signals.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/admin/src/app/admin/oversight/page.tsx`
- `apps/admin/src/app/club/fraud/page.tsx`
- `apps/admin/src/app/api/fraud-signals/review/route.ts`
- `apps/admin/src/features/fraud-review/*`
- `apps/admin/src/features/oversight/*`
- `apps/admin/src/features/dashboard/sections.ts`
- `supabase/migrations/20260503160000_fraud_signal_review_actions.sql`

## Existing Logic Checked

- `fraud_signals` already has `OPEN`, `REVIEWED`, `DISMISSED`, and `CONFIRMED` statuses.
- Existing RLS lets platform admins read all fraud signals and club staff read event-scoped fraud signals they manage.
- `/admin/oversight` currently lists open fraud signals but cannot resolve them.
- Club navigation mentions fraud warnings, but there is no dedicated event-scoped review page.
- Current schema has no reviewer, reviewed timestamp, or resolution note fields.

## Risks

- Review mutation must be server-owned and must not let organizers resolve unrelated platform signals.
- Review actions must be idempotent enough for stale UI: already reviewed rows should return a clear status.
- Confirmation/dismissal needs an audit log entry because it changes the integrity trail.
- UI should keep event-day operators focused: three clear actions, optional short note, refresh on success.

## Review Outcome

Add a security-definer fraud review RPC, route-handler validation, reusable admin UI actions, and a club-scoped fraud review page backed by existing RLS.
