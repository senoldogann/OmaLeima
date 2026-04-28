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
- `supabase/migrations/20260428220000_register_event_atomic.sql`
- `supabase/migrations/20260428230000_get_event_leaderboard_freshness.sql`
- `supabase/migrations/20260428233000_department_tags_foundation.sql`
- `supabase/migrations/20260429000000_join_business_event_atomic.sql`
- `supabase/migrations/20260429010000_leave_business_event_atomic.sql`
- `supabase/migrations/20260429020000_merge_department_tag_atomic.sql`
- `supabase/migrations/20260429020100_block_department_tag_atomic.sql`
- `supabase/migrations/20260429030000_create_club_event_atomic.sql`
- `supabase/migrations/20260429030100_restrict_club_event_writes.sql`
- `supabase/migrations/20260429030200_manage_reward_tiers_atomic.sql`
- `supabase/migrations/20260429030300_restrict_reward_tier_writes.sql`
- `supabase/migrations/20260429030400_update_reward_tier_atomic.sql`
- `supabase/migrations/20260429030500_create_club_department_tag_atomic.sql`
- `supabase/migrations/20260429030600_restrict_club_department_tag_writes.sql`

This migration creates the production V1 foundation from `LEIMA_APP_MASTER_PLAN.md`:

- Core tables for profiles, clubs, businesses, events, event venues, registrations, QR token uses, stamps, leaderboards, rewards, notifications, audit logs, fraud signals, and department tags.
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
  - `register_event_atomic`
  - `join_business_event_atomic`
  - `leave_business_event_atomic`
  - `create_club_event_atomic`
  - `create_reward_tier_atomic`
  - `update_reward_tier_atomic`
  - `create_club_department_tag_atomic`

## Department Tag Foundation

`20260428233000_department_tags_foundation.sql` adds the Phase 3 schema base for optional student department tags:

- `department_tags`
  - canonical tag records for study or programme labels
  - `source_type` constrained to `USER | CLUB | ADMIN`
  - `status` constrained to `PENDING_REVIEW | ACTIVE | MERGED | BLOCKED`
  - merge support through `merged_into_tag_id`
- `profile_department_tags`
  - student-to-tag attachments
  - unique `(profile_id, department_tag_id)`
  - unique `(profile_id, slot)` with slots `1..3` for atomic max-tag enforcement
  - partial unique index for one primary tag per profile

Database-level guardrails now enforce:

- department tags remain metadata only and are not tied to permissions
- only active, non-merged tags can be attached to profiles
- only `STUDENT` profiles can own profile department tags
- a profile can hold at most `3` department tags
- a profile can hold at most `1` primary tag
- profile-tag inserts claim one of three per-profile slots so concurrent writes cannot exceed the cap

Current RLS behavior:

- active `department_tags` are publicly readable
- authenticated users can insert only their own `USER` tags
- club-side official tags no longer use direct table writes
- only platform admins can broadly manage, merge, or block tags
- `profile_department_tags` are readable by the owning user and platform admins
- only the owning user can create, update, or delete `SELF_SELECTED` profile tag links
- admin merge or block actions automatically repair or remove dependent profile-tag links

## Club Official Department Tag Foundation

Club-side official department-tag publishing is now enforced through `create_club_department_tag_atomic(...)`.

Current behavior:

- The club web panel uses a route-backed create path instead of direct browser inserts.
- The function locks the actor profile, target club, and club membership rows before writing a new official tag.
- Create is allowed only when:
  - caller is the same authenticated organizer or the service role
  - profile is active
  - target club exists and is `ACTIVE`
  - caller has an active `club_members` row for that club
  - membership role is `OWNER` or `ORGANIZER`
- Validation guardrails:
  - `title` is required after normalization
  - same club cannot publish the same active official title twice
  - different clubs may still publish the same visible title
- Successful writes always create:
  - a new `department_tags` row with `source_type = 'CLUB'`
  - club-copied `city` and `university_name` metadata
  - an `audit_logs` row with `CLUB_DEPARTMENT_TAG_CREATED`
