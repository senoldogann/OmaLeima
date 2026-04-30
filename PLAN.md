# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-30
- **Branch:** `feature/final-project-audit`
- **Goal:** Finish the project with a real audit-and-hardening pass: fix stale QA drift, ship secure support flows, and bring business settings/profile UX to the same standard before merge.

## Architectural Decisions

- Keep support request creation inside Supabase with RLS, not a client-only mailto or passive static copy.
- Reuse one support-request data layer for both student and business flows; only the UI wrapper and `area` differ.
- Keep language/theme preferences owned by `UiPreferencesProvider`; business gets the same controls, not a second preference system.
- Fix stale readiness audits to match the real current product instead of re-introducing removed debug UI.
- Treat mobile/admin validations and the repo-owned readiness audits as the hard merge gate.

## Alternatives Considered

- Add support as a static contact card only:
  - rejected because the user explicitly asked for backend, Supabase, and security to be handled correctly
- Put business settings directly on the home screen:
  - rejected because scanner operators need a cleaner operational home and a separate profile/settings destination
- Restore old hosted-scan helper copy just to satisfy the audit:
  - rejected because that would reintroduce product/debug drift instead of fixing the audit honestly

## Edge Cases

- Student support must not allow writing requests on behalf of another user.
- Business support must only allow attaching a request to businesses where the current user is active staff.
- Support UI must stay usable when there are zero previous requests and when submission is pending.
- Dev-only push diagnostics must remain available for QA without polluting the normal user-facing profile surface.
- Branch-wide validation must ignore the known untracked `.idea/` folder and not try to clean it up.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this audit/support slice.
- Fix the student profile typecheck and stale diagnostics audit.
- Add the support-request migration and shared mobile data layer.
- Add student support modal and business profile/settings/support surface.
- Realign the hosted business scan readiness audit and docs.
- Rerun:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Rerun:
  - `npm --prefix apps/mobile run audit:native-push-device-readiness`
  - `npm --prefix apps/mobile run audit:hosted-business-scan-readiness`
  - `npm run qa:mobile-native-push-readiness`
- Rerun:
  - `npm --prefix apps/admin run lint`
  - `npm --prefix apps/admin run typecheck`
  - `npm --prefix apps/admin run build`
- Optionally rerun `npm run qa:phase6-readiness` if the local Supabase function server can be brought up honestly.
- Check `git status --short` before merge.
- Update `PROGRESS.md` with the exact outcome and next remaining gap.
