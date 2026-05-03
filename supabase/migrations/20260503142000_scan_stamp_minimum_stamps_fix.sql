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
as $scan_stamp_atomic$
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

  if p_scanner_device_id is not null and not exists (
    select 1
    from public.business_scanner_devices
    where id::text = p_scanner_device_id
      and business_id = p_business_id
      and status = 'ACTIVE'
  ) then
    return jsonb_build_object('status', 'SCANNER_DEVICE_NOT_ALLOWED');
  end if;

  if p_scanner_device_id is not null then
    update public.business_scanner_devices
    set last_seen_at = now(),
        updated_at = now()
    where id::text = p_scanner_device_id
      and business_id = p_business_id
      and status = 'ACTIVE';
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
    jsonb_build_object(
      'eventId', p_event_id,
      'studentId', p_student_id,
      'businessId', p_business_id,
      'scannerDeviceId', p_scanner_device_id
    ),
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

  update public.event_registrations
  set stamp_count = v_stamp_count,
      completed_at = case
        when v_stamp_count >= v_event.minimum_stamps_required then coalesce(completed_at, now())
        else completed_at
      end
  where id = v_event_registration.id;

  return jsonb_build_object(
    'status', 'SUCCESS',
    'stampId', v_stamp_id,
    'stampCount', v_stamp_count,
    'eventName', v_event.name,
    'unlockedRewardTiers', v_unlocked_reward_tiers
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
$scan_stamp_atomic$;

grant execute on function public.scan_stamp_atomic(
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  inet,
  text
) to authenticated;
