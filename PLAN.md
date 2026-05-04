# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-04
- **Branch:** `bug/mobile-actionable-errors-event-visibility`
- **Goal:** Make student event joining and organizer event save failures behave like product UI instead of development crashes.

## Architectural Decisions

- Keep server-side registration rules authoritative; the UI only removes misleading join CTAs from active/live cards.
- Treat active/live events as non-joinable in student list preview and detail CTA rendering.
- Catch `mutateAsync` errors at each user action boundary.
- Map known validation strings to localized Finnish/English product copy inside the screen, while preserving unknown error text for debugging.
- Do not introduce new global error infrastructure in this bugfix; broader toast/alert architecture can be a later product polish slice.

## Edge Cases

- Student taps a live event card: they can open details, but no join button is shown.
- Student taps upcoming join and the RPC returns a non-success state or throws: an inline localized error is shown.
- Organizer saves an event with `endAt <= startAt`: no red overlay; form shows a localized actionable error.
- Organizer save/cancel DB policy failures remain visible as errors.
- QR start-time copy is reviewed but not changed unless a code bug is found.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
