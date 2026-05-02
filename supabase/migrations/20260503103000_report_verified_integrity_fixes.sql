drop policy if exists "platform admins can read qr token uses" on public.qr_token_uses;
drop policy if exists "event managers can read qr token uses" on public.qr_token_uses;
drop policy if exists "business staff can read own qr token uses" on public.qr_token_uses;

create policy "platform admins can read qr token uses"
  on public.qr_token_uses
  for select
  using (public.is_platform_admin());

create policy "event managers can read qr token uses"
  on public.qr_token_uses
  for select
  using (public.can_user_manage_event(event_id));

create policy "business staff can read own qr token uses"
  on public.qr_token_uses
  for select
  using (public.is_business_staff_for(business_id));

drop policy if exists "anyone can create business applications" on public.business_applications;
drop policy if exists "authenticated users can create business applications" on public.business_applications;

create policy "authenticated users can create business applications"
  on public.business_applications
  for insert
  to authenticated
  with check (status = 'PENDING');

create or replace function public.cancel_event_registration_atomic(
  p_event_id uuid,
  p_student_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_registration public.event_registrations%rowtype;
  v_actor_user_id uuid;
  v_actor_role text;
begin
  v_actor_user_id := auth.uid();
  v_actor_role := auth.role();

  if v_actor_role is distinct from 'service_role' and v_actor_user_id is null then
    return jsonb_build_object('status', 'AUTH_REQUIRED');
  end if;

  if v_actor_role is distinct from 'service_role' and v_actor_user_id <> p_student_id then
    return jsonb_build_object('status', 'ACTOR_NOT_ALLOWED');
  end if;

  select *
  into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return jsonb_build_object('status', 'EVENT_NOT_FOUND');
  end if;

  if now() >= v_event.start_at or v_event.status in ('ACTIVE', 'COMPLETED', 'CANCELLED') then
    return jsonb_build_object(
      'status', 'EVENT_ALREADY_STARTED',
      'startAt', v_event.start_at
    );
  end if;

  select *
  into v_registration
  from public.event_registrations
  where event_id = p_event_id
    and student_id = p_student_id
  for update;

  if not found then
    return jsonb_build_object('status', 'NOT_REGISTERED');
  end if;

  if v_registration.status = 'CANCELLED' then
    return jsonb_build_object(
      'status', 'ALREADY_CANCELLED',
      'registrationId', v_registration.id
    );
  end if;

  if v_registration.status = 'BANNED' then
    return jsonb_build_object('status', 'STUDENT_BANNED');
  end if;

  update public.event_registrations
  set
    status = 'CANCELLED',
    completed_at = null
  where id = v_registration.id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_student_id,
    'EVENT_REGISTRATION_CANCELLED',
    'event_registrations',
    v_registration.id,
    jsonb_build_object('eventId', p_event_id, 'studentId', p_student_id, 'sourceRole', coalesce(v_actor_role, 'unknown'))
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'registrationId', v_registration.id
  );
end;
$$;

create or replace function public.register_event_atomic(
  p_event_id uuid,
  p_student_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_profile public.profiles%rowtype;
  v_registration public.event_registrations%rowtype;
  v_registration_id uuid;
  v_registered_count integer;
  v_actor_user_id uuid;
  v_actor_role text;
begin
  v_actor_user_id := auth.uid();
  v_actor_role := auth.role();

  if v_actor_role is distinct from 'service_role' and v_actor_user_id is null then
    return jsonb_build_object('status', 'AUTH_REQUIRED');
  end if;

  if v_actor_role is distinct from 'service_role' and v_actor_user_id <> p_student_id then
    return jsonb_build_object('status', 'ACTOR_NOT_ALLOWED');
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_student_id;

  if not found then
    return jsonb_build_object('status', 'PROFILE_NOT_FOUND');
  end if;

  if v_profile.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'PROFILE_NOT_ACTIVE');
  end if;

  if v_profile.primary_role <> 'STUDENT' then
    return jsonb_build_object('status', 'ROLE_NOT_ALLOWED');
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

  if now() >= v_event.join_deadline_at or now() >= v_event.start_at then
    return jsonb_build_object(
      'status', 'EVENT_REGISTRATION_CLOSED',
      'startAt', v_event.start_at,
      'joinDeadlineAt', v_event.join_deadline_at
    );
  end if;

  select *
  into v_registration
  from public.event_registrations
  where event_id = p_event_id
    and student_id = p_student_id
  for update;

  if found then
    if v_registration.status = 'REGISTERED' then
      return jsonb_build_object(
        'status', 'ALREADY_REGISTERED',
        'registrationId', v_registration.id
      );
    end if;

    if v_registration.status = 'BANNED' then
      return jsonb_build_object('status', 'STUDENT_BANNED');
    end if;
  end if;

  if v_event.max_participants is not null then
    select count(*)
    into v_registered_count
    from public.event_registrations
    where event_id = p_event_id
      and status = 'REGISTERED';

    if v_registered_count >= v_event.max_participants then
      return jsonb_build_object(
        'status', 'EVENT_FULL',
        'maxParticipants', v_event.max_participants,
        'currentRegistrations', v_registered_count
      );
    end if;
  end if;

  if v_registration.id is not null then
    update public.event_registrations
    set
      status = 'REGISTERED',
      registered_at = now(),
      completed_at = null
    where id = v_registration.id
    returning id into v_registration_id;
  else
    insert into public.event_registrations (
      event_id,
      student_id,
      status
    )
    values (
      p_event_id,
      p_student_id,
      'REGISTERED'
    )
    returning id into v_registration_id;
  end if;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_student_id,
    'EVENT_REGISTERED',
    'event_registrations',
    v_registration_id,
    jsonb_build_object('eventId', p_event_id, 'studentId', p_student_id, 'sourceRole', coalesce(v_actor_role, 'unknown'))
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'registrationId', v_registration_id
  );
