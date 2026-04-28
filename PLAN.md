# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/admin-club-reward-distribution`
- **Goal:** Add the next real event-day club workflow: confirm reward handoff from the web panel.

## Architectural Decisions

- Reuse the existing `claim_reward_atomic` transaction boundary instead of creating a parallel write path. The web panel should call it through a server-side route handler with the authenticated club session.
- Keep the page in the existing `/club` shell and expose it as `/club/claims`.
- This route should be available to active `CLUB_STAFF` and organizers, because reward handoff is an operational action, not a catalog-management action.
- Keep student identity privacy-preserving. The read model should not depend on broad `profiles` reads and should use masked student labels derived from stable ids.
- Build a bounded server snapshot:
  1. operational club events
  2. claimable student + reward candidates for those events
  3. recent reward claims for those events
- Avoid N+1 reads by fetching:
  1. event list
  2. registrations for those events
  3. valid stamp rows for those students/events
  4. active reward tiers for those events
  5. existing reward claims for those events
  then derive claimable candidates in memory.
- Keep visible limits explicit in UI copy so operators understand when they are seeing only the latest candidates or latest claims.
- The claim confirm action should require explicit operator click. No optimistic inventory changes before the route call completes.

## Alternatives Considered

- Calling the existing `claim-reward` Edge Function from the admin route: workable, but adds avoidable local function-serve dependency to a web-only workflow. Direct route-backed RPC is simpler here.
- Building a QR scanner inside the admin web app first: rejected for this slice. Manual candidate selection already matches the master plan and is enough to open the operational workflow.
- Showing raw student names or emails: rejected because current RLS model intentionally avoids broad club-side student profile access.
- Fetching one event at a time through route params: rejected for now because the current club app patterns favor one route with bounded operational lists rather than a deeper nested drilldown tree.

## Edge Cases

- A club staff member may have access to the club area but zero events with claimable rewards; the page must still be usable and explain why it is empty.
- An event may have rewards configured but no one eligible yet.
- A student may be eligible for more than one reward tier in the same event.
- A reward may become unavailable between page load and operator confirmation; the confirm action must surface the backend status cleanly.
- Duplicate confirm clicks must still converge to `REWARD_ALREADY_CLAIMED`.
- Completed events may still need final handoff visibility, but long-finished noise should not dominate the screen.
- Recent claim history and candidate lists must remain bounded and labeled as such.

## Validation Plan

- Run `apps/admin` validation:
  1. `npm run lint`
  2. `npm run typecheck`
  3. `npm run build`
- Run auth-backed smoke checks for:
  1. organizer and club staff can open `/club/claims`
  2. student is redirected away
  3. staff or organizer can confirm a valid claim successfully
  4. duplicate claim returns the expected duplicate status
  5. low-stamp candidate rejection is surfaced correctly
  6. out-of-stock rejection is surfaced correctly
  7. direct client insert into `reward_claims` remains blocked by RLS
  8. smoke cleanup leaves reruns stable
- Open local preview and verify:
  1. `/club`
  2. `/club/claims`
- Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, and `PROGRESS.md`.
