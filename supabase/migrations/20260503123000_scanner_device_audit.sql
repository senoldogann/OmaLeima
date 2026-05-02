create table if not exists public.business_scanner_devices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  installation_id text not null,
  label text not null,
  platform text not null check (platform in ('IOS', 'ANDROID', 'WEB', 'UNKNOWN')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
  created_by uuid not null references public.profiles(id),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, installation_id)
);

create index if not exists idx_business_scanner_devices_business
  on public.business_scanner_devices(business_id, status, last_seen_at desc);

alter table public.business_scanner_devices enable row level security;

create policy "business staff can read own scanner devices"
  on public.business_scanner_devices
  for select
  using (public.is_business_staff_for(business_id));

create policy "platform admins can manage scanner devices"
  on public.business_scanner_devices
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create or replace function public.register_business_scanner_device(
  p_business_id uuid,
  p_installation_id text,
  p_label text,
  p_platform text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.business_scanner_devices%rowtype;
  v_installation_id text := nullif(trim(p_installation_id), '');
  v_label text := nullif(trim(p_label), '');
  v_platform text := upper(nullif(trim(p_platform), ''));
begin
  if v_installation_id is null then
    raise exception 'p_installation_id is required';
  end if;

  if length(v_installation_id) > 128 then
    raise exception 'p_installation_id must be at most 128 characters';
  end if;

  if v_label is null then
    raise exception 'p_label is required';
  end if;

  if length(v_label) > 80 then
    v_label := left(v_label, 80);
  end if;

  if v_platform is null or v_platform not in ('IOS', 'ANDROID', 'WEB') then
    v_platform := 'UNKNOWN';
  end if;

  if not exists (
    select 1
    from public.business_staff
    where business_id = p_business_id
      and user_id = auth.uid()
      and status = 'ACTIVE'
  ) then
    return jsonb_build_object('status', 'ACTOR_NOT_ALLOWED');
  end if;

  insert into public.business_scanner_devices (
    business_id,
    installation_id,
    label,
    platform,
    status,
    created_by
  )
  values (
    p_business_id,
    v_installation_id,
    v_label,
    v_platform,
    'ACTIVE',
    auth.uid()
  )
  on conflict (business_id, installation_id)
  do update set
    label = excluded.label,
    platform = excluded.platform,
    status = 'ACTIVE',
    last_seen_at = now(),
    updated_at = now()
  returning * into v_device;

  return jsonb_build_object(
    'status', 'SUCCESS',
    'scannerDeviceId', v_device.id,
    'label', v_device.label,
    'platform', v_device.platform
  );
end;
$$;

grant execute on function public.register_business_scanner_device(uuid, text, text, text) to authenticated;

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
      order by reward_tier.required_stamp_count
    ),
    '[]'::jsonb
  )
  into v_unlocked_reward_tiers
  from public.reward_tiers reward_tier
  where reward_tier.event_id = p_event_id
    and reward_tier.is_active = true
    and reward_tier.required_stamp_count > v_previous_stamp_count
    and reward_tier.required_stamp_count <= v_stamp_count
    and not exists (
      select 1
      from public.reward_claims reward_claim
      where reward_claim.reward_tier_id = reward_tier.id
        and reward_claim.student_id = p_student_id
    );

  insert into public.reward_claims (
    reward_tier_id,
    student_id,
    status
  )
  select
    reward_tier.id,
    p_student_id,
    'UNCLAIMED'
  from public.reward_tiers reward_tier
  where reward_tier.event_id = p_event_id
    and reward_tier.is_active = true
    and reward_tier.required_stamp_count > v_previous_stamp_count
    and reward_tier.required_stamp_count <= v_stamp_count
  on conflict (reward_tier_id, student_id) do nothing;

  update public.event_registrations
  set stamp_count = v_stamp_count,
      completed_at = case
        when v_stamp_count >= v_event.min_stamps_required then coalesce(completed_at, now())
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
$$;

create or replace function public.create_scanner_distance_fraud_signal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_latitude numeric;
  v_business_longitude numeric;
  v_distance_meters numeric;
  v_severity text;
begin
  if NEW.scanner_latitude is null or NEW.scanner_longitude is null then
    return NEW;
  end if;

  select latitude, longitude
  into v_business_latitude, v_business_longitude
  from public.businesses
  where id = NEW.business_id;

  if v_business_latitude is null or v_business_longitude is null then
    return NEW;
  end if;

  v_distance_meters :=
    6371000 * 2 * asin(
      sqrt(
        power(sin(radians((NEW.scanner_latitude - v_business_latitude) / 2)), 2) +
        cos(radians(v_business_latitude)) *
        cos(radians(NEW.scanner_latitude)) *
        power(sin(radians((NEW.scanner_longitude - v_business_longitude) / 2)), 2)
      )
    );

  if v_distance_meters <= 300 then
    return NEW;
  end if;

  v_severity := case
    when v_distance_meters >= 1500 then 'HIGH'
    when v_distance_meters >= 750 then 'MEDIUM'
    else 'LOW'
  end;

  insert into public.fraud_signals (
    event_id,
    student_id,
    business_id,
    scanner_user_id,
    type,
    severity,
    description,
    metadata
  )
  values (
    NEW.event_id,
    NEW.student_id,
    NEW.business_id,
    NEW.scanner_user_id,
    'SCANNER_DISTANCE_ANOMALY',
    v_severity,
    'Scanner location was far from the venue coordinates during a successful leima scan.',
    jsonb_build_object(
      'stampId', NEW.id,
      'qrJti', NEW.qr_jti,
      'scannerDeviceId', NEW.scanner_device_id,
      'distanceMeters', round(v_distance_meters),
      'scannerLatitude', NEW.scanner_latitude,
      'scannerLongitude', NEW.scanner_longitude,
      'businessLatitude', v_business_latitude,
      'businessLongitude', v_business_longitude,
      'thresholdMeters', 300
    )
  );

  return NEW;
end;
$$;
