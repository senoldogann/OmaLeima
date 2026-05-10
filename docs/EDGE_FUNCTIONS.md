# Edge Functions

OmaLeima uses Supabase Edge Functions for security-critical API actions. Client apps must not create QR tokens, stamp rows, reward claims, audit logs, or fraud records directly.

## Current Functions

- `generate-qr-token`
- `scan-qr`
- `claim-reward`
- `admin-approve-business`
- `admin-create-business-owner-access`
- `admin-reject-business`
- `generate-business-scanner-login-qr`
- `provision-business-scanner-session`
- `register-device-token`
- `revoke-business-scanner-access`
- `send-announcement-push`
- `send-push-notification`
- `send-support-reply-push`
- `send-test-push`
- `scheduled-event-reminders`
- `scheduled-leaderboard-refresh`

## Local Secrets

The QR token signing secret is required locally and in hosted Supabase:

```txt
QR_SIGNING_SECRET
```

Push testing also supports these optional environment variables:

```txt
EXPO_PUSH_API_URL
EXPO_PUSH_ACCESS_TOKEN
SCHEDULED_JOB_SECRET
```

For local development, run the function server with an environment file that is not committed:

```bash
supabase functions serve --env-file supabase/.env.local
```

Example `supabase/.env.local` content:

```bash
QR_SIGNING_SECRET=replace-with-a-long-random-local-secret
EXPO_PUSH_API_URL=http://host.docker.internal:8789
EXPO_PUSH_ACCESS_TOKEN=replace-with-local-test-token
SCHEDULED_JOB_SECRET=replace-with-local-scheduled-secret
```

`host.docker.internal` matters for local mock push testing because the Edge runtime runs in a container and cannot reach a host-only `127.0.0.1` server.

For hosted Supabase, set the secret through the Supabase dashboard or CLI:

```bash
supabase secrets set QR_SIGNING_SECRET=replace-with-production-secret
```

Optional push settings can be set the same way:

```bash
supabase secrets set EXPO_PUSH_API_URL=https://exp.host/--/api/v2/push/send
supabase secrets set EXPO_PUSH_ACCESS_TOKEN=replace-with-production-access-token
supabase secrets set SCHEDULED_JOB_SECRET=replace-with-production-scheduled-secret
```

## Auth Model

Every shipped function has a matching `[functions.<name>]` stanza in `supabase/config.toml`. All current functions set `verify_jwt = false` and authenticate explicitly inside the function:

1. Read the Bearer token from `Authorization`.
2. Call Supabase Auth with the service client to resolve the user.
3. Apply function-specific authorization checks.

This keeps the auth behavior explicit and compatible with current Supabase Edge Function guidance.

Run `npm run qa:edge-function-inventory` before release to verify `supabase/functions/*`, `supabase/config.toml`, and this document stay in sync.

## `claim-reward`

Request:

```json
{
  "eventId": "30000000-0000-0000-0000-000000000001",
  "studentId": "00000000-0000-0000-0000-000000000004",
  "rewardTierId": "40000000-0000-0000-0000-000000000001",
  "notes": "local smoke claim"
}
```

Response:

```json
{
  "status": "SUCCESS",
  "rewardClaimId": "uuid",
  "message": "Reward claim recorded successfully."
}
```

Behavior notes:

- The function still allows already-registered students to open QR without a separate join step.
- When the student is missing a registration or only has a `CANCELLED` row, the function now delegates registration to `register_event_atomic`.
- Shared registration failures now surface consistently from this endpoint:
  - `EVENT_FULL`
  - `EVENT_REGISTRATION_CLOSED`
  - `STUDENT_BANNED`

## `register-device-token`

Request:

```json
{
  "expoPushToken": "ExponentPushToken[test-token-2]",
  "platform": "IOS",
  "deviceId": "local-device-1"
}
```

Response:

```json
{
  "status": "SUCCESS",
  "deviceToken": {
    "id": "uuid",
    "user_id": "uuid",
    "expo_push_token": "ExponentPushToken[test-token-2]",
    "platform": "IOS",
    "device_id": "local-device-1",
    "enabled": true
  },
  "message": "Device token registered successfully."
}
```

Behavior notes:

- The authenticated user is always the owner of the stored token.
- Re-registering the same token refreshes `last_seen_at`.
- When the same user sends a new token for the same `deviceId`, older tokens for that device are disabled.

## `send-test-push`

Request:

```json
{
  "title": "Test Push",
  "body": "Smoke test",
  "data": {
    "kind": "smoke-test"
  }
}
```

Response:

```json
{
  "status": "SUCCESS",
  "notificationId": "uuid",
  "ticketId": "ticket-test-1",
  "message": "Test push sent successfully."
}
```

Behavior notes:

- This first slice is intentionally manual and self-targeted.
- The function reads the authenticated user's enabled `device_tokens`.
- It writes a `notifications` row with `SENT` or `FAILED` and stores the Expo response body in `payload.expoPushResponse`.
- Transport or Expo API failures return `PUSH_SEND_FAILED`.

