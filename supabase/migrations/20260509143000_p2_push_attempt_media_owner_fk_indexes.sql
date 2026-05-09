create table if not exists public.announcement_push_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'SENT', 'PARTIAL', 'FAILED', 'NO_TARGETS')),
  recipient_count integer not null default 0 check (recipient_count >= 0),
  target_user_count integer not null default 0 check (target_user_count >= 0),
  target_token_count integer not null default 0 check (target_token_count >= 0),
  notifications_created integer not null default 0 check (notifications_created >= 0),
  notifications_sent integer not null default 0 check (notifications_sent >= 0),
  notifications_failed integer not null default 0 check (notifications_failed >= 0),
  recipients_skipped_preference_disabled integer not null default 0
    check (recipients_skipped_preference_disabled >= 0),
  recipients_skipped_no_device_token integer not null default 0
    check (recipients_skipped_no_device_token >= 0),
  expo_ticket_results jsonb not null default '[]'::jsonb,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.notifications
add column if not exists delivery_attempt_id uuid
  references public.announcement_push_delivery_attempts(id) on delete set null;

alter table public.announcement_push_delivery_attempts enable row level security;

drop policy if exists "platform admins can read announcement push delivery attempts"
on public.announcement_push_delivery_attempts;

create policy "platform admins can read announcement push delivery attempts"
on public.announcement_push_delivery_attempts
for select
using (public.is_platform_admin());

drop policy if exists "club editors can read own announcement push delivery attempts"
on public.announcement_push_delivery_attempts;

create policy "club editors can read own announcement push delivery attempts"
on public.announcement_push_delivery_attempts
for select
using (
  exists (
    select 1
    from public.announcements a
    where a.id = announcement_id
      and a.club_id is not null
      and public.is_club_event_editor_for(a.club_id)
  )
);

create index if not exists idx_announcement_push_attempts_announcement
on public.announcement_push_delivery_attempts(announcement_id, created_at desc);

create index if not exists idx_announcement_push_attempts_created_by
on public.announcement_push_delivery_attempts(created_by, created_at desc);

create index if not exists idx_notifications_delivery_attempt
on public.notifications(delivery_attempt_id);

create or replace function public.media_staging_path_owner_id(p_path text)
returns uuid
language sql
immutable
set search_path = public, pg_temp
as $media_staging_path_owner_id$
  select substring(
    coalesce(p_path, '')
    from '^users/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/'
  )::uuid;
$media_staging_path_owner_id$;

