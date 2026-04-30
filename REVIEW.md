# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-30
- **Branch:** `feature/final-project-audit`
- **Scope:** Run a final repository-wide audit, fix the broken readiness gates, add secure support surfaces to student and business profile flows, and finish the remaining business settings polish before merging to `main`.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/app/business/_layout.tsx`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/app/business/profile.tsx`
- `apps/mobile/src/app/business/scanner.tsx`
- `apps/mobile/src/features/auth/components/business-password-sign-in.tsx`
- `apps/mobile/src/features/business/types.ts`
- `apps/mobile/src/features/i18n/translations.ts`
- `apps/mobile/src/features/support/support-requests.ts`
- `apps/mobile/src/components/app-icon.tsx`
- `apps/mobile/scripts/audit-native-push-device-readiness.mjs`
- `apps/mobile/scripts/audit-hosted-business-scan-readiness.mjs`
- `apps/mobile/README.md`
- `docs/TESTING.md`
- `supabase/migrations/*support_requests*.sql`

## Risks

- The current audit branch already carries in-progress profile changes, so typecheck can drift red until the diagnostics surface is fully aligned.
- A new support flow touches database schema, mobile UI, and auth-bound RLS; the table must be safe for both students and business staff from day one.
- Business settings need to stay simple enough for scanner staff while still exposing language/theme/support cleanly.
- Repo-owned QA scripts have drifted behind the redesign; if they are not realigned, the branch can look clean in runtime while gates stay red.

## Dependencies

- Existing `profiles`, `business_staff`, and `is_business_staff_for(...)` RLS helpers should be reused instead of inventing new auth paths.
- Existing `UiPreferencesProvider` already owns language/theme state and should stay the single source of truth for both student and business surfaces.
- Existing mobile/admin validation commands plus the repo-owned readiness audits are the minimum merge gate.

## Existing Logic Checked

- Student profile already owns the cleanest preference surface, so support should extend that flow instead of creating a second settings area.
- Business home already knows the operator memberships and active event context, so business profile/support should build on that query rather than re-fetching from scratch in multiple places.
- The native push diagnostics audit is stale against the redesigned profile route and needs to match the current dev-only diagnostics modal.
- The hosted business scan readiness audit is stale against the redesign and should validate the real remaining fallback path instead of removed helper copy.
- The working tree is otherwise clean apart from the known untracked `.idea/` folder that must stay untouched.

## Review Outcome

Do a real final audit pass:

- refresh the working docs so branch and scope are truthful
- fix the mobile typecheck and stale readiness audits
- add a secure support-request backend slice with correct RLS
- add student and business support surfaces plus business profile/settings polish
- rerun mobile/admin validations and the relevant readiness gates
- record the exact audit outcome before merging
