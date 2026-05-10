create or replace function public.update_club_event_atomic(
  p_event_id uuid,
  p_actor_user_id uuid,
  p_name text,
  p_description text,
  p_city text,
  p_cover_image_url text,
  p_cover_image_staging_path text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_join_deadline_at timestamptz,
  p_visibility text,
  p_max_participants integer,
  p_minimum_stamps_required integer,
  p_rules jsonb,
  p_status text,
  p_ticket_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $update_club_event_atomic$
declare
  v_actor_role text;
  v_actor_user_id uuid;
  v_club public.clubs%rowtype;
  v_event public.events%rowtype;
  v_membership public.club_members%rowtype;
  v_next_name text;
  v_profile public.profiles%rowtype;
begin
  v_actor_user_id := auth.uid();
  v_actor_role := auth.role();

  if v_actor_role is distinct from 'service_role' and v_actor_user_id is null then
    return jsonb_build_object('status', 'AUTH_REQUIRED');
  end if;

  if v_actor_role is distinct from 'service_role' and v_actor_user_id <> p_actor_user_id then
    return jsonb_build_object('status', 'ACTOR_NOT_ALLOWED');
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_actor_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'PROFILE_NOT_FOUND');
  end if;

  if v_profile.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'PROFILE_NOT_ACTIVE');
  end if;

  select *
  into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return jsonb_build_object('status', 'EVENT_UPDATE_NOT_ALLOWED');
  end if;

  if v_event.status not in ('DRAFT', 'PUBLISHED', 'ACTIVE') then
    return jsonb_build_object('status', 'EVENT_UPDATE_NOT_ALLOWED');
  end if;

  select *
  into v_club
  from public.clubs
  where id = v_event.club_id
  for update;

  if not found or v_club.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'CLUB_NOT_ACTIVE');
  end if;

  if nullif(btrim(coalesce(v_club.city, '')), '') is null then
    return jsonb_build_object('status', 'CLUB_CITY_REQUIRED');
  end if;

  select *
  into v_membership
  from public.club_members
  where club_id = v_event.club_id
    and user_id = p_actor_user_id
  for update;

  if not found or v_membership.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'CLUB_MEMBERSHIP_NOT_ALLOWED');
  end if;

  if v_membership.role not in ('OWNER', 'ORGANIZER') then
    return jsonb_build_object('status', 'CLUB_EVENT_CREATOR_NOT_ALLOWED');
  end if;

  v_next_name := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');

  if v_next_name = '' then
    return jsonb_build_object('status', 'EVENT_NAME_REQUIRED');
  end if;

  if v_event.status = 'ACTIVE' and v_next_name <> v_event.name then
    return jsonb_build_object('status', 'EVENT_ACTIVE_NAME_LOCKED');
  end if;

  if btrim(coalesce(p_city, '')) = '' then
    return jsonb_build_object('status', 'EVENT_CITY_REQUIRED');
  end if;

  if public.normalize_city_key(p_city) <> public.normalize_city_key(v_club.city) then
    return jsonb_build_object(
      'status', 'EVENT_CITY_OUT_OF_SCOPE',
      'clubCity', v_club.city,
      'eventCity', p_city
    );
  end if;

  if p_status is null or p_status not in ('DRAFT', 'PUBLISHED', 'ACTIVE') then
    return jsonb_build_object('status', 'EVENT_STATUS_INVALID');
  end if;

  if p_visibility is null or p_visibility not in ('PUBLIC', 'PRIVATE', 'UNLISTED') then
    return jsonb_build_object('status', 'EVENT_VISIBILITY_INVALID');
  end if;

  if p_end_at <= p_start_at then
    return jsonb_build_object('status', 'EVENT_END_BEFORE_START');
  end if;

  if p_join_deadline_at > p_start_at then
    return jsonb_build_object('status', 'EVENT_JOIN_DEADLINE_INVALID');
  end if;

  if p_max_participants is not null and p_max_participants <= 0 then
    return jsonb_build_object('status', 'EVENT_MAX_PARTICIPANTS_INVALID');
  end if;

  if p_minimum_stamps_required is null or p_minimum_stamps_required < 0 then
    return jsonb_build_object('status', 'EVENT_MINIMUM_STAMPS_INVALID');
  end if;

  update public.events
  set
    city = btrim(v_club.city),
    cover_image_staging_path = nullif(btrim(coalesce(p_cover_image_staging_path, '')), ''),
    cover_image_url = nullif(btrim(coalesce(p_cover_image_url, '')), ''),
    description = nullif(btrim(coalesce(p_description, '')), ''),
    end_at = p_end_at,
    join_deadline_at = p_join_deadline_at,
    max_participants = p_max_participants,
    minimum_stamps_required = p_minimum_stamps_required,
    name = v_next_name,
    rules = coalesce(p_rules, '{}'::jsonb),
    start_at = p_start_at,
    status = p_status,
    ticket_url = nullif(btrim(coalesce(p_ticket_url, '')), ''),
    visibility = p_visibility
  where id = p_event_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_actor_user_id,
    'CLUB_EVENT_UPDATED',
    'events',
    p_event_id,
    jsonb_build_object(
      'clubId', v_event.club_id,
      'previousStatus', v_event.status,
      'nextStatus', p_status,
      'sourceRole', coalesce(v_actor_role, 'unknown')
    )
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'eventId', p_event_id
  );
