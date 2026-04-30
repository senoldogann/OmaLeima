# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Rework leaderboard event context so the chosen event reads like a real event surface instead of a text-only selector, and remove any remaining repetitive or low-value event copy from the main student flow.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/leaderboard.tsx`
- `apps/mobile/src/features/leaderboard/student-leaderboard.ts`
- `apps/mobile/src/features/leaderboard/types.ts`

## Risks

- Leaderboard events were text-only, so users could not quickly distinguish which event they were selecting.
- Completed events only said `completed`, which hid the useful context of when they actually happened.
- Repeating the same event context in too many places risks clutter, so the fix needs to add visual context without reintroducing noisy copy.

## Dependencies

- Existing student event cover system in `event-visuals.ts`
- Existing leaderboard overview query and event selector state
- Existing student design language for image-backed hero cards

## Existing Logic Checked

- Event discovery and reward cards already use cover-backed surfaces, so leaderboard should reuse the same visual system instead of inventing a new one.
- Leaderboard event data currently omits `cover_image_url` and `country`, so the selector cannot render the same useful context as the rest of the student app.

## Review Outcome

Do a focused leaderboard/content pass:

- extend leaderboard event data with cover image and location context
- make the selected-event hero image-backed and informative
- make event chips show real event identity, not just a status word
- replace vague `completed` copy with an actual ended date
- rerun mobile validation and record the exact outcome
