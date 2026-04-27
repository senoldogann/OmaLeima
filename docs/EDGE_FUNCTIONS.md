# Edge Functions

OmaLeima uses Supabase Edge Functions for security-critical API actions. Client apps must not create QR tokens, stamp rows, reward claims, audit logs, or fraud records directly.

## Current Functions

- `generate-qr-token`
- `scan-qr`
- `claim-reward`
- `admin-approve-business`
- `admin-reject-business`

## Local Secrets

The QR token signing secret is required locally and in hosted Supabase:

```txt
QR_SIGNING_SECRET
```

For local development, run the function server with an environment file that is not committed:

```bash
supabase functions serve --env-file supabase/.env.local
```

Example `supabase/.env.local` content:

```bash
QR_SIGNING_SECRET=replace-with-a-long-random-local-secret
```

For hosted Supabase, set the secret through the Supabase dashboard or CLI:

```bash
supabase secrets set QR_SIGNING_SECRET=replace-with-production-secret
```

## Auth Model

All current functions set `verify_jwt = false` in `supabase/config.toml` and authenticate explicitly inside the function:

1. Read the Bearer token from `Authorization`.
2. Call Supabase Auth with the service client to resolve the user.
3. Apply function-specific authorization checks.

This keeps the auth behavior explicit and compatible with current Supabase Edge Function guidance.

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

3. Sign in as the seeded student and call `generate-qr-token`.

4. Sign in as the seeded scanner and call `scan-qr` using the generated token.

5. Sign in as the seeded organizer and call `claim-reward`.
6. Sign in as the seeded platform admin and call `admin-approve-business` or `admin-reject-business` on a pending business application.

Expected scan statuses:

```txt
SUCCESS
QR_ALREADY_USED_OR_REPLAYED
ALREADY_STAMPED
INVALID_QR
QR_EXPIRED
```

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
