# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-02
- **Branch:** `feature/deep-project-review-hardening`
- **Goal:** Run a deep correctness/security review, remove the concrete auth inconsistency found in admin club mutation routes, bring admin web closer to the mobile visual system, and fix the student profile department-tag keyboard issue.

## Architectural Decisions

- Keep the review targeted: fix drift and update working docs instead of adding large roadmap features opportunistically.
- Add a small route-level auth helper under admin auth features so all mutation routes can resolve actor user ids through `supabase.auth.getUser()`.
- Replace duplicated `getClaims()` blocks in club mutation routes with the helper.
- Preserve each route's existing guard and route-specific error copy.
- Use imagegen for one repo-owned OmaLeima hero visual instead of relying only on abstract gradients or generic card backgrounds.
- Use local Poppins font files in admin web so typography matches mobile without depending on a build-time Google font fetch.
- Keep web polish broad at the design-system level first: global tokens, login, shell, nav, cards, buttons, forms, and shared hero usage.
- Wrap the department-tag modal content in a `KeyboardAvoidingView` because the modal is not covered by the shared `AppScreen` keyboard-aware scroll view.
- Do not fake organizer mobile access by routing club accounts into business screens. A real mobile organizer area needs its own navigation, read models, RLS-backed mutations, and event-day permissions.
- Do not stage or modify user-owned local script changes or editor metadata.

## Alternatives Considered

- Leave `getClaims()` because builds pass:
  - rejected because the project already standardized SSR auth on `getUser()` after hosted cookie/session issues
- Replace every route guard with a new authorization layer:
  - rejected as too broad for a review hardening pass
- Start event-rule/venue-limit schema now:
  - rejected for this branch because it needs new migrations, scanner RPC changes, admin UI, and physical-device smoke
- Redesign every individual admin panel component in this branch:
  - rejected because global shell/token alignment gives the biggest quality lift first and keeps this pass reviewable
- Let pure `CLUB_ORGANIZER` accounts into `/business/home`:
  - rejected because organizer accounts manage clubs/events, not business venue scanner profiles, unless they also have an active `business_staff` membership

## Edge Cases

- Anonymous route requests must return each route's existing `AUTH_REQUIRED` response instead of a generic server error.
- Club staff should still only access reward claim handoff, not organizer-only event/reward-tier/department-tag writes.
- Platform admin behavior should remain governed by the existing access model.
- Typecheck, lint, and build must stay green for both apps where affected.
- The generated hero asset must not contain readable text, logos, or external brand marks.
- Admin web must still work on narrow browser widths after the shell/login visual changes.
- Department tag creation input must remain visible when the native keyboard opens.
- Admin accounts should remain web-first unless a specific admin mobile workflow is designed. Organizer mobile access is a valid next feature, not a one-line auth tweak.

## Validation Plan

- Run:
  - `npm --prefix apps/admin run typecheck`
  - `npm --prefix apps/admin run lint`
  - `npm --prefix apps/admin run build`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
- Record the handoff in `PROGRESS.md`.
