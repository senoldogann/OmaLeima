alter table public.business_scanner_devices
  add column if not exists pin_set_at timestamptz;

create table if not exists public.business_scanner_device_pins (
  scanner_device_id uuid primary key references public.business_scanner_devices(id) on delete cascade,
  pin_hash text not null,
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.business_scanner_device_pins enable row level security;

create policy "platform admins can manage scanner device pins"
  on public.business_scanner_device_pins
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create or replace function public.set_business_scanner_device_pin(
  p_scanner_device_id uuid,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $set_business_scanner_device_pin$
declare
  v_device public.business_scanner_devices%rowtype;
  v_pin text := nullif(trim(p_pin), '');
begin
  if v_pin is null or v_pin !~ '^[0-9]{4,8}$' then
    return jsonb_build_object('status', 'PIN_INVALID_FORMAT');
  end if;

  select * into v_device
  from public.business_scanner_devices
  where id = p_scanner_device_id
  for update;

  if not found then
    return jsonb_build_object('status', 'DEVICE_NOT_FOUND');
  end if;

  if v_device.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'DEVICE_NOT_ACTIVE');
  end if;

  if not public.is_business_staff_for(v_device.business_id) then
    return jsonb_build_object('status', 'ACTOR_NOT_ALLOWED');
  end if;

  if v_device.created_by <> auth.uid() and not public.is_business_manager_for(v_device.business_id) then
    return jsonb_build_object('status', 'ACTOR_NOT_ALLOWED');
  end if;

  insert into public.business_scanner_device_pins (
    scanner_device_id,
    pin_hash,
    updated_by,
    updated_at
  )
  values (
    v_device.id,
    crypt(v_pin, gen_salt('bf')),
    auth.uid(),
    now()
  )
  on conflict (scanner_device_id)
  do update set
    pin_hash = excluded.pin_hash,
    updated_by = excluded.updated_by,
    updated_at = now();

  update public.business_scanner_devices
  set pin_set_at = now(),
      updated_at = now()
  where id = v_device.id;

  return jsonb_build_object(
    'status', 'SUCCESS',
    'scannerDeviceId', v_device.id,
    'pinRequired', true
  );
end;
$set_business_scanner_device_pin$;

grant execute on function public.set_business_scanner_device_pin(uuid, text) to authenticated;

create or replace function public.clear_business_scanner_device_pin(
  p_scanner_device_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $clear_business_scanner_device_pin$
declare
  v_device public.business_scanner_devices%rowtype;
begin
  select * into v_device
  from public.business_scanner_devices
  where id = p_scanner_device_id
  for update;

  if not found then
    return jsonb_build_object('status', 'DEVICE_NOT_FOUND');
  end if;

  if not public.is_business_staff_for(v_device.business_id) then
    return jsonb_build_object('status', 'ACTOR_NOT_ALLOWED');
  end if;

  if v_device.created_by <> auth.uid() and not public.is_business_manager_for(v_device.business_id) then
    return jsonb_build_object('status', 'ACTOR_NOT_ALLOWED');
  end if;

  delete from public.business_scanner_device_pins
  where scanner_device_id = v_device.id;

  update public.business_scanner_devices
  set pin_set_at = null,
      updated_at = now()
  where id = v_device.id;

  return jsonb_build_object(
    'status', 'SUCCESS',
    'scannerDeviceId', v_device.id,
    'pinRequired', false
  );
end;
$clear_business_scanner_device_pin$;

grant execute on function public.clear_business_scanner_device_pin(uuid) to authenticated;

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
as $register_business_scanner_device$
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

  select * into v_device
  from public.business_scanner_devices
  where business_id = p_business_id
    and installation_id = v_installation_id
  for update;

  if found and v_device.status = 'REVOKED' then
    return jsonb_build_object(
      'status', 'DEVICE_REVOKED',
      'scannerDeviceId', v_device.id,
      'label', v_device.label,
      'platform', v_device.platform,
      'pinRequired', v_device.pin_set_at is not null
    );
  end if;

  if found then
    update public.business_scanner_devices
    set platform = v_platform,
        status = 'ACTIVE',
        last_seen_at = now(),
        updated_at = now()
    where id = v_device.id
    returning * into v_device;
  else
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
    returning * into v_device;
  end if;

  return jsonb_build_object(
    'status', 'SUCCESS',
    'scannerDeviceId', v_device.id,
    'label', v_device.label,
    'platform', v_device.platform,
    'pinRequired', v_device.pin_set_at is not null
  );
end;
$register_business_scanner_device$;

grant execute on function public.register_business_scanner_device(uuid, text, text, text) to authenticated;

create or replace function public.scan_stamp_atomic(
  p_event_id uuid,
  p_student_id uuid,
  p_qr_jti text,
  p_business_id uuid,
  p_scanner_user_id uuid,
  p_scanner_device_id text,
  p_scanner_pin text,
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
  v_scanner_device public.business_scanner_devices%rowtype;
  v_scanner_pin_hash text;
  v_submitted_pin text := nullif(trim(coalesce(p_scanner_pin, '')), '');
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

  if p_scanner_device_id is not null then
    select * into v_scanner_device
    from public.business_scanner_devices
    where id::text = p_scanner_device_id
      and business_id = p_business_id
      and status = 'ACTIVE';

    if not found then
      return jsonb_build_object('status', 'SCANNER_DEVICE_NOT_ALLOWED');
    end if;

    if v_scanner_device.pin_set_at is not null then
      select pin_hash into v_scanner_pin_hash
      from public.business_scanner_device_pins
      where scanner_device_id = v_scanner_device.id;

      if v_scanner_pin_hash is null or v_submitted_pin is null then
        return jsonb_build_object('status', 'SCANNER_PIN_REQUIRED');
      end if;

      if crypt(v_submitted_pin, v_scanner_pin_hash) <> v_scanner_pin_hash then
        return jsonb_build_object('status', 'SCANNER_PIN_INVALID');
      end if;
    end if;

    update public.business_scanner_devices
    set last_seen_at = now(),
        updated_at = now()
    where id = v_scanner_device.id;
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
      'scannerDeviceId', p_scanner_device_id,
      'scannerPinVerified', v_scanner_device.pin_set_at is not null
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

  if v_stamp_count >= v_event.minimum_stamps_required then
    update public.event_registrations
    set completed_at = coalesce(completed_at, now())
    where id = v_event_registration.id;
  end if;

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

do $$
begin
  revoke execute on function public.scan_stamp_atomic(
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
  ) from public, anon, authenticated;

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
  ) to service_role;

  revoke execute on function public.scan_stamp_atomic(
    uuid,
    uuid,
    text,
    uuid,
    uuid,
    text,
    text,
    numeric,
    numeric,
    inet,
    text
  ) from public, anon, authenticated;

  grant execute on function public.scan_stamp_atomic(
    uuid,
    uuid,
    text,
    uuid,
    uuid,
    text,
    text,
    numeric,
    numeric,
    inet,
    text
  ) to service_role;
end
$$;