- Direct `CLUB` source inserts are now removed at the RLS layer:
  - student custom `USER` tag creation stays intact
  - platform admins still keep broad management access
  - `CLUB_STAFF` and `CLUB_ORGANIZER` browser clients can no longer bypass the route or RPC through raw table writes
- Known statuses returned by the RPC:
  - `SUCCESS`
  - `AUTH_REQUIRED`
  - `ACTOR_NOT_ALLOWED`
  - `PROFILE_NOT_FOUND`
  - `PROFILE_NOT_ACTIVE`
  - `CLUB_NOT_ACTIVE`
  - `CLUB_MEMBERSHIP_NOT_ALLOWED`
  - `CLUB_TAG_CREATOR_NOT_ALLOWED`
  - `DEPARTMENT_TAG_TITLE_REQUIRED`
  - `DEPARTMENT_TAG_ALREADY_EXISTS`
  - `DEPARTMENT_TAG_SLUG_CONFLICT`

## Club Event Creation Foundation

Club-side web event creation is now enforced through `create_club_event_atomic(...)`.

Current behavior:

- The club web panel uses a route-backed call instead of direct browser inserts.
- The function locks the target profile, club, and club membership rows before creating the event.
- Creation is allowed only when:
  - caller is the same authenticated organizer or the service role
  - profile is active
  - target club exists and is `ACTIVE`
  - caller has an active `club_members` row for that club
  - membership role is `OWNER` or `ORGANIZER`
- Validation guardrails:
  - `name` and `city` are required
  - `visibility` must be `PUBLIC | PRIVATE | UNLISTED`
  - `end_at > start_at`
  - `join_deadline_at <= start_at`
  - `max_participants`, when present, must be positive
  - `minimum_stamps_required >= 0`
- Successful writes always create:
  - a new `events` row in `DRAFT` status
  - an `audit_logs` row with `CLUB_EVENT_CREATED`
- Direct `events` writes are now narrowed at the RLS layer:
  - active club members can still read own club events
  - only `OWNER` or `ORGANIZER` memberships can insert, update, or delete `events`
  - `CLUB_STAFF` can no longer bypass the route or RPC through raw table writes
- Slug generation is concurrency-safe:
  - first attempt uses the normalized event name
  - collision retries append a short random suffix inside the same transaction path
- Known statuses returned by the RPC:
  - `SUCCESS`
  - `AUTH_REQUIRED`
  - `ACTOR_NOT_ALLOWED`
  - `PROFILE_NOT_FOUND`
  - `PROFILE_NOT_ACTIVE`
  - `CLUB_NOT_ACTIVE`
  - `CLUB_MEMBERSHIP_NOT_ALLOWED`
  - `CLUB_EVENT_CREATOR_NOT_ALLOWED`
  - `EVENT_NAME_REQUIRED`
  - `EVENT_CITY_REQUIRED`
  - `EVENT_VISIBILITY_INVALID`
  - `EVENT_END_BEFORE_START`
  - `EVENT_JOIN_DEADLINE_INVALID`
  - `EVENT_MAX_PARTICIPANTS_INVALID`
  - `EVENT_MINIMUM_STAMPS_INVALID`
  - `EVENT_SLUG_CONFLICT`

## Club Reward Tier Management Foundation

Club-side reward-tier management is now enforced through:

- `create_reward_tier_atomic(...)`
- `update_reward_tier_atomic(...)`

Current behavior:

- The club web panel uses route-backed writes instead of direct browser inserts or updates.
- Both functions lock the actor profile and target event or reward-tier rows before mutating stock configuration.
- Create or update is allowed only when:
  - caller is the same authenticated organizer or the service role
  - profile is active
  - target event exists
  - caller is a platform admin or passes `is_club_event_editor_for(event.club_id)`
  - event status is `DRAFT`, `PUBLISHED`, or `ACTIVE`
