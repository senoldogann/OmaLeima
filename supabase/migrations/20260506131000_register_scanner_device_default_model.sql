create or replace function public.register_business_scanner_device(
  p_business_id uuid,
  p_installation_id text,
  p_label text,
  p_platform text,
  p_device_model text default null
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