end;
$update_club_event_atomic$;

create or replace function public.cancel_club_event_atomic(
  p_event_id uuid,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $cancel_club_event_atomic$
declare
  v_actor_role text;
  v_actor_user_id uuid;
  v_club public.clubs%rowtype;
  v_event public.events%rowtype;
  v_membership public.club_members%rowtype;
  v_profile public.profiles%rowtype;
begin
  v_actor_user_id := auth.uid();
  v_actor_role := auth.role();

  if v_actor_role is distinct from 'service_role' and v_actor_user_id is null then
    return jsonb_build_object('status', 'AUTH_REQUIRED');
  end if;

  if v_actor_role is distinct from 'service_role' and v_actor_user_id <> p_actor_user_id then
    return jsonb_build_object('status', 'ACTOR_NOT_ALLOWED');
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_actor_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'PROFILE_NOT_FOUND');
  end if;

  if v_profile.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'PROFILE_NOT_ACTIVE');
  end if;

  select *
  into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found or v_event.status not in ('DRAFT', 'PUBLISHED', 'ACTIVE') then
    return jsonb_build_object('status', 'EVENT_CANCEL_NOT_ALLOWED');
  end if;

  select *
  into v_club
  from public.clubs
  where id = v_event.club_id
  for update;

  if not found or v_club.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'CLUB_NOT_ACTIVE');
  end if;

  select *
  into v_membership
  from public.club_members
  where club_id = v_event.club_id
    and user_id = p_actor_user_id
  for update;

  if not found or v_membership.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'CLUB_MEMBERSHIP_NOT_ALLOWED');
  end if;

  if v_membership.role not in ('OWNER', 'ORGANIZER') then
    return jsonb_build_object('status', 'CLUB_EVENT_CREATOR_NOT_ALLOWED');
  end if;

  update public.events
  set status = 'CANCELLED'
  where id = p_event_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_actor_user_id,
    'CLUB_EVENT_CANCELLED',
    'events',
    p_event_id,
    jsonb_build_object(
      'clubId', v_event.club_id,
      'previousStatus', v_event.status,
      'sourceRole', coalesce(v_actor_role, 'unknown')
    )
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'eventId', p_event_id
  );
end;
$cancel_club_event_atomic$;

