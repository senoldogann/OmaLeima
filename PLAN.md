# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Remove the mobile business navigation regression, turn login into a cleaner onboarding-first entry screen, improve sign-in loading feedback, and stop the hosted admin login page from hard-failing for anonymous visitors.

## Architectural Decisions

- Replace `Link asChild` usage on the affected business screens with explicit router navigation so Expo Router no longer receives style arrays through child components.
- Keep the login flow single-screen, but move product explanation into lightweight onboarding slides instead of stacked explanatory paragraphs.
- Add a compact full-width loading shell for sign-in and post-auth route resolution instead of only relying on tiny button spinners.
- Keep Google sign-in and business password sign-in behavior intact; this pass changes entry UX, not auth rules.
- Fix the hosted admin login route at the server boundary: detect the current user first, then resolve role-based redirects only when a real user exists.

## Alternatives Considered

- Keep `Link asChild` and manually flatten every style array inline:
  - rejected because the pattern is brittle and easy to regress again; explicit router navigation is simpler
- Add a multi-step dedicated onboarding route before login:
  - rejected for now because it adds more navigation and user friction than the requested lightweight first-run explanation
- Wrap the hosted admin login page in a broad try/catch and always render the panel:
  - rejected because it would hide useful auth failures instead of fixing the anonymous-login path precisely

## Edge Cases

- Student and business modes must remain obvious even after copy reduction.
- The loading shell must not block forever if auth fails quickly; button-level errors still need to show.
- Anonymous admin visitors should see the login panel, while signed-in admins and club staff still redirect correctly.
- Replacing `Link asChild` must not break parameterized navigation to the scanner route.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this slice.
- Remove the Expo Router crash path from the business screens.
- Simplify login into onboarding + mode selection + cleaner loading states.
- Make hosted admin login resilient for anonymous visitors without changing redirect semantics for signed-in users.
- Verify mobile with:
  - `rtk npm --prefix /Users/dogan/Desktop/OmaLeima/apps/mobile run lint`
  - `rtk npm --prefix /Users/dogan/Desktop/OmaLeima/apps/mobile run typecheck`
  - `rtk npm --prefix /Users/dogan/Desktop/OmaLeima/apps/mobile run export:web`
- Verify admin with:
  - `rtk npm --prefix /Users/dogan/Desktop/OmaLeima/apps/admin run lint`
  - `rtk npm --prefix /Users/dogan/Desktop/OmaLeima/apps/admin run typecheck`
  - `rtk npm --prefix /Users/dogan/Desktop/OmaLeima/apps/admin run build`
- Update `PROGRESS.md` with the new handoff note.