- Validation guardrails:
  - `title` is required
  - `required_stamp_count > 0`
  - `reward_type` must be `HAALARIMERKKI | PATCH | COUPON | PRODUCT | ENTRY | OTHER`
  - `status` on update must be `ACTIVE | DISABLED`
  - `inventory_total`, when present, must be `>= 0`
  - update cannot lower `inventory_total` below current `inventory_claimed`
- Successful writes always create:
  - a new or updated `reward_tiers` row
  - an `audit_logs` row with `REWARD_TIER_CREATED` or `REWARD_TIER_UPDATED`
- Direct `reward_tiers` writes are now narrowed at the RLS layer:
  - public and mobile read behavior stays intact
  - only `OWNER` or `ORGANIZER` style event editors can insert, update, or delete `reward_tiers`
  - `CLUB_STAFF` can no longer bypass the route through raw table writes
- Known statuses returned by the RPCs:
  - `SUCCESS`
  - `AUTH_REQUIRED`
  - `ACTOR_NOT_ALLOWED`
  - `PROFILE_NOT_FOUND`
  - `PROFILE_NOT_ACTIVE`
  - `EVENT_NOT_FOUND`
  - `REWARD_TIER_NOT_FOUND`
  - `REWARD_TIER_EDITOR_NOT_ALLOWED`
  - `EVENT_NOT_EDITABLE`
  - `REWARD_TITLE_REQUIRED`
  - `REWARD_REQUIRED_STAMPS_INVALID`
  - `REWARD_TYPE_INVALID`
  - `REWARD_STATUS_INVALID`
  - `REWARD_INVENTORY_TOTAL_INVALID`
  - `REWARD_INVENTORY_CONFLICT`

Local seed coverage now includes:

- two official club tags
- one active user-created custom tag
- one merged duplicate tag for validation tests
- two seeded profile tag links for the local student account

Admin moderation now also uses two atomic RPCs:

- `merge_department_tag_atomic`
  - admin-only merge path for `ACTIVE` or `PENDING_REVIEW` source tags
  - locks source and target rows in deterministic order to reduce deadlock risk
  - rejects self-merge, inactive targets, merged targets, and already-merged or blocked sources
  - writes an audit log entry and reuses existing triggers to repair dependent `profile_department_tags`
- `block_department_tag_atomic`
  - admin-only block path for `ACTIVE` or `PENDING_REVIEW` tags
  - rejects already-merged tags, already-blocked tags, and canonical tags that still have merged dependents
  - writes an audit log entry and reuses existing triggers to remove dependent `profile_department_tags`

## Critical Write Rules

Clients must not directly insert or update these tables:

```txt
event_registrations
qr_token_uses
stamps
leaderboard_scores
leaderboard_updates
reward_claims
audit_logs
fraud_signals
```

Critical writes must go through Supabase Edge Functions and security-definer RPC functions. Frontend code may read allowed rows through RLS, but it must not own stamp, reward, fraud, audit, or leaderboard mutation logic.

## Event Registration Foundation

Student event registration is now enforced through `register_event_atomic(event_id, student_id)` instead of direct client writes.

Current behavior:

- Direct student `insert` and `update` access to `event_registrations` is intentionally removed.
- `register_event_atomic` is the shared rule path used by:
  - the Phase 3 mobile join flow
  - `generate-qr-token` when an authenticated student is still unregistered
- The function locks the target event row before checking capacity so last-seat races stay serialized as long as writes go through the shared path.
- Registration is allowed only when:
  - caller is the same authenticated student or the service role
  - student profile is active and uses the `STUDENT` role
  - event is `PUBLIC`
  - event status is joinable
  - `now() < join_deadline_at`
  - `now() < start_at`
- Known statuses returned by the RPC:
  - `SUCCESS`
  - `ALREADY_REGISTERED`
  - `EVENT_FULL`
  - `EVENT_REGISTRATION_CLOSED`
  - `STUDENT_BANNED`
  - `ROLE_NOT_ALLOWED`
  - `PROFILE_NOT_ACTIVE`

