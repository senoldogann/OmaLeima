# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Finish the redesign branch review by closing the remaining business-side light-mode/i18n gaps and removing the last shared components that still depend on static dark-theme tokens.

## Architectural Decisions

- Keep the already-shipped student/auth theme+i18n infrastructure intact and extend the same runtime pattern into the remaining business routes instead of inventing a parallel operator-only styling path.
- Use runtime theme style factories (`useThemeStyles(createStyles)`) everywhere a file still imports `mobileTheme` directly.
- Keep business status/result copy close to the route when the text is highly screen-specific; the goal of this review slice is coverage and consistency, not building a second translation framework.
- Leave business logic, scanner RPC semantics, and session flows unchanged; this pass is for correctness of theme/copy integration and review hardening.

## Alternatives Considered

- Leave business screens on the old static dark tokens and call the student-side migration “done”:
  - rejected because that would leave a real broken platform state, not a cosmetic preference
- Delay shared helper cleanup (`celebration`, `rail`, `status card`) to a future redesign wave:
  - rejected because code review should close hidden theme regressions now, while the branch context is fresh
- Treat the hosted Vercel blank login page as a code bug without checking local build state:
  - rejected because deployment freshness and code correctness are different failure modes

## Edge Cases

- Business scanner strings are dense and shown during live queue work; Finnish labels still need to remain compact enough for buttons and result cards.
- Theme switching must cover the reward celebration overlay and rail indicators, not just route backgrounds.
- Validation needs to include admin lint/typecheck so the review slice can honestly say the repo still builds beyond the mobile app.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for the review/hardening slice.
- Rewrite the remaining business routes to runtime theme + Finnish-first copy.
- Convert `student-reward-celebration`, `foundation-status-card`, and `auto-advancing-rail` off static dark tokens.
- Verify:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
  - `npm --prefix apps/admin run lint`
  - `npm --prefix apps/admin run typecheck`
- Update `PROGRESS.md` with the review outcome and next remaining risks.
