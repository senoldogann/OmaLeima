create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  avatar_url text,
  primary_role text not null default 'STUDENT'
    check (primary_role in ('STUDENT', 'BUSINESS_OWNER', 'BUSINESS_STAFF', 'CLUB_ORGANIZER', 'CLUB_STAFF', 'PLATFORM_ADMIN')),
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'SUSPENDED', 'DELETED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  university_name text,
  city text,
  country text not null default 'Finland',
  logo_url text,
  contact_email text,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'SUSPENDED', 'DELETED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('OWNER', 'ORGANIZER', 'STAFF')),
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'DISABLED')),
  created_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create table public.business_applications (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text not null,
  contact_email text not null,
  phone text,
  address text not null,
  city text,
  country text not null default 'Finland',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  website_url text,
  instagram_url text,
  message text,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  contact_email text not null,
  phone text,
  address text not null,
  city text,
  country text not null default 'Finland',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  website_url text,
  instagram_url text,
  logo_url text,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'SUSPENDED', 'DELETED')),
  application_id uuid references public.business_applications(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('OWNER', 'MANAGER', 'SCANNER')),
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'DISABLED')),
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id),
  name text not null,
  slug text unique not null,
  description text,
  city text not null,
  country text not null default 'Finland',
  cover_image_url text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  join_deadline_at timestamptz not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  visibility text not null default 'PUBLIC'
    check (visibility in ('PUBLIC', 'PRIVATE', 'UNLISTED')),
  max_participants integer,
  minimum_stamps_required integer not null default 0,
  rules jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  check (join_deadline_at <= start_at),
  check (max_participants is null or max_participants > 0),
  check (minimum_stamps_required >= 0)
);

create table public.event_venues (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  status text not null default 'JOINED'
    check (status in ('INVITED', 'JOINED', 'LEFT', 'REMOVED')),
  joined_by uuid references public.profiles(id),
  joined_at timestamptz,
  left_at timestamptz,
  venue_order integer,
  custom_instructions text,
  stamp_label text,
  created_at timestamptz not null default now(),
  unique (event_id, business_id),
  check (left_at is null or joined_at is null or left_at >= joined_at)
);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'REGISTERED'
    check (status in ('REGISTERED', 'CANCELLED', 'BANNED')),
  registered_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, student_id)
);

create table public.qr_token_uses (
  jti text primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  scanner_user_id uuid not null references public.profiles(id),
  used_at timestamptz not null default now(),
  scanner_device_id text,
  scanner_latitude numeric(10, 7),
  scanner_longitude numeric(10, 7),
  ip inet,
  user_agent text
);

create table public.stamps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_venue_id uuid references public.event_venues(id),
  scanner_user_id uuid not null references public.profiles(id),
  qr_jti text not null references public.qr_token_uses(jti),
  scanned_at timestamptz not null default now(),
  scanner_device_id text,
  scanner_latitude numeric(10, 7),
  scanner_longitude numeric(10, 7),
  scan_ip inet,
  validation_status text not null default 'VALID'
    check (validation_status in ('VALID', 'MANUAL_REVIEW', 'REVOKED')),
  created_at timestamptz not null default now(),
  unique (event_id, student_id, business_id),
  unique (qr_jti)
);

create table public.leaderboard_scores (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null
    check (scope_type in ('EVENT', 'WEEKLY', 'MONTHLY', 'YEARLY')),
  scope_key text not null,
  event_id uuid references public.events(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  stamp_count integer not null default 0,
  last_stamp_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (scope_type, scope_key, student_id),
  check (stamp_count >= 0)
);

create table public.leaderboard_updates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  unique (event_id),
  check (version > 0)
);

create table public.reward_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  required_stamp_count integer not null,
  reward_type text not null
    check (reward_type in ('HAALARIMERKKI', 'PATCH', 'COUPON', 'PRODUCT', 'ENTRY', 'OTHER')),
  inventory_total integer,
  inventory_claimed integer not null default 0,
  claim_instructions text,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'DISABLED')),
  created_at timestamptz not null default now(),
  check (required_stamp_count > 0),
  check (inventory_total is null or inventory_total >= 0),
  check (inventory_claimed >= 0),
  check (inventory_total is null or inventory_claimed <= inventory_total)
);

