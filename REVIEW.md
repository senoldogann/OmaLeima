# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Trim repeated numbers from the rewards flow, seed temporary hosted showcase events so the student QR route becomes visible again, and do one more pass on the current mobile preview gaps before continuing the redesign.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `docs/CANVA_ASSET_HANDOFF.md`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/features/rewards/components/reward-progress-card.tsx`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/admin/package.json`
- `apps/admin/scripts/bootstrap-showcase-events.ts`

## Risks

- Rewards currently repeats numeric information at three levels: page summary, event hero, and tier rows. Over-trimming could hide useful progress context.
- Hosted showcase seeding must not disturb existing pilot operator accounts or core fixtures.
- An active showcase event has to be public, joined, and currently within its live window or the student QR screen will still stay empty.
- These showcase events are temporary, so the bootstrap path should be deterministic and easy to delete later.

## Dependencies

- Existing STARK redesign branch state in `feature/full-ui-redesign-foundation`
- Existing hosted project access through Supabase CLI and the shared admin helpers
- Pilot organizer/scanner setup already prepared in previous slices
- Student QR route logic in `apps/mobile/src/features/qr/student-qr.ts`

## Existing Logic Checked

- `student/rewards` currently shows total stamps, event count, claimable count, per-event stamp ratio, and per-tier inventory/threshold numbers at once.
- `RewardProgressCard` can carry the same state with fewer raw counts if the summary and tier copy do more work.
- `student/active-event` only needs one active public registered event to show a live QR path.
- Hosted helper code already exists for project ref and service-role access, so a small showcase seeding script can reuse that path safely.

## Review Outcome

Do a practical preview pass:

- simplify rewards so numbers appear once where they matter
- seed a few temporary hosted showcase events with one live event for QR preview
- register active student accounts into those showcase events
- leave the bootstrap path deterministic so cleanup later is easy
- re-run validation and then reassess the remaining design gaps from a real visible QR/event state
