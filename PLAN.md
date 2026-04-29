# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/operator-account-bootstrap`
- **Goal:** Bootstrap real hosted operator accounts, save their credentials locally, rotate hosted pilot access to them, and clear the hosted fixture-account hygiene gate.

## Architectural Decisions

- Add one focused hosted bootstrap script under `apps/admin/scripts`.
- Reuse the existing Supabase CLI + hosted service-role lookup path instead of copying secrets into source files.
- Create password-based operator accounts for the hosted admin, organizer, and scanner paths only; students stay on Google auth.
- Archive fixture `@omaleima.test` users by changing their auth/profile email away from the fixture domain and suspending their profile, rather than deleting rows that may still be referenced.
- Reassign the active club and business memberships to the new organizer and scanner accounts before disabling the old memberships.
- Save generated credentials into a Desktop file outside the repo and keep repo copy generic.

## Alternatives Considered

- Asking the owner to create accounts manually in the dashboard:
  - rejected because we already have enough hosted access to automate the exact setup and avoid copy-paste drift
- Deleting fixture users outright:
  - rejected because hosted rows like events or reviews may still reference those profile ids
- Keeping seeded hosted credentials in docs and UI copy:
  - rejected because the point of this slice is to move private-pilot paths away from fixture credentials

## Edge Cases

- If one of the target emails already exists, the bootstrap script should rotate its password and normalize its profile instead of failing.
- Fixture organizer and scanner users may own the active hosted club/business memberships; the new users must be added before the old memberships are disabled.
- The hosted admin verification secrets must stay aligned with the new admin credential after the bootstrap finishes.
- Local repo files must never include the generated passwords.

## Validation Plan

- Update the working docs.
- Add the hosted bootstrap script and any small shared helper it needs.
- Run the bootstrap script against the real hosted project.
- Run `npm --prefix apps/admin run lint`.
- Run `npm --prefix apps/admin run typecheck`.
- Run `npm --prefix apps/admin run audit:pilot-operator-hygiene`.
- If GitHub CLI auth is available, rotate `STAGING_ADMIN_EMAIL` and `STAGING_ADMIN_PASSWORD` to the new hosted admin credential.
- Update launch docs and handoff notes with the new operator-bootstrap state.