## `send-push-notification`

Current supported request type:

```txt
PROMOTION
```

Request:

```json
{
  "type": "PROMOTION",
  "promotionId": "70000000-0000-0000-0000-000000000001"
}
```

Response:

```json
{
  "status": "SUCCESS",
  "type": "PROMOTION",
  "promotionId": "70000000-0000-0000-0000-000000000001",
  "businessId": "20000000-0000-0000-0000-000000000001",
  "eventId": "30000000-0000-0000-0000-000000000001",
  "notificationsCreated": 1,
  "notificationsSent": 1,
  "notificationsFailed": 0,
  "recipientsSkippedNoDeviceToken": 0,
  "message": "Promotion push sent successfully."
}
```

Behavior notes:

- The current slice is intentionally narrow and product-grounded: only `PROMOTION` pushes backed by an existing `promotions` row are supported.
- Active business staff for the promotion's business can send the push; active platform admins are the only global override.
- Promotion delivery is limited to registered participants of the linked event who have enabled device tokens.
- The same promotion cannot be sent twice.
- Successful promotion sends are capped at `2` per `event + business`, matching the anti-spam rule in the master plan.
- The function writes one `PROMOTION` notification row per user and one audit log row per successful send attempt.

## `scheduled-event-reminders`

Request headers:

```txt
x-scheduled-job-secret: <scheduled-job-secret>
```

Request body:

```json
{}
```

Response:

```json
{
  "status": "SUCCESS",
  "dueEvents": 2,
  "reminderCandidates": 2,
  "remindersSkippedAlreadySent": 0,
  "remindersSkippedNoDeviceToken": 0,
  "notificationsCreated": 2,
  "notificationsSent": 2,
  "notificationsFailed": 0
}
```

Behavior notes:

- This function is designed for cron-style invocation, not browser use.
- It selects events due in the next `24h` and `2h` reminder windows, each with a fixed `30-minute` tolerance.
- It skips reminders already recorded as successful for the same `user_id + event_id + reminderWindowHours`.
- It writes one `EVENT_REMINDER` notification row per user reminder, even when the user has multiple tokens.
- Expo push sending now uses batched requests with limited retry handling for transport, `429`, and `5xx` failures.

## `scheduled-leaderboard-refresh`

Request headers:

```txt
x-scheduled-job-secret: <scheduled-job-secret>
```

Request body:

```json
{}
```

Response:

```json
{
  "status": "SUCCESS",
  "candidateEvents": 1,
  "dirtyEvents": 1,
  "updatedEvents": 1,
  "skippedNoValidStamps": 0,
  "skippedAlreadyFresh": 0,
  "failedEvents": 0,
  "updatedEventIds": [
    "30000000-0000-0000-0000-000000000001"
  ],
  "failedEventIds": []
}
```

Behavior notes:

- This function is designed for cron-style invocation, not browser use.
- It detects dirty events by comparing the latest valid `stamps.scanned_at` value with `leaderboard_updates.updated_at`.
- The latest valid stamp time is now computed through a DB aggregate helper so the cron path does not truncate large events at the API row cap.
- It only considers recent `PUBLISHED`, `ACTIVE`, and `COMPLETED` events, then refreshes dirty ones through `update_event_leaderboard`.
- A second run without new valid stamps should skip the already-fresh event.
- Local readiness validation now includes `npm --prefix apps/admin run smoke:leaderboard-load`, which seeds one isolated `1000`-student event with `5000` valid `stamps`, verifies a successful first refresh, verifies the already-fresh skip path, adds one dirty valid stamp, then verifies a second persisted version bump.

## `admin-approve-business`

Request:

```json
{
  "applicationId": "uuid"
}
```

Response:

```json
{
  "status": "SUCCESS",
  "applicationId": "uuid",
  "businessId": "uuid",
  "businessSlug": "slug",
  "message": "Business application approved successfully."
}
```

## `admin-reject-business`

Request:

```json
{
  "applicationId": "uuid",
  "rejectionReason": "Missing event-safe contact details."
}
```

Response:

```json
{
  "status": "SUCCESS",
  "applicationId": "uuid",
  "message": "Business application rejected successfully."
}
```

## `generate-qr-token`

Request:

```json
{
  "eventId": "30000000-0000-0000-0000-000000000001"
}
```

Response:

```json
{
  "qrPayload": {
    "v": 1,
    "type": "LEIMA_STAMP_QR",
    "token": "jwt"
  },
  "expiresAt": "2026-04-27T19:00:45.000Z",
  "refreshAfterSeconds": 30
}
```

## `scan-qr`

Request:

```json
{
  "qrToken": "jwt",
  "businessId": "20000000-0000-0000-0000-000000000001",
  "scannerDeviceId": "local-device",
  "scannerLocation": {
    "latitude": 60.1699,
    "longitude": 24.9384
  }
}
```

