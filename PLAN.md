# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-01
- **Branch:** `feature/push-diagnostics-polish`
- **Goal:** Finish the support/settings polish with better keyboard behavior, a cleaner support history flow, a lightweight send animation, a more intentional QA clear action, and QR countdown behavior that respects the actual token lifetime.

## Architectural Decisions

- Keep support request creation and support history inside the existing `SupportRequestSheet`, but split the history list into a secondary modal so the form stays lighter.
- Use `KeyboardAvoidingView` plus `ScrollView` keyboard insets inside the support modal instead of inventing a separate custom bottom-sheet system.
- Use a lightweight local `Animated` paper-plane motion for send confirmation instead of introducing a new animation dependency.
- Drive QR countdown and refresh timing from `expiresAt` so the token lifetime stays stable across fast tab hops.
- Keep the QA diagnostics surface dev-only and centered, but do not move it out of profile in this slice.

## Alternatives Considered

- Create a whole new support route just for request history:
  - rejected because it is too large for this polish slice and adds navigation overhead
- Keep the latest requests list inline and only tweak spacing:
  - rejected because the keyboard problem is partly a vertical space problem, not only spacing
- Add a heavier animation system for send success:
  - rejected because React Native `Animated` is enough for a small support confirmation cue
- Force-refresh the QR token on every tab return:
  - rejected because it shortens the apparent lifetime of still-valid QR codes

## Edge Cases

- Business support still needs an active business membership before submission is allowed.
- The support modal must keep working in both student and business contexts with the same component.
- The send animation must not block the form or trap the user in a loading-like state.
- The QR countdown should hit zero and refresh when expired, but should not visually restart early just because the screen remounted.
- Validation must ignore the known untracked `.idea/` folder and not try to clean it up.

## Validation Plan

- Refresh `REVIEW.md`, `PLAN.md`, and `TODOS.md` for the expanded support/QR polish scope.
- Make the support sheet keyboard-safe and move recent requests behind a separate history menu.
- Add the lightweight send animation and the centered QA clear action.
- Update QR countdown behavior to use real token expiry.
- Rerun:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Document the exact outcome in `PROGRESS.md`.
