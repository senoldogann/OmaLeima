# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Polish the next student visual issues by moving event-detail back navigation above the hero and giving My QR the same image-led top scene language.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/student/events/[eventId].tsx`
- `apps/mobile/src/app/student/active-event.tsx`

## Risks

- Event detail now uses a full-bleed hero, so an ordinary flow-order back button can end up visually buried underneath it.
- My QR still starts with a text-heavy block instead of the same visual entrance used by discovery and event detail.
- The QR screen already carries a lot of functional state, so the added hero cannot make the page longer or noisier.

## Dependencies

- Existing STARK redesign branch state in `feature/full-ui-redesign-foundation`
- Existing discovery hero imagery helper
- Current profile tag modal flow
- Current event detail route structure

## Existing Logic Checked

- Event detail already has safe `goBack` fallback logic; the remaining problem is only visual stacking.
- QR state already knows the selected event and reward overview, so we can derive a cover image without adding new backend calls.
- Event image fallback logic already lives in `features/events/event-visuals.ts` and should be reused.

## Review Outcome

Do a small visual stabilization pass:

- anchor the event-detail back button above the hero surface
- add a full-width image band to My QR using the existing event cover helper
- keep the QR page shorter by reusing existing event data instead of adding new sections
- re-run mobile validation and keep logic unchanged
