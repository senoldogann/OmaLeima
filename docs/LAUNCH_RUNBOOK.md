# Launch Runbook

## Scope

This document is the current launch and event-day operating guide for OmaLeima. It covers:

- pre-launch readiness checks
- event-day operator flow
- manual fallback when scanning cannot continue normally
- pilot rollout and rollback expectations

## Pre-launch readiness

Run these checks before a hosted pilot or a real event:

1. Local QA passes:
   - `npm run qa:phase6-core`
   - `npm run qa:phase6-expanded`
   - `npm run qa:phase6-readiness`
2. Hosted environment secrets are set:
   - `QR_SIGNING_SECRET`
   - `SCHEDULED_JOB_SECRET`
   - `EXPO_PUSH_ACCESS_TOKEN` when push is enabled
3. Hosted auth providers are configured:
   - Google auth redirect allow-list for the mobile app
   - admin and club password accounts only for approved operators
4. Scheduled jobs are configured:
   - `scheduled-event-reminders`
   - `scheduled-leaderboard-refresh`
5. Event data is checked:
   - event window, join deadline, venue order, reward inventory, promotion limits
6. Operator access is checked:
   - scanner accounts can sign in
   - club organizer and club staff routing works
   - platform admin review routes work

## Event-day checklist

### Before doors open

1. Confirm the event is `ACTIVE`.
2. Confirm every expected venue row is `JOINED`.
3. Confirm each scanner operator can open the business scanner screen.
4. Confirm at least one real QR can be generated and scanned successfully.
5. Confirm leaderboard refresh has run once after valid stamps exist.
6. Confirm reward tiers and stock counts match the physical handout plan.
7. Confirm club staff know the manual fallback process below.

### During the event

1. Watch `/admin/oversight` for fraud signals and audit anomalies.
2. Watch `/club/claims` for reward claim flow and stock pressure.
3. If one scanner device fails, switch that venue to another approved scanner account.
4. If scanning latency spikes, pause duplicate retries and verify the latest scan result before rescanning.
5. If push reminders fail, continue the event. Push is non-blocking for scanning and reward claims.

### After the event

1. Confirm the last leaderboard refresh completed successfully.
2. Confirm reward claims and scan history look internally consistent.
3. Export or capture any operational notes while context is still fresh.
4. Revoke or rotate temporary operator credentials created only for that event.

## Manual fallback

Use manual fallback only when venue staff cannot complete normal scanning.

### Allowed fallback cases

- scanner camera is unavailable
- function server or hosted API is degraded
- venue network is unstable long enough to block normal flow

### Required fallback record

Capture one row per manual stamp:

| Field | Required |
| --- | --- |
| timestamp | yes |
| event name | yes |
| venue name | yes |
| scanner staff name | yes |
| student display label | yes |
| student profile id suffix or visible identifier | yes |
| reason for fallback | yes |

Recommended format:

```txt
2026-04-28T19:42:00+03:00 | Kiertajaiset 2026 | Test Bar 2 | Scanner A | Student ...0011 | last4=0011 | scanner network outage
```

### Fallback operating rule

When fallback is active for a venue:

1. Stop repeated QR retries for the same student.
2. Record the fallback row immediately.
3. Let one named operator own the list for that venue.
4. Reconcile the list with club organizers after the incident window ends.

Manual fallback rows must be reconciled by organizers before any out-of-band DB write is considered. Do not improvise direct table edits during the event.

## Pilot rollout

Start with a narrow hosted pilot:

1. one club
2. one event
3. two to five venues
4. known scanner staff
5. limited reward inventory

Success signals for the pilot:

- students can join and open rotating QR without support
- venues can scan without replay confusion
- leaderboard updates stay consistent after repeated refreshes
- reward claim flow does not oversell stock
- no unexpected fraud or RLS leaks appear in oversight review

## Rollback

Rollback means reverting to the manual leima process for the remainder of the event.

Trigger rollback when:

- QR generation is unavailable for a sustained period
- scans cannot be confirmed reliably
- multiple venues are blocked at the same time
- operator trust in the current scan state is lost

Rollback steps:

1. Announce manual fallback to scanner staff and club organizers.
2. Freeze new reward handoff decisions until fallback records are consistent.
3. Keep collecting manual fallback rows with named operator ownership.
4. Avoid partial direct database repair during the live incident.
5. Reconcile after the event in one controlled pass.