end;
$$;

create or replace function public.scan_stamp_atomic(
  p_event_id uuid,
  p_student_id uuid,
  p_qr_jti text,
  p_business_id uuid,
  p_scanner_user_id uuid,
  p_scanner_device_id text,
  p_scanner_latitude numeric,
  p_scanner_longitude numeric,
  p_ip inet,
  p_user_agent text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_event_venue public.event_venues%rowtype;
  v_event_registration public.event_registrations%rowtype;
  v_stamp_id uuid;
  v_stamp_count integer;
  v_previous_stamp_count integer;
  v_unlocked_reward_tiers jsonb := '[]'::jsonb;
  v_constraint_name text;
begin
  select * into v_event
  from public.events
  where id = p_event_id;

  if not found then
    return jsonb_build_object('status', 'EVENT_NOT_FOUND');
  end if;

  if v_event.status not in ('PUBLISHED', 'ACTIVE') or now() < v_event.start_at or now() > v_event.end_at then
    return jsonb_build_object('status', 'EVENT_NOT_ACTIVE');
  end if;

  select * into v_event_registration
  from public.event_registrations
  where event_id = p_event_id
    and student_id = p_student_id
    and status = 'REGISTERED'
  for update;

  if not found then
    return jsonb_build_object('status', 'STUDENT_NOT_REGISTERED');
  end if;

  select * into v_event_venue
  from public.event_venues
  where event_id = p_event_id
    and business_id = p_business_id
    and status = 'JOINED';

  if not found then
    return jsonb_build_object('status', 'VENUE_NOT_IN_EVENT');
  end if;

  if v_event_venue.joined_at is null or v_event_venue.joined_at >= v_event.start_at then
    return jsonb_build_object('status', 'VENUE_JOINED_TOO_LATE');
  end if;

  if not exists (
    select 1
    from public.business_staff
    where business_id = p_business_id
      and user_id = p_scanner_user_id
      and status = 'ACTIVE'
  ) then
    return jsonb_build_object('status', 'BUSINESS_STAFF_NOT_ALLOWED');
  end if;

  insert into public.qr_token_uses (
    jti,
    event_id,
    student_id,
    business_id,
    scanner_user_id,
    scanner_device_id,
    scanner_latitude,
    scanner_longitude,
    ip,
    user_agent
  )
  values (
    p_qr_jti,
    p_event_id,
    p_student_id,
    p_business_id,
    p_scanner_user_id,
    p_scanner_device_id,
    p_scanner_latitude,
    p_scanner_longitude,
    p_ip,
    p_user_agent
  );

  insert into public.stamps (
    event_id,
    student_id,
    business_id,
    event_venue_id,
    scanner_user_id,
    qr_jti,
    scanner_device_id,
    scanner_latitude,
    scanner_longitude,
    scan_ip
  )
  values (
    p_event_id,
    p_student_id,
    p_business_id,
    v_event_venue.id,
    p_scanner_user_id,
    p_qr_jti,
    p_scanner_device_id,
    p_scanner_latitude,
    p_scanner_longitude,
    p_ip
  )
  returning id into v_stamp_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata,
    ip,
    user_agent
  )
  values (
    p_scanner_user_id,
    'STAMP_CREATED',
    'stamps',
    v_stamp_id,
    jsonb_build_object('eventId', p_event_id, 'studentId', p_student_id, 'businessId', p_business_id),
    p_ip,
    p_user_agent
  );

  select count(*) into v_stamp_count
  from public.stamps
  where event_id = p_event_id
    and student_id = p_student_id
    and validation_status = 'VALID';

  perform public.update_event_leaderboard(p_event_id);

  v_previous_stamp_count := greatest(v_stamp_count - 1, 0);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'rewardTierId', reward_tier.id,
        'title', reward_tier.title,
        'requiredStampCount', reward_tier.required_stamp_count
      )
      order by reward_tier.required_stamp_count asc, reward_tier.created_at asc, reward_tier.id asc
    ),
    '[]'::jsonb
  )
  into v_unlocked_reward_tiers
  from public.reward_tiers reward_tier
  left join public.reward_claims reward_claim
    on reward_claim.event_id = reward_tier.event_id
    and reward_claim.reward_tier_id = reward_tier.id
    and reward_claim.student_id = p_student_id
  where reward_tier.event_id = p_event_id
    and reward_tier.status = 'ACTIVE'
    and reward_tier.required_stamp_count > v_previous_stamp_count
    and reward_tier.required_stamp_count <= v_stamp_count
    and (reward_tier.inventory_total is null or reward_tier.inventory_total > reward_tier.inventory_claimed)
    and reward_claim.id is null;

  return jsonb_build_object(
    'status',
    'SUCCESS',
    'stampId',
    v_stamp_id,
    'stampCount',
    v_stamp_count,
    'eventName',
    v_event.name,
    'unlockedRewardTiers',
    v_unlocked_reward_tiers
  );
exception
  when unique_violation then
    get stacked diagnostics v_constraint_name = constraint_name;

    if v_constraint_name in ('qr_token_uses_pkey', 'stamps_qr_jti_key') then
      return jsonb_build_object('status', 'QR_ALREADY_USED_OR_REPLAYED');
    end if;

    if v_constraint_name = 'stamps_event_id_student_id_business_id_key' then
      return jsonb_build_object('status', 'ALREADY_STAMPED');
    end if;

    raise;
end;
$$;
