# Database

OmaLeima uses Supabase PostgreSQL as the system of record. The database is designed around the invariant that one student can receive at most one leima per event venue:

```txt
1 student + 1 event + 1 venue = maximum 1 leima
```

## Current Migration

- `supabase/migrations/20260427180000_initial_schema.sql`
- `supabase/migrations/20260427181000_scan_stamp_atomic.sql`
- `supabase/migrations/20260427181100_leaderboard_functions.sql`
- `supabase/migrations/20260427181200_claim_reward_atomic.sql`
- `supabase/migrations/20260427201500_approve_business_application.sql`
- `supabase/migrations/20260427201600_reject_business_application.sql`
- `supabase/migrations/20260427213000_notification_delivery_indexes.sql`

This migration creates the production V1 foundation from `LEIMA_APP_MASTER_PLAN.md`:

- Core tables for profiles, clubs, businesses, events, event venues, registrations, QR token uses, stamps, leaderboards, rewards, notifications, audit logs, and fraud signals.
- Foreign keys, unique constraints, checks, and performance indexes.
- RLS enabled for all application tables.
- Basic RLS policies for public reads, own-user reads, organizer/business access, and platform admin access.
- Security-definer helper functions:
  - `is_platform_admin`
  - `is_business_staff_for`
  - `is_club_staff_for`
  - `can_user_manage_event`
- Atomic RPC foundations:
  - `scan_stamp_atomic`
  - `update_event_leaderboard`
  - `get_event_leaderboard`
  - `claim_reward_atomic`
  - `approve_business_application_atomic`
  - `reject_business_application_atomic`

## Critical Write Rules

Clients must not directly insert or update these tables:

```txt
qr_token_uses
stamps
leaderboard_scores
leaderboard_updates
reward_claims
audit_logs
fraud_signals
```

Critical writes must go through Supabase Edge Functions and security-definer RPC functions. Frontend code may read allowed rows through RLS, but it must not own stamp, reward, fraud, audit, or leaderboard mutation logic.

## Local Smoke Test Accounts

`supabase/seed.sql` creates deterministic local users:

```txt
admin@omaleima.test / password123
organizer@omaleima.test / password123
scanner@omaleima.test / password123
student@omaleima.test / password123
```

The seed also creates one active Helsinki appro event, one joined venue, one registered student, and one haalarimerkki reward tier.

## Push Notification Foundation

The initial schema already includes the tables needed for Phase 2 push registration and test delivery:

- `device_tokens`
  - unique `expo_push_token`
  - `platform` constrained to `IOS | ANDROID`
  - optional `device_id`
  - `enabled` flag for token rotation cleanup
  - `last_seen_at` for refresh tracking
- `notifications`
  - user-scoped notification history
  - `channel` constrained to `PUSH | IN_APP | EMAIL`
  - `status` constrained to `PENDING | SENT | FAILED | READ`
  - JSON `payload` for provider response metadata

Current Phase 2 device token behavior:

- `register-device-token` upserts on `expo_push_token`.
- Re-registering the same user and `device_id` with a rotated token disables older tokens for that device.
- `send-test-push` records every send attempt in `notifications`, including failed transport attempts.
- `scheduled-event-reminders` records one `EVENT_REMINDER` row per user reminder and uses successful notification history for duplicate protection.
- `scheduled-leaderboard-refresh` refreshes stale event leaderboard rows by calling `update_event_leaderboard` only for events with new valid stamps.

Reminder delivery indexes added in `20260427213000_notification_delivery_indexes.sql`:

- `idx_device_tokens_user_enabled`
- `idx_notifications_event_type_user`

Leaderboard refresh behavior:

- `leaderboard_scores` remains the read model for event ranking.
- `leaderboard_updates` is the freshness marker that the cron job compares against the latest valid stamp time.
- The scan flow stays write-light because leaderboard aggregation remains asynchronous.

## Recommended Next Checks

After `supabase start`, verify:

```sql
select public.scan_stamp_atomic(
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000004',
  'local-smoke-jti-1',
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  'local-device',
  null,
  null,
  '127.0.0.1',
  'local-smoke'
);
```

Expected status:

```json
{"status": "SUCCESS"}
```

Running the same call again with the same `p_qr_jti` should return:

```json
{"status": "QR_ALREADY_USED_OR_REPLAYED"}
```

Using a new `p_qr_jti` for the same student, event, and business should return:

```json
{"status": "ALREADY_STAMPED"}
```

Update and fetch the leaderboard:

```sql
with updated as (
  select public.update_event_leaderboard('30000000-0000-0000-0000-000000000001') as done
)
select 'OK' as result
from updated;

select public.get_event_leaderboard(
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000004'
);
```

Claim the seed reward:

```sql
select public.claim_reward_atomic(
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000004',
  '40000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'local smoke claim'
);
```

Expected status:

```json
{"status": "SUCCESS"}
```

Running the same reward claim again should return:

```json
{"status": "REWARD_ALREADY_CLAIMED"}
```

Approve a pending business application:

```sql
insert into public.business_applications (
  id,
  business_name,
  contact_name,
  contact_email,
  address,
  city,
  status
)
values (
  '50000000-0000-0000-0000-000000000001',
  'Approval Test Venue',
  'Alice Admin',
  'alice@example.test',
  'Approval Street 1',
  'Espoo',
  'PENDING'
);

select public.approve_business_application_atomic(
  '50000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
);
```

Expected status:

```json
{"status": "SUCCESS"}
```

Reject a pending business application:

```sql
insert into public.business_applications (
  id,
  business_name,
  contact_name,
  contact_email,
  address,
  city,
  status
)
values (
  '50000000-0000-0000-0000-000000000002',
  'Reject Test Venue',
  'Rita Admin',
  'rita@example.test',
  'Reject Road 2',
  'Tampere',
  'PENDING'
);

select public.reject_business_application_atomic(
  '50000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Missing event-safe contact details.'
);
```

Expected status:

```json
{"status": "SUCCESS"}
```
