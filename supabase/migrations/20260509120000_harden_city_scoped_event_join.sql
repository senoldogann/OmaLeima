create or replace function public.join_business_event_atomic(
  p_event_id uuid,
  p_business_id uuid,
  p_staff_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $join_business_event_atomic$
declare
  v_event public.events%rowtype;
  v_business public.businesses%rowtype;
  v_profile public.profiles%rowtype;
  v_membership public.business_staff%rowtype;
  v_event_venue public.event_venues%rowtype;
  v_event_venue_id uuid;
  v_inserted boolean := false;
  v_actor_user_id uuid;
  v_actor_role text;
begin
  v_actor_user_id := auth.uid();
  v_actor_role := auth.role();

  if v_actor_role is distinct from 'service_role' and v_actor_user_id is null then
    return jsonb_build_object('status', 'AUTH_REQUIRED');
  end if;

  if v_actor_role is distinct from 'service_role' and v_actor_user_id <> p_staff_user_id then
    return jsonb_build_object('status', 'ACTOR_NOT_ALLOWED');
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_staff_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'PROFILE_NOT_FOUND');
  end if;

  if v_profile.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'PROFILE_NOT_ACTIVE');
  end if;

  select *
  into v_business
  from public.businesses
  where id = p_business_id
  for update;

  if not found or v_business.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'BUSINESS_NOT_ACTIVE');
  end if;

  if nullif(btrim(coalesce(v_business.city, '')), '') is null then
    return jsonb_build_object('status', 'BUSINESS_CITY_REQUIRED');
  end if;

  select *
  into v_membership
  from public.business_staff
  where business_id = p_business_id
    and user_id = p_staff_user_id
  for update;

  if not found or v_membership.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'BUSINESS_STAFF_NOT_ALLOWED');
  end if;

  if v_membership.role not in ('OWNER', 'MANAGER') then
    return jsonb_build_object('status', 'BUSINESS_STAFF_NOT_ALLOWED');
  end if;

  select *
  into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return jsonb_build_object('status', 'EVENT_NOT_FOUND');
  end if;

  if v_event.visibility <> 'PUBLIC' or v_event.status not in ('PUBLISHED', 'ACTIVE') then
    return jsonb_build_object('status', 'EVENT_NOT_AVAILABLE');
  end if;

  if public.normalize_city_key(v_business.city) <> public.normalize_city_key(v_event.city) then
    return jsonb_build_object(
      'status', 'EVENT_CITY_MISMATCH',
      'businessCity', v_business.city,
      'eventCity', v_event.city
    );
  end if;

  if now() >= v_event.join_deadline_at or now() >= v_event.start_at then
    return jsonb_build_object(
      'status', 'EVENT_JOIN_CLOSED',
      'startAt', v_event.start_at,
      'joinDeadlineAt', v_event.join_deadline_at
    );
  end if;

  insert into public.event_venues (
    event_id,
    business_id,
    status,
    joined_by,
    joined_at
  )
  values (
    p_event_id,
    p_business_id,
    'JOINED',
    p_staff_user_id,
    now()
  )
  on conflict (event_id, business_id) do nothing
  returning id into v_event_venue_id;

  v_inserted := found;

  if not v_inserted then
    select *
    into v_event_venue
    from public.event_venues
    where event_id = p_event_id
      and business_id = p_business_id
    for update;

    if not found then
      raise exception 'EVENT_VENUE_CONFLICT_NOT_FOUND: event venue conflict row was not found'
        using errcode = '23514';
    end if;

    if v_event_venue.status = 'JOINED' then
      return jsonb_build_object(
        'status', 'ALREADY_JOINED',
        'eventVenueId', v_event_venue.id
      );
    end if;

    if v_event_venue.status = 'REMOVED' then
      return jsonb_build_object(
        'status', 'VENUE_REMOVED',
        'eventVenueId', v_event_venue.id
      );
    end if;

    update public.event_venues
    set
      status = 'JOINED',
      joined_by = p_staff_user_id,
      joined_at = now(),
      left_at = null
    where id = v_event_venue.id
    returning id into v_event_venue_id;
  end if;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_staff_user_id,
    'EVENT_VENUE_JOINED',
    'event_venues',
    v_event_venue_id,
    jsonb_build_object(
      'eventId', p_event_id,
      'businessId', p_business_id,
      'staffUserId', p_staff_user_id,
      'sourceRole', coalesce(v_actor_role, 'unknown'),
      'wasInserted', v_inserted
    )
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'eventVenueId', v_event_venue_id
  );
end;
$join_business_event_atomic$;

revoke execute on function public.enforce_event_club_city_scope() from public, anon, authenticated;
revoke execute on function public.normalize_city_key(text) from public, anon;
grant execute on function public.normalize_city_key(text) to authenticated, service_role;

notify pgrst, 'reload schema';