create table public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  reward_tier_id uuid not null references public.reward_tiers(id),
  status text not null default 'CLAIMED'
    check (status in ('CLAIMED', 'REVOKED')),
  claimed_by uuid not null references public.profiles(id),
  claimed_at timestamptz not null default now(),
  notes text,
  unique (event_id, student_id, reward_tier_id)
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  title text not null,
  description text,
  terms text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'ACTIVE', 'EXPIRED', 'DELETED')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text unique not null,
  platform text check (platform in ('IOS', 'ANDROID')),
  device_id text,
  enabled boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  channel text not null default 'PUSH'
    check (channel in ('PUSH', 'IN_APP', 'EMAIL')),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'SENT', 'FAILED', 'READ')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table public.fraud_signals (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  student_id uuid references public.profiles(id),
  business_id uuid references public.businesses(id),
  scanner_user_id uuid references public.profiles(id),
  type text not null,
  severity text not null check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'OPEN'
    check (status in ('OPEN', 'REVIEWED', 'DISMISSED', 'CONFIRMED')),
  created_at timestamptz not null default now()
);

create index idx_events_city_status_start on public.events(city, status, start_at);
create index idx_events_club on public.events(club_id);
create index idx_event_venues_event on public.event_venues(event_id);
create index idx_event_venues_business on public.event_venues(business_id);
create index idx_event_registrations_student on public.event_registrations(student_id, status);
create index idx_qr_token_uses_event_student on public.qr_token_uses(event_id, student_id);
create index idx_stamps_event_student on public.stamps(event_id, student_id);
create index idx_stamps_event_business on public.stamps(event_id, business_id);
create index idx_stamps_event_scanned_at on public.stamps(event_id, scanned_at desc);
create index idx_stamps_student_scanned_at on public.stamps(student_id, scanned_at desc);
create index idx_leaderboard_scope on public.leaderboard_scores(scope_type, scope_key, stamp_count desc, last_stamp_at asc);
create index idx_reward_claims_event_student on public.reward_claims(event_id, student_id);
create index idx_notifications_user_status on public.notifications(user_id, status, created_at desc);
create index idx_audit_logs_created on public.audit_logs(created_at desc);
create index idx_fraud_signals_status_severity on public.fraud_signals(status, severity, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $set_updated_at$
begin
  new.updated_at = now();
  return new;
end;
$set_updated_at$;

create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_clubs_updated_at before update on public.clubs for each row execute function public.set_updated_at();
create trigger set_businesses_updated_at before update on public.businesses for each row execute function public.set_updated_at();
create trigger set_events_updated_at before update on public.events for each row execute function public.set_updated_at();
create trigger set_promotions_updated_at before update on public.promotions for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.business_applications enable row level security;
alter table public.businesses enable row level security;
alter table public.business_staff enable row level security;
alter table public.events enable row level security;
alter table public.event_venues enable row level security;
alter table public.event_registrations enable row level security;
alter table public.qr_token_uses enable row level security;
alter table public.stamps enable row level security;
alter table public.leaderboard_scores enable row level security;
alter table public.leaderboard_updates enable row level security;
alter table public.reward_tiers enable row level security;
alter table public.reward_claims enable row level security;
alter table public.promotions enable row level security;
alter table public.device_tokens enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.fraud_signals enable row level security;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $is_platform_admin$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and primary_role = 'PLATFORM_ADMIN'
      and status = 'ACTIVE'
  );
$is_platform_admin$;

