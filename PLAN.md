# PLAN.md

Bu dosya her yeni feature branch'te koddan önce tasarımı netleştirmek için kullanılır.

## Current Plan

- **Date:** 2026-04-27
- **Branch:** `feature/admin-business-approval-functions`
- **Goal:** Implement `admin-approve-business` and `admin-reject-business` with atomic database-side state transitions.

## Architectural Decisions

- Add two security-definer RPCs so review state changes and business creation happen atomically in Postgres.
- Keep Edge Functions thin: authenticate bearer token, validate request body, call RPC, map status to message.
- Generate the new business slug inside the approval RPC from `business_name`, appending numeric suffixes on collision.
- Treat invitation/contact onboarding as deferred; do not invent a half-modeled invite system in this slice.
- Return stable statuses for `APPLICATION_NOT_FOUND`, `APPLICATION_NOT_PENDING`, `ADMIN_NOT_ALLOWED`, and success cases.

## Alternatives Considered

- Direct client-side insert into `businesses`: rejected because approval must remain audit-logged and admin-controlled.
- Implementing approval only in Edge Functions without RPC: rejected because status change and business creation should be one transaction.
- Adding an invite table now: deferred because the current schema and roadmap do not yet define the invite lifecycle.

## Edge Cases

- Missing or malformed JSON body.
- Missing or malformed `applicationId`.
- Re-review of an already approved or rejected application.
- Slug collision with an existing business.
- Reject request without a useful reason.
- Admin token valid but profile no longer active or no longer platform admin.
- Application approved after a business with the same source application already exists.

## Validation Plan

- Run `supabase db reset`.
- Start `supabase functions serve`.
- Insert or create a pending business application for smoke tests.
- Call `admin-approve-business` with the seeded admin account and verify business creation.
- Call approval again and verify a stable non-success status.
- Call `admin-reject-business` on a fresh application and verify review metadata is written.
- Verify invalid Bearer token and non-admin user both fail safely.
