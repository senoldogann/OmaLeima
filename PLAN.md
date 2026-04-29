# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Move the delight moment to the student side when a leima is actually earned, remove the wrong business-side stamp theater, and make the business surfaces feel cleaner and more professional for event staff.

## Architectural Decisions

- Reuse the existing student reward overview bridge to detect new stamp gains and fire a global celebration overlay from the app root.
- Keep the student celebration provider global so any screen can show the moment, but expose only small dev-only preview hooks on student routes.
- Treat the business scanner as an operational tool: fast selection, obvious camera state, clean result card, and no celebratory overlay on the staff side.
- Keep the current business data flow intact; only simplify copy, hierarchy, and density on home, events, history, and scanner.

## Alternatives Considered

- Keep the existing stamp animation on the business scanner and simply restyle it:
  - rejected because the user explicitly wants the delight shown to students, not staff
- Trigger the celebration only on reward unlock:
  - rejected because that fires too late and misses the more common “I got a leima” moment
- Build a dedicated student celebration route:
  - rejected because a modal overlay is less disruptive and can sit on top of the current active screen

## Edge Cases

- A stamp can arrive while the student is on rewards, QR, or another student screen; the overlay must be global.
- Multiple realtime refreshes for the same stamp should not create repeated celebrations.
- If several rewards unlock at once, the reward notification and the stamp celebration should not crash each other.
- Business result cards still need to preserve scan count and status clarity after the celebratory visuals are removed.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this slice.
- Add a global student celebration provider and connect it to realtime stamp gain detection.
- Leave small dev-only student preview entry points for fast tuning.
- Simplify business scanner, home, events, and history around operator-first use.
- Verify mobile with:
  - `rtk npm --prefix /Users/dogan/Desktop/OmaLeima/apps/mobile run lint`
  - `rtk npm --prefix /Users/dogan/Desktop/OmaLeima/apps/mobile run typecheck`
  - `rtk npm --prefix /Users/dogan/Desktop/OmaLeima/apps/mobile run export:web`
- Update `PROGRESS.md` with the new handoff note.