create or replace function public.is_business_staff_for(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $is_business_staff_for$
  select exists (
    select 1
    from public.business_staff
    where business_id = target_business_id
      and user_id = auth.uid()
      and status = 'ACTIVE'
  );
$is_business_staff_for$;

create or replace function public.is_club_staff_for(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $is_club_staff_for$
  select exists (
    select 1
    from public.club_members
    where club_id = target_club_id
      and user_id = auth.uid()
      and status = 'ACTIVE'
  );
$is_club_staff_for$;

create or replace function public.can_user_manage_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $can_user_manage_event$
  select exists (
    select 1
    from public.events e
    join public.club_members cm on cm.club_id = e.club_id
    where e.id = target_event_id
      and cm.user_id = auth.uid()
      and cm.status = 'ACTIVE'
  ) or public.is_platform_admin();
$can_user_manage_event$;

create policy "users can read own profile" on public.profiles for select using (id = auth.uid() or public.is_platform_admin());
create policy "users can update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "public can read active clubs" on public.clubs for select using (status = 'ACTIVE' or public.is_platform_admin());
create policy "club staff can manage own clubs" on public.clubs for update using (public.is_club_staff_for(id)) with check (public.is_club_staff_for(id));

create policy "club staff can read own memberships" on public.club_members for select using (user_id = auth.uid() or public.is_club_staff_for(club_id) or public.is_platform_admin());
create policy "platform admins can manage club memberships" on public.club_members for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "anyone can create business applications" on public.business_applications for insert with check (status = 'PENDING');
create policy "platform admins can manage business applications" on public.business_applications for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "public can read active businesses" on public.businesses for select using (status = 'ACTIVE' or public.is_platform_admin());
create policy "business staff can update own business" on public.businesses for update using (public.is_business_staff_for(id)) with check (public.is_business_staff_for(id));

create policy "business staff can read own memberships" on public.business_staff for select using (user_id = auth.uid() or public.is_business_staff_for(business_id) or public.is_platform_admin());
create policy "platform admins can manage business staff" on public.business_staff for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "public can read published events" on public.events for select using (status in ('PUBLISHED', 'ACTIVE', 'COMPLETED') and visibility = 'PUBLIC');
create policy "club staff can read own events" on public.events for select using (public.is_club_staff_for(club_id) or public.is_platform_admin());
create policy "club staff can manage own events" on public.events for all using (public.is_club_staff_for(club_id) or public.is_platform_admin()) with check (public.is_club_staff_for(club_id) or public.is_platform_admin());

create policy "public can read joined event venues" on public.event_venues for select using (status = 'JOINED');
create policy "business staff can read own event venues" on public.event_venues for select using (public.is_business_staff_for(business_id));
create policy "club staff can manage event venues" on public.event_venues for all using (public.can_user_manage_event(event_id)) with check (public.can_user_manage_event(event_id));

create policy "students can read own registrations" on public.event_registrations for select using (student_id = auth.uid());
create policy "students can register themselves" on public.event_registrations for insert with check (student_id = auth.uid() and status = 'REGISTERED');
create policy "students can cancel own registrations" on public.event_registrations for update using (student_id = auth.uid()) with check (student_id = auth.uid() and status in ('REGISTERED', 'CANCELLED'));
create policy "club staff can read event registrations" on public.event_registrations for select using (public.can_user_manage_event(event_id));

create policy "students can read own stamps" on public.stamps for select using (student_id = auth.uid());
create policy "business staff can read own scan history" on public.stamps for select using (public.is_business_staff_for(business_id));
create policy "club staff can read event stamps" on public.stamps for select using (public.can_user_manage_event(event_id));

create policy "public can read event leaderboard scores" on public.leaderboard_scores for select using (scope_type = 'EVENT');
create policy "public can read leaderboard updates" on public.leaderboard_updates for select using (true);

create policy "public can read active reward tiers" on public.reward_tiers for select using (status = 'ACTIVE');
create policy "club staff can manage reward tiers" on public.reward_tiers for all using (public.can_user_manage_event(event_id)) with check (public.can_user_manage_event(event_id));

create policy "students can read own reward claims" on public.reward_claims for select using (student_id = auth.uid());
create policy "club staff can read event reward claims" on public.reward_claims for select using (public.can_user_manage_event(event_id));

create policy "public can read active promotions" on public.promotions for select using (status = 'ACTIVE');
create policy "business staff can manage own promotions" on public.promotions for all using (public.is_business_staff_for(business_id)) with check (public.is_business_staff_for(business_id));

create policy "users can manage own device tokens" on public.device_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users can read own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "users can mark own notifications read" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "platform admins can read audit logs" on public.audit_logs for select using (public.is_platform_admin());
create policy "platform admins can read fraud signals" on public.fraud_signals for select using (public.is_platform_admin());
create policy "club staff can read event fraud signals" on public.fraud_signals for select using (event_id is not null and public.can_user_manage_event(event_id));

