# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Fix the clipped reward count under the live QR screen, replace the weak rotating QR border treatment with a calmer premium frame, and move the rewards event list away from a long vertical stack into a horizontal rail.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/features/rewards/components/reward-progress-card.tsx`

## Risks

- The live QR screen already works on device, so this pass must stay presentation-only and avoid touching token refresh logic.
- The clipped `0` on iPhone likely comes from line-height and hero composition, so typography changes need to stay proportional across rewards and active-event.
- A horizontal rewards rail can improve scanability, but the cards cannot become too narrow for tier copy and event detail navigation.
- Removing the rotating QR border should still leave enough visual affordance that the QR feels live and time-bound.

## Dependencies

- Existing STARK redesign branch state in `feature/full-ui-redesign-foundation`
- Active QR route logic in `apps/mobile/src/features/qr/student-qr.ts`
- Shared rewards data contract in `apps/mobile/src/features/rewards/student-rewards.ts`
- Existing showcase events already seeded in hosted preview

## Existing Logic Checked

- `student/active-event` currently renders the selected event reward progress below the QR block, so any typography bug in `RewardProgressCard` is visible there immediately.
- The current QR scene uses a rotating border indicator that feels busy and cheap relative to the rest of the theme.
- `student/rewards` still renders each event card in a long vertical stack even after the previous simplification pass.
- `RewardProgressCard` already contains enough condensed copy that a horizontal rail is practical if width is constrained carefully.

## Review Outcome

Do a focused visual polish pass:

- remove the rotating QR border and replace it with a calmer static scan-frame treatment
- fix the clipped reward hero number so `0 leimat` reads cleanly on device
- convert rewards from a long vertical list into a horizontal event rail
- keep the hosted showcase data and QR visibility path untouched
- re-run mobile validation and then reassess remaining screen-density gaps
