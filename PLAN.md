# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/admin-business-applications-review`
- **Goal:** Add the first real platform-admin workflow: pending business application review with authenticated reads and approve or reject actions.

## Architectural Decisions

- Keep queue reads on the server with the existing SSR Supabase client, then pass only serializable read-model data into interactive client components.
- Use a client component only for row-level interaction state such as reject-reason draft, pending button state, and inline result messages.
- Reuse the existing `admin-approve-business` and `admin-reject-business` Edge Functions rather than calling review RPCs directly from the browser.
- Extend the existing admin shell instead of creating a second layout pattern. The new route should feel like a direct part of `/admin`.
- Keep auth verification close to the mutation call with app-local route handlers that validate payloads before delegating to the existing Edge Functions.
- Validation for this slice must include:
  1. route-level access checks for `/admin/business-applications`
  2. RLS smoke proving non-admin sessions cannot read the queue
  3. approve and reject smoke through the real admin web mutation boundary
  4. standard `lint`, `typecheck`, and `build`
- CI, higher-volume load work, and GTM rollout details should be documented more explicitly after this slice, but not expanded into unrelated implementation work here.

## Alternatives Considered

- Calling approval RPCs directly from a browser client: rejected because it duplicates authorization surface and drifts away from the existing backend contract.
- Building the entire page as a client component: rejected because queue reads fit server components better and do not need extra client bundle cost.
- Adding a broad admin CRUD table abstraction first: rejected because this slice only needs business application review and should stay narrowly scoped.
- Shipping route rendering without review-flow smoke: rejected because the user explicitly wants stronger RLS and mutation confidence for admin workflows.

## Edge Cases

- Two admins review the same application close together; one must win and the other should get a stable non-success response without corrupt UI state.
- Reject submission with blank or whitespace-only reason.
- Invalid or tampered `applicationId` should fail fast before touching the backend function.
- Approved or rejected items should disappear from the pending list after refresh and appear in the recent-review surface with status context.
- Club or student sessions must not read pending rows even if they guess the route or query the table directly.
- External links such as website or Instagram may be absent and should not break card layout.
- Untrusted website or Instagram values must not render executable or malformed links in the admin UI.
- Long free-text application messages should wrap cleanly on mobile and desktop without resizing controls.
- Pending queue must not silently truncate once application volume grows past the first page.

## Validation Plan

- Run `apps/admin` validation:
  1. `npm run lint`
  2. `npm run typecheck`
  3. `npm run build`
- Run auth-backed smoke checks for:
  1. seeded platform admin can open `/admin/business-applications`
  2. seeded organizer is redirected away from that route
  3. non-admin RLS query cannot see pending rows
  4. admin review flow can approve one pending application
  5. admin review flow can reject one pending application
  6. duplicate or stale review attempts return stable status
- Open the local web preview and verify:
  1. `/admin`
  2. `/admin/business-applications`
- Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, and `PROGRESS.md`.
