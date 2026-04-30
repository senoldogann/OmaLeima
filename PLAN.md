# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Remove repeated copy and repeated variables across the student surfaces so the UI says less but says it more clearly.

## Architectural Decisions

- Treat event cards as quick-scan surfaces: one strong image, one title, and one compact metadata stack.
- Prefer combining location context into one line instead of repeating city in multiple regions.
- Let page-level hero sections carry section identity, and avoid repeating the same label again directly below.
- Keep this slice presentation-only so behavior, routing, and backend assumptions stay untouched.

## Alternatives Considered

- Keep the description preview in every event card:
  - rejected because it duplicates the detail page and makes the event list too tall
- Keep the city both as eyebrow and metadata:
  - rejected because the user already called out that duplication directly
- Leave rewards and QR section labels as-is:
  - rejected because they repeat information the hero already communicates visually

## Edge Cases

- Event cards still need enough information to decide whether to open the detail page.
- Removing copy from rewards and QR must not hide functional state like claimability or event timing.
- The compacted copy should still read naturally in both Finnish and English.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this text-density cleanup slice.
- Remove duplicate city/description treatment from event cards.
- Tighten the event facts into a smaller, clearer order.
- Remove redundant section labels where the surrounding layout already carries the meaning.
- Rerun:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the exact outcome and next remaining gap.
