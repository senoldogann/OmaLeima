create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_status text;
begin
  v_email := coalesce(new.email, 'anonymous-' || new.id::text || '@scanner.omaleima.local');
  v_status := case when new.email is null then 'SUSPENDED' else 'ACTIVE' end;

  insert into public.profiles (
    id,
    email,
    display_name,
    avatar_url,
    status
  )
  values (
    new.id,
    v_email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    v_status
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

insert into public.profiles (
  id,
  email,
  display_name,
  avatar_url,
  status
)
select
  au.id,
  coalesce(au.email, 'anonymous-' || au.id::text || '@scanner.omaleima.local'),
  coalesce(au.raw_user_meta_data ->> 'full_name', au.raw_user_meta_data ->> 'name'),
  au.raw_user_meta_data ->> 'avatar_url',
  case when au.email is null then 'SUSPENDED' else 'ACTIVE' end
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null
on conflict (id) do update
set
  email = excluded.email,
  display_name = coalesce(excluded.display_name, public.profiles.display_name),
  avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
  updated_at = now();

alter table public.business_scanner_devices
  add column if not exists scanner_user_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_business_scanner_devices_scanner_user
  on public.business_scanner_devices(scanner_user_id)
  where scanner_user_id is not null;

create table if not exists public.business_scanner_login_grants (
  jti text primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  issued_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_by uuid references public.profiles(id) on delete set null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (consumed_at is null or consumed_at >= created_at)
);

create index if not exists idx_business_scanner_login_grants_business
  on public.business_scanner_login_grants(business_id, expires_at desc);

alter table public.business_scanner_login_grants enable row level security;

drop policy if exists "business_scanner_login_grants_service_only" on public.business_scanner_login_grants;

create policy "business_scanner_login_grants_service_only"
  on public.business_scanner_login_grants
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

alter table public.qr_token_uses
  alter column scanner_user_id drop not null;

alter table public.stamps
  alter column scanner_user_id drop not null;

do $$
declare
  v_constraint_name text;
begin
  select con.conname into v_constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  join unnest(con.conkey) with ordinality as column_key(attnum, ordinality) on true
  join pg_attribute att on att.attrelid = rel.oid and att.attnum = column_key.attnum
  where nsp.nspname = 'public'
    and rel.relname = 'qr_token_uses'
    and att.attname = 'scanner_user_id'
    and con.contype = 'f'
  limit 1;

  if v_constraint_name is not null then
    execute format('alter table public.qr_token_uses drop constraint %I', v_constraint_name);
  end if;

  alter table public.qr_token_uses
    add constraint qr_token_uses_scanner_user_id_fkey
    foreign key (scanner_user_id)
    references public.profiles(id)
    on delete set null;
end $$;

do $$
declare
  v_constraint_name text;
begin
  select con.conname into v_constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  join unnest(con.conkey) with ordinality as column_key(attnum, ordinality) on true
  join pg_attribute att on att.attrelid = rel.oid and att.attnum = column_key.attnum
  where nsp.nspname = 'public'
    and rel.relname = 'stamps'
    and att.attname = 'scanner_user_id'
    and con.contype = 'f'
  limit 1;

  if v_constraint_name is not null then
    execute format('alter table public.stamps drop constraint %I', v_constraint_name);
  end if;

  alter table public.stamps
    add constraint stamps_scanner_user_id_fkey
    foreign key (scanner_user_id)
    references public.profiles(id)
    on delete set null;
end $$;

do $$
declare
  v_constraint_name text;
begin
  select con.conname into v_constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  join unnest(con.conkey) with ordinality as column_key(attnum, ordinality) on true
  join pg_attribute att on att.attrelid = rel.oid and att.attnum = column_key.attnum
  where nsp.nspname = 'public'
    and rel.relname = 'fraud_signals'
    and att.attname = 'scanner_user_id'
    and con.contype = 'f'
  limit 1;

  if v_constraint_name is not null then
    execute format('alter table public.fraud_signals drop constraint %I', v_constraint_name);
  end if;

  alter table public.fraud_signals
    add constraint fraud_signals_scanner_user_id_fkey
    foreign key (scanner_user_id)
    references public.profiles(id)
    on delete set null;
end $$;

do $$
declare
  v_constraint_name text;
begin
  select con.conname into v_constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  join unnest(con.conkey) with ordinality as column_key(attnum, ordinality) on true
  join pg_attribute att on att.attrelid = rel.oid and att.attnum = column_key.attnum
  where nsp.nspname = 'public'
    and rel.relname = 'audit_logs'
    and att.attname = 'actor_user_id'
    and con.contype = 'f'
  limit 1;

  if v_constraint_name is not null then
    execute format('alter table public.audit_logs drop constraint %I', v_constraint_name);
  end if;

  alter table public.audit_logs
    add constraint audit_logs_actor_user_id_fkey
    foreign key (actor_user_id)
    references public.profiles(id)
    on delete set null;
end $$;

create or replace function public.provision_business_scanner_device_atomic(
  p_jti text,
  p_business_id uuid,
  p_scanner_user_id uuid,
  p_installation_id text,
  p_label text,
  p_platform text,
  p_issued_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grant public.business_scanner_login_grants%rowtype;
  v_device public.business_scanner_devices%rowtype;
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
      status,
      created_by,
      scanner_user_id
    )
    values (
      p_business_id,
      v_installation_id,
      v_label,
      v_platform,
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
$$;
