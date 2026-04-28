create or replace function public.create_club_event_atomic(
  p_club_id uuid,
  p_name text,
  p_description text,
  p_city text,
  p_country text,
  p_cover_image_url text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_join_deadline_at timestamptz,
  p_visibility text,
  p_max_participants integer,
  p_minimum_stamps_required integer,
  p_rules jsonb,
  p_created_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $create_club_event_atomic$
declare
  v_actor_user_id uuid;
  v_actor_role text;
  v_profile public.profiles%rowtype;
  v_club public.clubs%rowtype;
  v_membership public.club_members%rowtype;
  v_event_id uuid;
  v_slug_base text;
  v_slug_candidate text;
  v_slug_attempt integer := 0;
begin
  v_actor_user_id := auth.uid();
  v_actor_role := auth.role();

  if v_actor_role is distinct from 'service_role' and v_actor_user_id is null then
    return jsonb_build_object('status', 'AUTH_REQUIRED');
  end if;

  if v_actor_role is distinct from 'service_role' and v_actor_user_id <> p_created_by then
    return jsonb_build_object('status', 'ACTOR_NOT_ALLOWED');
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_created_by
  for update;

  if not found then
    return jsonb_build_object('status', 'PROFILE_NOT_FOUND');
  end if;

  if v_profile.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'PROFILE_NOT_ACTIVE');
  end if;

  select *
  into v_club
  from public.clubs
  where id = p_club_id
  for update;

  if not found or v_club.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'CLUB_NOT_ACTIVE');
  end if;

  select *
  into v_membership
  from public.club_members
  where club_id = p_club_id
    and user_id = p_created_by
  for update;

  if not found or v_membership.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'CLUB_MEMBERSHIP_NOT_ALLOWED');
  end if;

  if v_membership.role not in ('OWNER', 'ORGANIZER') then
    return jsonb_build_object('status', 'CLUB_EVENT_CREATOR_NOT_ALLOWED');
  end if;

  if btrim(p_name) = '' then
    return jsonb_build_object('status', 'EVENT_NAME_REQUIRED');
  end if;

  if btrim(p_city) = '' then
    return jsonb_build_object('status', 'EVENT_CITY_REQUIRED');
  end if;

  if p_visibility not in ('PUBLIC', 'PRIVATE', 'UNLISTED') then
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

  if p_minimum_stamps_required < 0 then
    return jsonb_build_object('status', 'EVENT_MINIMUM_STAMPS_INVALID');
  end if;

  v_slug_base := regexp_replace(
    translate(lower(coalesce(p_name, '')), 'åäö', 'aao'),
    '[^a-z0-9]+',
    '-',
    'g'
  );
  v_slug_base := regexp_replace(v_slug_base, '(^-+|-+$)', '', 'g');

  if v_slug_base = '' then
    v_slug_base := 'event';
  end if;

  loop
    if v_slug_attempt = 0 then
      v_slug_candidate := v_slug_base;
    else
      v_slug_candidate := v_slug_base || '-' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8);
    end if;

    begin
      insert into public.events (
        club_id,
        name,
        slug,
        description,
        city,
        country,
        cover_image_url,
        start_at,
        end_at,
        join_deadline_at,
        status,
        visibility,
        max_participants,
        minimum_stamps_required,
        rules,
        created_by
      )
      values (
        p_club_id,
        btrim(p_name),
        v_slug_candidate,
        nullif(btrim(p_description), ''),
        btrim(p_city),
        case when btrim(p_country) = '' then 'Finland' else btrim(p_country) end,
        nullif(btrim(p_cover_image_url), ''),
        p_start_at,
        p_end_at,
        p_join_deadline_at,
        'DRAFT',
        p_visibility,
        p_max_participants,
        p_minimum_stamps_required,
        coalesce(p_rules, '{}'::jsonb),
        p_created_by
      )
      returning id into v_event_id;

      exit;
    exception
      when unique_violation then
        v_slug_attempt := v_slug_attempt + 1;

        if v_slug_attempt >= 5 then
          return jsonb_build_object('status', 'EVENT_SLUG_CONFLICT');
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
    p_created_by,
    'CLUB_EVENT_CREATED',
    'events',
    v_event_id,
    jsonb_build_object(
      'clubId', p_club_id,
      'eventSlug', v_slug_candidate,
      'visibility', p_visibility,
      'sourceRole', coalesce(v_actor_role, 'unknown')
    )
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'eventId', v_event_id,
    'eventSlug', v_slug_candidate
  );
exception
  when unique_violation then
    return jsonb_build_object('status', 'EVENT_SLUG_CONFLICT');
end;
$create_club_event_atomic$;
