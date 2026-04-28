create or replace function public.leave_business_event_atomic(
  p_event_id uuid,
  p_business_id uuid,
  p_staff_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $leave_business_event_atomic$
declare
  v_event public.events%rowtype;
  v_business public.businesses%rowtype;
  v_profile public.profiles%rowtype;
  v_membership public.business_staff%rowtype;
  v_event_venue public.event_venues%rowtype;
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

  select *
  into v_membership
  from public.business_staff
  where business_id = p_business_id
    and user_id = p_staff_user_id
  for update;

  if not found or v_membership.status <> 'ACTIVE' then
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

  if v_event.status <> 'PUBLISHED' or now() >= v_event.start_at then
    return jsonb_build_object(
      'status', 'EVENT_LEAVE_CLOSED',
      'startAt', v_event.start_at,
      'eventStatus', v_event.status
    );
  end if;

  select *
  into v_event_venue
  from public.event_venues
  where event_id = p_event_id
    and business_id = p_business_id
  for update;

  if not found then
    return jsonb_build_object('status', 'VENUE_NOT_FOUND');
  end if;

  if v_event_venue.status = 'LEFT' then
    return jsonb_build_object(
      'status', 'VENUE_ALREADY_LEFT',
      'eventVenueId', v_event_venue.id
    );
  end if;

  if v_event_venue.status = 'REMOVED' then
    return jsonb_build_object(
      'status', 'VENUE_REMOVED',
      'eventVenueId', v_event_venue.id
    );
  end if;

  if v_event_venue.status <> 'JOINED' then
    return jsonb_build_object(
      'status', 'VENUE_NOT_JOINED',
      'eventVenueId', v_event_venue.id
    );
  end if;

  update public.event_venues
  set
    status = 'LEFT',
    left_at = now()
  where id = v_event_venue.id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_staff_user_id,
    'EVENT_VENUE_LEFT',
    'event_venues',
    v_event_venue.id,
    jsonb_build_object(
      'eventId', p_event_id,
      'businessId', p_business_id,
      'staffUserId', p_staff_user_id,
      'sourceRole', coalesce(v_actor_role, 'unknown')
    )
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'eventVenueId', v_event_venue.id
  );
end;
$leave_business_event_atomic$;