create or replace function public.update_club_department_tag_atomic(
  p_department_tag_id uuid,
  p_actor_user_id uuid,
  p_title text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $update_club_department_tag_atomic$
declare
  v_actor_role text;
  v_actor_user_id uuid;
  v_club public.clubs%rowtype;
  v_existing_tag_id uuid;
  v_membership public.club_members%rowtype;
  v_normalized_title text;
  v_profile public.profiles%rowtype;
  v_slug_attempt integer := 0;
  v_slug_base text;
  v_slug_candidate text;
  v_tag public.department_tags%rowtype;
begin
  v_actor_user_id := auth.uid();
  v_actor_role := auth.role();

  if v_actor_role is distinct from 'service_role' and v_actor_user_id is null then
    return jsonb_build_object('status', 'AUTH_REQUIRED');
  end if;

  if v_actor_role is distinct from 'service_role' and v_actor_user_id <> p_actor_user_id then
    return jsonb_build_object('status', 'ACTOR_NOT_ALLOWED');
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_actor_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'PROFILE_NOT_FOUND');
  end if;

  if v_profile.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'PROFILE_NOT_ACTIVE');
  end if;

  select *
  into v_tag
  from public.department_tags
  where id = p_department_tag_id
    and source_type = 'CLUB'
    and merged_into_tag_id is null
  for update;

  if not found or v_tag.status <> 'ACTIVE' or v_tag.source_club_id is null then
    return jsonb_build_object('status', 'DEPARTMENT_TAG_NOT_FOUND');
  end if;

  select *
  into v_club
  from public.clubs
  where id = v_tag.source_club_id
  for update;

  if not found or v_club.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'CLUB_NOT_ACTIVE');
  end if;

  select *
  into v_membership
  from public.club_members
  where club_id = v_tag.source_club_id
    and user_id = p_actor_user_id
  for update;

  if not found or v_membership.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'CLUB_MEMBERSHIP_NOT_ALLOWED');
  end if;

  if v_membership.role not in ('OWNER', 'ORGANIZER') then
    return jsonb_build_object('status', 'CLUB_TAG_EDITOR_NOT_ALLOWED');
  end if;

  v_normalized_title := regexp_replace(btrim(coalesce(p_title, '')), '\s+', ' ', 'g');

  if v_normalized_title = '' then
    return jsonb_build_object('status', 'DEPARTMENT_TAG_TITLE_REQUIRED');
  end if;

  select id
  into v_existing_tag_id
  from public.department_tags
  where source_type = 'CLUB'
    and source_club_id = v_tag.source_club_id
    and status = 'ACTIVE'
    and merged_into_tag_id is null
    and id <> p_department_tag_id
    and lower(title) = lower(v_normalized_title)
  for update;

  if found then
    return jsonb_build_object(
      'status', 'DEPARTMENT_TAG_ALREADY_EXISTS',
      'departmentTagId', v_existing_tag_id
    );
  end if;

  v_slug_base := regexp_replace(
    translate(lower(v_normalized_title), 'åäö', 'aao'),
    '[^a-z0-9]+',
    '-',
    'g'
  );
  v_slug_base := regexp_replace(v_slug_base, '(^-+|-+$)', '', 'g');

  if v_slug_base = '' then
    v_slug_base := 'department-tag';
  end if;

  v_slug_base := v_slug_base || '-' || v_club.slug;

  loop
    if v_slug_attempt = 0 then
      v_slug_candidate := v_slug_base;
    else
      v_slug_candidate := v_slug_base || '-' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8);
    end if;

    begin
      update public.department_tags
      set
        title = v_normalized_title,
        slug = v_slug_candidate,
        university_name = v_club.university_name,
        city = v_club.city
      where id = p_department_tag_id;

      exit;
    exception
      when unique_violation then
        v_slug_attempt := v_slug_attempt + 1;

        if v_slug_attempt >= 5 then
          return jsonb_build_object('status', 'DEPARTMENT_TAG_SLUG_CONFLICT');
        end if;
    end;
  end loop;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_actor_user_id,
    'CLUB_DEPARTMENT_TAG_UPDATED',
    'department_tags',
    p_department_tag_id,
    jsonb_build_object(
      'clubId', v_tag.source_club_id,
      'previousTitle', v_tag.title,
      'nextTitle', v_normalized_title,
      'tagSlug', v_slug_candidate,
      'sourceRole', coalesce(v_actor_role, 'unknown')
    )
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'departmentTagId', p_department_tag_id,
    'tagSlug', v_slug_candidate
  );
