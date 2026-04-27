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