## Local Smoke Test Accounts

`supabase/seed.sql` creates deterministic local users:

```txt
admin@omaleima.test / password123
organizer@omaleima.test / password123
scanner@omaleima.test / password123
student@omaleima.test / password123
```

The seed also creates one active Helsinki appro event, one joined venue, one registered student, and one haalarimerkki reward tier.

## Business Event Join Foundation

Business-side venue participation is now enforced through `join_business_event_atomic(event_id, business_id, staff_user_id)` instead of direct mobile writes.

Current behavior:

- Business staff still cannot directly insert or update `event_venues` from the client.
- `join_business_event_atomic` is the shared rule path for the Phase 4 mobile business join flow.
- The function locks the target profile, business, event, and any existing venue row before mutating participation state.
- Joining is allowed only when:
  - caller is the same authenticated business user or the service role
  - profile is active
  - target business exists and is `ACTIVE`
  - caller has an active `business_staff` membership for that business
  - event is `PUBLIC`
  - event status is joinable
  - `now() < join_deadline_at`
  - `now() < start_at`
- Existing `INVITED` or `LEFT` venue rows are revived back to `JOINED`.
- Existing `REMOVED` venue rows are blocked from self-rejoin.
- Known statuses returned by the RPC:
  - `SUCCESS`
  - `ALREADY_JOINED`
  - `EVENT_JOIN_CLOSED`
  - `EVENT_NOT_AVAILABLE`
  - `BUSINESS_NOT_ACTIVE`
  - `BUSINESS_STAFF_NOT_ALLOWED`
  - `VENUE_REMOVED`
  - `PROFILE_NOT_ACTIVE`

## Business Event Leave Foundation

Business-side venue exit is now enforced through `leave_business_event_atomic(event_id, business_id, staff_user_id)`.

Current behavior:

- Business staff still cannot directly update `event_venues` from the client.
- `leave_business_event_atomic` is the shared rule path for the Phase 4 mobile business leave flow.
- The function locks the target profile, business, event, and venue row before mutating participation state.
- Leaving is allowed only when:
  - caller is the same authenticated business user or the service role
  - profile is active
  - target business exists and is `ACTIVE`
  - caller has an active `business_staff` membership for that business
  - event status is exactly `PUBLISHED`
  - `now() < start_at`
  - venue row currently exists in `JOINED`
- Successful leave sets `status = LEFT` and `left_at = now()`.
- Known statuses returned by the RPC:
  - `SUCCESS`
  - `EVENT_LEAVE_CLOSED`
  - `EVENT_NOT_FOUND`
  - `BUSINESS_NOT_ACTIVE`
  - `BUSINESS_STAFF_NOT_ALLOWED`
  - `VENUE_NOT_FOUND`
  - `VENUE_NOT_JOINED`
  - `VENUE_ALREADY_LEFT`
  - `VENUE_REMOVED`
  - `PROFILE_NOT_FOUND`
  - `PROFILE_NOT_ACTIVE`

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
- `send-push-notification` currently supports `PROMOTION` delivery backed by the `promotions` table.
- `scheduled-event-reminders` records one `EVENT_REMINDER` row per user reminder and uses successful notification history for duplicate protection.
- `scheduled-leaderboard-refresh` refreshes stale event leaderboard rows by calling `update_event_leaderboard` only for events with new valid stamps.

Reminder delivery indexes added in `20260427213000_notification_delivery_indexes.sql`:

- `idx_device_tokens_user_enabled`
- `idx_notifications_event_type_user`

Promotion push behavior:

- Promotion pushes target only registered event participants with enabled tokens.
- Successful sends are capped at `2` per `event + business`.
- Duplicate sends for the same `promotionId` are blocked by notification history.

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

Register the seeded student for a future public event:

```sql
select public.register_event_atomic(
  '30000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000004'
);
```

Expected first result:

```json
{"status": "SUCCESS"}
```

Running the same registration again should return:

```json
{"status": "ALREADY_REGISTERED"}
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
