# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/fraud-signal-review-actions`
- **Goal:** Let admins and event-managing club staff explicitly resolve open fraud signals.

## Architectural Decisions

- Add reviewer metadata to `fraud_signals`: `reviewed_by`, `reviewed_at`, `resolution_note`.
- Add `review_fraud_signal_atomic` as the only write path for fraud review status changes.
- Authorize the RPC for platform admins or users who can manage the signal's event.
- Restrict target statuses to `REVIEWED`, `DISMISSED`, and `CONFIRMED`.
- Insert an `audit_logs` row for every successful review action.
- Reuse one client component for admin oversight and club fraud pages.
- Keep club fraud page event-scoped by relying on existing fraud signal RLS and `can_user_manage_event`.

## Edge Cases

- Already resolved signal: return `FRAUD_SIGNAL_ALREADY_REVIEWED`.
- User is not admin and cannot manage the signal event: return `FRAUD_SIGNAL_NOT_ALLOWED`.
- Signal has no event and user is not platform admin: deny.
- Note is optional but capped to keep audit metadata small.
- UI refreshes after successful review so counters and list reflect the new state.

## Ordered Follow-Up Queue

1. Add typed event rules builder for leima quotas and venue-specific limits.
2. Add announcement/push opt-in/read-receipt model.
3. Add scanner PIN reset audit review in admin/club tools if operators need central oversight.
4. Add richer fraud filters once real pilot data shows signal volume.

## Validation Plan

- Run:
  - `npx supabase@2.95.4 db push --yes`
  - `npx supabase@2.95.4 db lint --linked`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `npm --prefix apps/admin run typecheck`
  - `npm --prefix apps/admin run lint`
  - `npm --prefix apps/admin run build`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
