# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Reduce repeated copy across student surfaces, especially event discovery cards, while keeping the important event information easier to scan.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/events/components/event-card.tsx`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/app/student/active-event.tsx`

## Risks

- Event cards repeated city and descriptive context in too many places, which made the list feel noisy.
- Rewards still repeated the same section language in both the page header and hero card.
- Upcoming QR state reused the city again even though the hero above already carried the event context.

## Dependencies

- Existing student event discovery hero and event-card visual language
- Existing reward-page hero already communicates the reward context on its own
- Existing active-event hero already carries the city and event identity

## Existing Logic Checked

- Event discovery already had the right data, but the card content duplicated location and context across eyebrow, image copy, body text, and metadata.
- Rewards and QR pages already had strong hero surfaces, so the next cleanup could safely remove redundant section labels without losing clarity.
- The request is presentation-only; no query, mutation, or routing logic needs to change.

## Review Outcome

Do a focused UI polish pass:

- simplify event cards by removing duplicated location and descriptive copy
- keep the key facts in a smaller, more scannable order
- remove redundant section labels where the surrounding hero already says the same thing
- rerun mobile validation and record the slice honestly
- rerun mobile validation and record the slice honestly
