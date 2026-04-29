# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Reduce visual clutter on profile, make the rewards hero feel more intentional, and shorten the QR screen after the code block without touching validated stamp logic.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/features/rewards/components/reward-progress-card.tsx`
- `apps/mobile/src/components/app-icon.tsx`

## Risks

- Profile can easily become another card stack if we keep account, tags, and notifications equally heavy.
- The rewards header should feel rich without repeating the same counts already shown inside cards.
- The QR screen currently reuses a full rewards card below the code, which makes the page too long and duplicates information.
- Any simplification should preserve the current tag-management flow and not hide required actions behind unclear affordances.

## Dependencies

- Existing STARK redesign branch state in `feature/full-ui-redesign-foundation`
- Existing reward cover imagery and fallback helper
- Current profile tag modal flow
- Current QR context and reward overview queries

## Existing Logic Checked

- Rewards already have image-backed cards, so the remaining issue is the weak section header and redundant count density.
- Profile now has a tag modal, but the main identity area is still too badge-heavy and uses initials instead of a proper avatar mark.
- The QR screen still renders a full `RewardProgressCard` below the code, which is overkill for the event-day flow.

## Review Outcome

Do a focused refinement pass:

- remove the visible `primary` wording from profile and lighten the main account / tags surfaces
- replace initials with a proper icon avatar treatment
- strengthen the rewards hero instead of stacking more counts
- replace the long QR-aftercare section with a compact progress summary
- re-run mobile validation and keep logic unchanged
