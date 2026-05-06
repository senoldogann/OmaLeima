alter table public.business_scanner_devices
  add column if not exists device_model text;

comment on column public.business_scanner_devices.device_model is 'Optional physical scanner device model reported by the mobile app.';

drop function if exists public.provision_business_scanner_device_atomic(text, uuid, uuid, text, text, text, uuid);

create or replace function public.provision_business_scanner_device_atomic(
  p_jti text,
  p_business_id uuid,
  p_scanner_user_id uuid,
  p_installation_id text,
  p_label text,
  p_platform text,
  p_device_model text,
  p_issued_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $provision_business_scanner_device_atomic$
declare
  v_grant public.business_scanner_login_grants%rowtype;
  v_device public.business_scanner_devices%rowtype;
  v_device_model text := nullif(trim(coalesce(p_device_model, '')), '');
  v_installation_id text := nullif(trim(p_installation_id), '');
  v_label text := nullif(trim(coalesce(p_label, '')), '');
  v_platform text := upper(nullif(trim(coalesce(p_platform, '')), ''));
begin
  if p_jti is null or length(trim(p_jti)) = 0 then
    return jsonb_build_object('status', 'QR_INVALID');
  end if;

  if v_installation_id is null then
    return jsonb_build_object('status', 'INSTALLATION_ID_REQUIRED');
  end if;

  if length(v_installation_id) > 128 then
    return jsonb_build_object('status', 'INSTALLATION_ID_TOO_LONG');
  end if;

  if v_device_model is not null and length(v_device_model) > 120 then
    v_device_model := left(v_device_model, 120);
  end if;

  if v_platform is null or v_platform not in ('IOS', 'ANDROID', 'WEB') then
    v_platform := 'UNKNOWN';
  end if;

  if v_label is null then
    select b.name || ' scanner' into v_label
    from public.businesses b
    where b.id = p_business_id;
  end if;

  if v_label is null then
    v_label := 'OmaLeima scanner';
  end if;

  if length(v_label) > 80 then
    v_label := left(v_label, 80);
  end if;

  select * into v_grant
  from public.business_scanner_login_grants
  where jti = p_jti
  for update;

  if not found then
    return jsonb_build_object('status', 'QR_NOT_FOUND');
  end if;

  if v_grant.business_id <> p_business_id or v_grant.issued_by <> p_issued_by then
    return jsonb_build_object('status', 'QR_CONTEXT_MISMATCH');
  end if;

  if v_grant.expires_at <= now() then
    return jsonb_build_object('status', 'QR_EXPIRED');
  end if;

  if v_grant.consumed_at is not null then
    return jsonb_build_object('status', 'QR_ALREADY_USED');
  end if;

  if not exists (
    select 1
    from public.business_staff bs
    join public.profiles p on p.id = bs.user_id
    join public.businesses b on b.id = bs.business_id
    where bs.business_id = p_business_id
      and bs.user_id = p_issued_by
      and bs.role in ('OWNER', 'MANAGER')
      and bs.status = 'ACTIVE'
      and p.status = 'ACTIVE'
      and b.status = 'ACTIVE'
  ) then
    return jsonb_build_object('status', 'ACTOR_NOT_ALLOWED');
  end if;

  update public.profiles
  set primary_role = 'BUSINESS_STAFF',
      status = 'ACTIVE',
      display_name = coalesce(display_name, v_label),
      updated_at = now()
  where id = p_scanner_user_id;

  if not found then
    return jsonb_build_object('status', 'PROFILE_NOT_FOUND');
  end if;

  insert into public.business_staff (
    business_id,
    user_id,
    role,
    status,
    invited_by
  )
  values (
    p_business_id,
    p_scanner_user_id,
    'SCANNER',
    'ACTIVE',
    p_issued_by
  )
  on conflict (business_id, user_id) do update
  set
    role = 'SCANNER',
    status = 'ACTIVE',
    invited_by = excluded.invited_by;

  select * into v_device
  from public.business_scanner_devices
  where business_id = p_business_id
    and installation_id = v_installation_id
  for update;

  if found then
    update public.business_scanner_devices
    set label = v_label,
        platform = v_platform,
        device_model = coalesce(v_device_model, device_model),
        status = 'ACTIVE',
        scanner_user_id = p_scanner_user_id,
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
      device_model,
      status,
      created_by,
      scanner_user_id
    )
    values (
      p_business_id,
      v_installation_id,
      v_label,
      v_platform,
      v_device_model,
      'ACTIVE',
      p_issued_by,
      p_scanner_user_id
    )
    returning * into v_device;
  end if;

  update public.business_scanner_login_grants
  set consumed_by = p_scanner_user_id,
      consumed_at = now()
  where jti = p_jti;

  return jsonb_build_object(
    'status', 'SUCCESS',
    'businessId', p_business_id,
    'scannerDeviceId', v_device.id,
    'label', v_device.label,
    'platform', v_device.platform,
    'pinRequired', v_device.pin_set_at is not null
  );
end;
$provision_business_scanner_device_atomic$;

grant execute on function public.provision_business_scanner_device_atomic(text, uuid, uuid, text, text, text, text, uuid) to authenticated;

drop function if exists public.register_business_scanner_device(uuid, text, text, text);

create or replace function public.register_business_scanner_device(
  p_business_id uuid,
  p_installation_id text,
  p_label text,
  p_platform text,
  p_device_model text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $register_business_scanner_device$
declare
  v_device public.business_scanner_devices%rowtype;
  v_device_model text := nullif(trim(coalesce(p_device_model, '')), '');
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

  if v_device_model is not null and length(v_device_model) > 120 then
    v_device_model := left(v_device_model, 120);
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

  if found and v_device.scanner_user_id is not null and v_device.scanner_user_id <> auth.uid() then
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
        device_model = coalesce(v_device_model, device_model),
        status = 'ACTIVE',
        scanner_user_id = coalesce(scanner_user_id, auth.uid()),
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
      device_model,
      status,
      created_by,
      scanner_user_id
    )
    values (
      p_business_id,
      v_installation_id,
      v_label,
      v_platform,
      v_device_model,
      'ACTIVE',
      auth.uid(),
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

grant execute on function public.register_business_scanner_device(uuid, text, text, text, text) to authenticated;