exception
  when unique_violation then
    return jsonb_build_object('status', 'DEPARTMENT_TAG_SLUG_CONFLICT');
end;
$update_club_department_tag_atomic$;

create or replace function public.delete_club_department_tag_atomic(
  p_department_tag_id uuid,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $delete_club_department_tag_atomic$
declare
  v_actor_role text;
  v_actor_user_id uuid;
  v_club public.clubs%rowtype;
  v_membership public.club_members%rowtype;
  v_profile public.profiles%rowtype;
  v_tag public.department_tags%rowtype;
begin
  v_actor_user_id := auth.uid();
  v_actor_role := auth.role();

  if v_actor_role is distinct from 'service_role' and v_actor_user_id is null then
    return jsonb_build_object('status', 'AUTH_REQUIRED');
  end if;

  if v_actor_role is distinct from 'service_role' and v_actor_user_id <> p_actor_user_id then
    return jsonb_build_object('status', 'ACTOR_NOT_ALLOWED');
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_actor_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'PROFILE_NOT_FOUND');
  end if;

  if v_profile.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'PROFILE_NOT_ACTIVE');
  end if;

  select *
  into v_tag
  from public.department_tags
  where id = p_department_tag_id
    and source_type = 'CLUB'
    and merged_into_tag_id is null
  for update;

  if not found or v_tag.status <> 'ACTIVE' or v_tag.source_club_id is null then
    return jsonb_build_object('status', 'DEPARTMENT_TAG_NOT_FOUND');
  end if;

  select *
  into v_club
  from public.clubs
  where id = v_tag.source_club_id
  for update;

  if not found or v_club.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'CLUB_NOT_ACTIVE');
  end if;

  select *
  into v_membership
  from public.club_members
  where club_id = v_tag.source_club_id
    and user_id = p_actor_user_id
  for update;

  if not found or v_membership.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'CLUB_MEMBERSHIP_NOT_ALLOWED');
  end if;

  if v_membership.role not in ('OWNER', 'ORGANIZER') then
    return jsonb_build_object('status', 'CLUB_TAG_EDITOR_NOT_ALLOWED');
  end if;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_actor_user_id,
    'CLUB_DEPARTMENT_TAG_DELETED',
    'department_tags',
    p_department_tag_id,
    jsonb_build_object(
      'clubId', v_tag.source_club_id,
      'tagSlug', v_tag.slug,
      'sourceRole', coalesce(v_actor_role, 'unknown')
    )
  );

  delete from public.department_tags
  where id = p_department_tag_id;

  return jsonb_build_object(
    'status', 'SUCCESS',
    'departmentTagId', p_department_tag_id
  );
end;
$delete_club_department_tag_atomic$;

revoke execute on function public.update_club_event_atomic(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  text,
  integer,
  integer,
  jsonb,
  text,
  text
) from public, anon;

revoke execute on function public.cancel_club_event_atomic(uuid, uuid) from public, anon;
revoke execute on function public.update_club_department_tag_atomic(uuid, uuid, text) from public, anon;
revoke execute on function public.delete_club_department_tag_atomic(uuid, uuid) from public, anon;

grant execute on function public.update_club_event_atomic(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  text,
  integer,
  integer,
  jsonb,
  text,
  text
) to authenticated, service_role;

grant execute on function public.cancel_club_event_atomic(uuid, uuid) to authenticated, service_role;
grant execute on function public.update_club_department_tag_atomic(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.delete_club_department_tag_atomic(uuid, uuid) to authenticated, service_role;
