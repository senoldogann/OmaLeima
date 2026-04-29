# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Stabilize and continue the new STARK theme wave so the current branch is both visually coherent and technically safe.

## Architectural Decisions

- Accept the new STARK direction as the active redesign language for this branch instead of trying to merge two competing styles.
- Fix compile/runtime issues before broadening the theme pass any further.
- Use already-migrated STARK surfaces (`active-event`, `rewards`, `scanner`, `reward-progress-card`) as the style reference for remaining screens.
- Keep the scope on mobile surfaces in this turn; admin already typechecks and the user’s immediate concern is the app theme continuity.
- Preserve all validated product logic and stay at the presentation/layout/token layer.

## Alternatives Considered

- Revert the STARK wave back to the previous liquid-glass pass:
  - rejected because the user explicitly wants us to continue the new theme language
- Keep only the compile fix and avoid touching the remaining old-looking screens:
  - rejected because the branch would still feel visually split and unfinished
- Continue into admin pages in the same pass:
  - rejected because the highest-value inconsistency is still in the mobile routes

## Edge Cases

- The new theme intentionally uses older compatibility aliases in `mobileTheme`; if we replace too many at once, we can cause unnecessary wide diffs.
- Some screens still rely on `InfoCard` and `StatusBadge` as structure. The safest continuation is to restyle through those primitives and local screen layout, not invent parallel one-off blocks everywhere.
- Student event and leaderboard screens carry dense information; the STARK pass must improve hierarchy without flattening everything into identical boxes.
- Login and history screens should join the new direction without losing clarity around auth mode and operator actions.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for the STARK continuation slice.
- Fix `business/home.tsx` so mobile lint/typecheck go green again.
- Move the most obviously inconsistent mobile screens onto the same STARK language:
  - `student/events/index.tsx`
  - `student/leaderboard.tsx`
  - `business/history.tsx`
  - `auth/login.tsx`
  - `login-hero.tsx`
  - `event-card.tsx`
- Run `npm --prefix apps/mobile run lint`.
- Run `npm --prefix apps/mobile run typecheck`.
- Run `npm --prefix apps/mobile run export:web`.
- Update `PROGRESS.md` with the STARK continuation handoff note.
