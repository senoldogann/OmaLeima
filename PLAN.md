# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-hosted-verification-unblock`
- **Goal:** Unblock the real hosted verification path by teaching the hosted smoke and audit about Vercel preview protection, while documenting the temporary preview-domain Site URL until the real custom domain exists.

## Architectural Decisions

- Keep the already-created real Vercel project and real env vars as-is; this slice is about verification access, not more provisioning.
- Add one optional env var path for hosted verification:
  - `VERCEL_AUTOMATION_BYPASS_SECRET`
- Use the bypass secret as an HTTP header for both plain fetch preflight and Playwright browser requests.
- Extend the hosted readiness audit so it checks project protection state and conditionally requires `VERCEL_AUTOMATION_BYPASS_SECRET` in GitHub Actions secrets when preview protection is active.
- Keep `STAGING_ADMIN_EMAIL` and `STAGING_ADMIN_PASSWORD` conditional on real hosted credentials being available; do not fake readiness.
- Update docs to note that the current preview URL is the temporary Site URL until `admin.omaleima.fi` is ready.

## Alternatives Considered

- Disabling preview protection manually as the only solution:
  - rejected because the repo should also support the protected-preview path used by the current project
- Baking the bypass secret into URLs:
  - rejected because Vercel recommends headers when automation can set them
- Marking hosted verification as green without understanding protection:
  - rejected because the current `401` is not an app bug, but it is still a real blocker for the workflow

## Edge Cases

- The bypass secret may be absent in local runs; the hosted smoke should remain optional and only add headers when the secret exists.
- The readiness audit must not require a bypass secret when preview protection is not active.
- The temporary preview domain should not be mistaken for the final production domain; docs need to say it will be replaced later.
- Hosted admin credentials may still be invalid even after bypass support lands; the slice should stop with that blocker clearly named.

## Validation Plan

- Add optional bypass support to the hosted smoke helpers and workflow.
- Extend the hosted readiness audit and deterministic audit smoke for protected-preview projects.
- Run lint, typecheck, `smoke:hosted-setup-audit`, and `qa:hosted-admin-readiness`.
- Run the real hosted audit again and confirm the next blocker is now either missing secrets or invalid hosted admin credentials, not blind preview protection.
- Update `PROGRESS.md`, `REVIEW.md`, `PLAN.md`, and `TODOS.md` with the new external-state understanding.
