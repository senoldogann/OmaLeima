# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan önce sistem analizini kaydetmek için kullanılır.

## Current Review

- **Date:** 2026-04-27
- **Branch:** `feature/admin-business-approval-functions`
- **Scope:** Phase 2 admin business approval and rejection APIs.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `docs/EDGE_FUNCTIONS.md`
- `docs/DATABASE.md`
- `supabase/config.toml`
- `supabase/migrations/*business_application*`
- `supabase/functions/admin-approve-business/index.ts`
- `supabase/functions/admin-reject-business/index.ts`

## Risks

- Admin approval must stay server-side and atomic; clients must not create `businesses` rows directly from an application.
- Approval and rejection must both enforce active platform admin authorization.
- Approval must create a unique business slug from application data without breaking on collisions.
- Once an application is reviewed, repeated approve/reject requests must return stable statuses instead of creating duplicate side effects.
- Invite/contact onboarding is mentioned in the master plan but not yet modeled in the database, so this slice must stop at business creation + review state + audit log.

## Dependencies

- `LEIMA_APP_MASTER_PLAN.md` business approval and API sections.
- Existing business application, business, business staff, profile, and audit log tables.
- Existing shared Edge Function helpers for auth, HTTP, and validation.

## Existing Logic Checked

- `business_applications` supports `PENDING`, `APPROVED`, and `REJECTED`, with review metadata already present.
- `businesses` has a unique `slug` and an `application_id` link but no helper yet to populate it atomically from an application.
- No approval/rejection RPC or Edge Functions exist yet.

## Review Outcome

Implement the next Phase 2 slice with minimal, production-shaped behavior: approval/rejection RPCs, admin-only Edge Functions, and local smoke validation.