`businessId` is optional only when the scanner belongs to exactly one active business. It should be sent by clients once the business app supports multiple venues per user.

Response notes:

- A successful scan can now include `unlockedRewardTiers` and `rewardUnlockPush`.
- `unlockedRewardTiers` only contains reward tiers whose `required_stamp_count` boundary was crossed by this stamp, that are still `ACTIVE`, have remaining inventory, and do not already have a `reward_claims` row for the student.
- `rewardUnlockPush.status` is one of:
  - `NONE`
  - `QUEUED`
  - `FAILED`
- The remote reward-unlocked push now says the student reached the reward threshold and should check in-app availability; it does not reserve inventory.
- Remote reward-unlocked push is post-stamp background behavior. A push delivery failure does not roll back the successful stamp.

## Smoke Test Flow

1. Start Supabase:

```bash
supabase start
supabase db reset
```

2. Serve functions:

```bash
supabase functions serve --env-file supabase/.env.local
```

3. For local push tests, start a mock server on the host and point `EXPO_PUSH_API_URL` at it.

4. Sign in as the seeded student and call `generate-qr-token`.

5. Sign in as the seeded scanner and call `scan-qr` using the generated token.

6. Sign in as the seeded organizer and call `claim-reward`.
7. Sign in as the seeded platform admin and call `admin-approve-business` or `admin-reject-business` on a pending business application.
8. Sign in as the seeded student and call `register-device-token`.
9. Re-register the same `deviceId` with a rotated Expo token and verify the old token becomes disabled.
10. Insert active promotions for the seeded business and seeded event.
11. Sign in as the seeded business staff user and call `send-push-notification`.
12. Call the same promotion again and verify duplicate protection blocks it.
13. Call a second promotion and verify it succeeds.
14. Call a third promotion and verify the max-2 rule blocks it.
15. Call `send-test-push` and verify a `notifications` row is written.
16. Stop the mock push server once and verify `send-test-push` returns `PUSH_SEND_FAILED`.
17. Insert one event due in the next 24 hours and one event due in the next 2 hours.
18. Call `scheduled-event-reminders` with an invalid secret and verify it returns `UNAUTHORIZED`.
19. Call `scheduled-event-reminders` with the valid secret and verify `EVENT_REMINDER` rows are written.
20. Call it again and verify duplicate reminders are skipped.
21. Stop the mock push server once and verify a due reminder is written as `FAILED`.
22. Generate one QR with the seeded student and scan it with the seeded scanner.
23. Call `scheduled-leaderboard-refresh` with an invalid secret and verify it returns `UNAUTHORIZED`.
24. Call `scheduled-leaderboard-refresh` with the valid secret and verify `leaderboard_scores` and `leaderboard_updates` rows are written.
25. Call it again and verify the already-fresh event is skipped.
26. Run `npm --prefix apps/admin run smoke:reward-unlocked-push` and verify direct client RPC access is denied, first and second unlock pushes are emitted once each, and a third unlock persists a `FAILED` notification when the mock Expo server is stopped.

Expected scan statuses:

```txt
SUCCESS
QR_ALREADY_USED_OR_REPLAYED
ALREADY_STAMPED
INVALID_QR
QR_EXPIRED
INVALID_QR_TYPE
VENUE_NOT_IN_EVENT
```

Phase 6 function security smoke coverage now lives in:

- `apps/admin/scripts/smoke-qr-security.ts`
- `apps/admin/scripts/smoke-scan-race.ts`

Expected reward statuses:

```txt
SUCCESS
REWARD_ALREADY_CLAIMED
NOT_ENOUGH_STAMPS
CLAIMER_NOT_ALLOWED
```

Expected business review statuses:

```txt
SUCCESS
APPLICATION_NOT_FOUND
APPLICATION_NOT_PENDING
ADMIN_NOT_ALLOWED
REJECTION_REASON_REQUIRED
BUSINESS_ALREADY_CREATED
```

Expected device token statuses:

```txt
SUCCESS
INVALID_EXPO_PUSH_TOKEN
UNAUTHORIZED
```

Expected test push statuses:

```txt
SUCCESS
DEVICE_TOKEN_NOT_FOUND
PUSH_SEND_FAILED
UNAUTHORIZED
```

Expected controlled push statuses:

```txt
SUCCESS
PARTIAL_SUCCESS
PROMOTION_ALREADY_SENT
PROMOTION_LIMIT_REACHED
PROMOTION_NOT_ACTIVE
PROMOTION_EVENT_REQUIRED
PROMOTION_NOT_JOINED_EVENT
NOTIFICATION_NOT_ALLOWED
NOTIFICATION_RECIPIENTS_NOT_FOUND
UNAUTHORIZED
```

Expected scheduled reminder statuses:

```txt
SUCCESS
PARTIAL_SUCCESS
UNAUTHORIZED
```

Expected scheduled leaderboard statuses:

```txt
SUCCESS
PARTIAL_SUCCESS
UNAUTHORIZED
```