create or replace function public.can_profile_stage_media_for_club(
  p_profile_id uuid,
  p_club_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $can_profile_stage_media_for_club$
  select p_profile_id is not null
    and p_club_id is not null
    and (
      exists (
        select 1
        from public.profiles p
        where p.id = p_profile_id
          and p.primary_role = 'PLATFORM_ADMIN'
          and p.status = 'ACTIVE'
      )
      or exists (
        select 1
        from public.club_members cm
        where cm.club_id = p_club_id
          and cm.user_id = p_profile_id
          and cm.status = 'ACTIVE'
          and cm.role in ('OWNER', 'ORGANIZER')
      )
    );
$can_profile_stage_media_for_club$;

create or replace function public.is_profile_platform_admin(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $is_profile_platform_admin$
  select p_profile_id is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = p_profile_id
        and p.primary_role = 'PLATFORM_ADMIN'
        and p.status = 'ACTIVE'
    );
$is_profile_platform_admin$;

revoke all on function public.media_staging_path_owner_id(text) from public;
revoke all on function public.media_staging_path_owner_id(text) from anon;
revoke all on function public.media_staging_path_owner_id(text) from authenticated;

revoke all on function public.can_profile_stage_media_for_club(uuid, uuid) from public;
revoke all on function public.can_profile_stage_media_for_club(uuid, uuid) from anon;
revoke all on function public.can_profile_stage_media_for_club(uuid, uuid) from authenticated;

revoke all on function public.is_profile_platform_admin(uuid) from public;
revoke all on function public.is_profile_platform_admin(uuid) from anon;
revoke all on function public.is_profile_platform_admin(uuid) from authenticated;

create or replace function public.reject_draft_event_public_media()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $reject_draft_event_public_media$
declare
  v_staging_owner_id uuid;
begin
  if
    new.status = 'DRAFT'
    and nullif(btrim(coalesce(new.cover_image_url, '')), '') is not null
    and public.is_public_storage_media_url(new.cover_image_url)
  then
    raise exception 'DRAFT_PUBLIC_MEDIA_NOT_ALLOWED: draft events cannot reference public storage media'
      using errcode = '23514';
  end if;

  if nullif(btrim(coalesce(new.cover_image_staging_path, '')), '') is not null then
    if not public.is_private_media_staging_path(new.cover_image_staging_path) then
      raise exception 'INVALID_PRIVATE_MEDIA_STAGING_PATH: event staging media path is invalid'
        using errcode = '23514';
    end if;

    v_staging_owner_id := public.media_staging_path_owner_id(new.cover_image_staging_path);

    if not public.can_profile_stage_media_for_club(v_staging_owner_id, new.club_id) then
      raise exception 'MEDIA_STAGING_OWNER_NOT_ALLOWED: event staging media owner is not allowed for this club'
        using errcode = '23514';
    end if;
  end if;

  if
    new.status <> 'DRAFT'
    and nullif(btrim(coalesce(new.cover_image_staging_path, '')), '') is not null
  then
    raise exception 'PUBLISHED_STAGING_MEDIA_NOT_ALLOWED: published events cannot retain private staging media'
      using errcode = '23514';
  end if;

  return new;
end;
$reject_draft_event_public_media$;

create or replace function public.reject_draft_announcement_public_media()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $reject_draft_announcement_public_media$
declare
  v_staging_owner_id uuid;
begin
  if
    new.status = 'DRAFT'
    and nullif(btrim(coalesce(new.image_url, '')), '') is not null
    and public.is_public_storage_media_url(new.image_url)
  then
    raise exception 'DRAFT_PUBLIC_MEDIA_NOT_ALLOWED: draft announcements cannot reference public storage media'
      using errcode = '23514';
  end if;

  if nullif(btrim(coalesce(new.image_staging_path, '')), '') is not null then
    if not public.is_private_media_staging_path(new.image_staging_path) then
      raise exception 'INVALID_PRIVATE_MEDIA_STAGING_PATH: announcement staging media path is invalid'
        using errcode = '23514';
    end if;

    v_staging_owner_id := public.media_staging_path_owner_id(new.image_staging_path);

    if new.club_id is null then
      if not public.is_profile_platform_admin(v_staging_owner_id) then
        raise exception 'MEDIA_STAGING_OWNER_NOT_ALLOWED: platform announcement staging media owner must be an active platform admin'
          using errcode = '23514';
      end if;
    elsif not public.can_profile_stage_media_for_club(v_staging_owner_id, new.club_id) then
      raise exception 'MEDIA_STAGING_OWNER_NOT_ALLOWED: announcement staging media owner is not allowed for this club'
        using errcode = '23514';
    end if;
  end if;

  if
    new.status <> 'DRAFT'
    and nullif(btrim(coalesce(new.image_staging_path, '')), '') is not null
  then
    raise exception 'PUBLISHED_STAGING_MEDIA_NOT_ALLOWED: published announcements cannot retain private staging media'
      using errcode = '23514';
  end if;

  return new;
end;
$reject_draft_announcement_public_media$;

create index if not exists idx_announcement_preferences_user
on public.announcement_notification_preferences(user_id);

create index if not exists idx_announcements_created_by
on public.announcements(created_by, created_at desc);

create index if not exists idx_announcements_event
on public.announcements(event_id);

create index if not exists idx_audit_logs_actor_user
on public.audit_logs(actor_user_id, created_at desc);

create index if not exists idx_business_applications_reviewed_by
on public.business_applications(reviewed_by);

create index if not exists idx_business_scanner_device_pins_updated_by
on public.business_scanner_device_pins(updated_by);

create index if not exists idx_business_scanner_devices_created_by
on public.business_scanner_devices(created_by);

create index if not exists idx_scanner_login_grants_consumed_by
on public.business_scanner_login_grants(consumed_by);

create index if not exists idx_scanner_login_grants_issued_by
on public.business_scanner_login_grants(issued_by);

create index if not exists idx_business_staff_invited_by
on public.business_staff(invited_by);

create index if not exists idx_business_staff_user
on public.business_staff(user_id);

create index if not exists idx_businesses_application
on public.businesses(application_id);

create index if not exists idx_club_members_user
on public.club_members(user_id);

create index if not exists idx_department_tags_created_by
on public.department_tags(created_by);

create index if not exists idx_department_tags_merged_into
on public.department_tags(merged_into_tag_id);

create index if not exists idx_event_venues_joined_by
on public.event_venues(joined_by);

create index if not exists idx_events_created_by
on public.events(created_by, created_at desc);

create index if not exists idx_fraud_signals_business
on public.fraud_signals(business_id, created_at desc);

create index if not exists idx_fraud_signals_event
on public.fraud_signals(event_id, created_at desc);

create index if not exists idx_fraud_signals_reviewed_by
on public.fraud_signals(reviewed_by);

create index if not exists idx_fraud_signals_scanner_user
on public.fraud_signals(scanner_user_id, created_at desc);

create index if not exists idx_fraud_signals_student
on public.fraud_signals(student_id, created_at desc);

create index if not exists idx_leaderboard_scores_event
on public.leaderboard_scores(event_id);

create index if not exists idx_leaderboard_scores_student
on public.leaderboard_scores(student_id, updated_at desc);

create index if not exists idx_login_slides_created_by
on public.login_slides(created_by);

create index if not exists idx_login_slides_updated_by
on public.login_slides(updated_by);

create index if not exists idx_notifications_business
on public.notifications(business_id, created_at desc);

create index if not exists idx_profile_department_tags_tag
on public.profile_department_tags(department_tag_id);

create index if not exists idx_promotions_business
on public.promotions(business_id, status);

create index if not exists idx_promotions_created_by
on public.promotions(created_by);

create index if not exists idx_promotions_event
on public.promotions(event_id, status);

create index if not exists idx_qr_token_uses_business
on public.qr_token_uses(business_id, used_at desc);

create index if not exists idx_qr_token_uses_scanner_user
on public.qr_token_uses(scanner_user_id, used_at desc);

create index if not exists idx_qr_token_uses_student
on public.qr_token_uses(student_id, used_at desc);

create index if not exists idx_reward_claims_claimed_by
on public.reward_claims(claimed_by, claimed_at desc);

create index if not exists idx_reward_claims_student
on public.reward_claims(student_id, claimed_at desc);

create index if not exists idx_reward_tiers_event
on public.reward_tiers(event_id, status);

create index if not exists idx_stamps_business
on public.stamps(business_id, scanned_at desc);

create index if not exists idx_stamps_event_venue
on public.stamps(event_venue_id);

create index if not exists idx_stamps_scanner_user
on public.stamps(scanner_user_id, scanned_at desc);
