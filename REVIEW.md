# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/typed-event-rules-builder`
- **Scope:** Replace raw event rules JSON with a typed stamp policy builder and enforce the per-business stamp limit server-side.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/admin/src/features/club-events/components/club-events-panel.tsx`
- `apps/admin/src/features/club-events/components/event-rules-builder.tsx`
- `apps/admin/src/features/club-events/validation.ts`
- `apps/admin/src/features/club-events/types.ts`
- `supabase/migrations/20260503170000_typed_event_stamp_rules.sql`

## Existing Logic Checked

- `events.rules` is already a JSONB object, but the admin UI exposes it as a raw JSON textarea.
- `minimum_stamps_required` controls completion, while same-business repeats are hard-blocked by a unique constraint on `stamps(event_id, student_id, business_id)`.
- `scan_stamp_atomic` already locks the student's event registration row, so per-student/event stamp limit checks can be serialized safely there.
- Existing duplicate status copy expects `ALREADY_STAMPED`, which can remain the status for per-business limit exhaustion.

## Risks

- Dropping the old unique constraint must not reopen replay risk; QR JTI uniqueness remains in `qr_token_uses` and `stamps.qr_jti`.
- Per-business limit checks must happen before insert and inside the registration row lock.
- Default policy must preserve current behavior: one valid leima per business.
- UI must generate a predictable rules object rather than arbitrary JSON.

## Review Outcome

Add a typed stamp policy builder for event create/update and enforce `rules.stampPolicy.perBusinessLimit` inside `scan_stamp_atomic`.
