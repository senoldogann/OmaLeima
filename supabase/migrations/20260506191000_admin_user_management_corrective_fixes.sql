create or replace function public.admin_create_business_owner_account_atomic(
  p_admin_user_id uuid,
  p_owner_user_id uuid,
  p_business_name text,
  p_owner_name text,
  p_owner_email text,
  p_contact_email text,
  p_phone text,
  p_address text,
  p_city text,
  p_country text,
  p_website_url text,
  p_instagram_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $admin_create_business_owner_account_atomic$
declare
  v_application_id uuid;
  v_business_id uuid;
  v_owner_profile public.profiles%rowtype;
  v_slug_base text;
  v_slug_candidate text;
  v_slug_suffix integer := 2;
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = p_admin_user_id
      and p.primary_role = 'PLATFORM_ADMIN'
      and p.status = 'ACTIVE'
  ) then
    return jsonb_build_object('status', 'ADMIN_NOT_ALLOWED');
  end if;

  select *
  into v_owner_profile
  from public.profiles p
  where p.id = p_owner_user_id
    and lower(p.email) = lower(p_owner_email)
  for update;

  if not found then
    return jsonb_build_object('status', 'OWNER_PROFILE_NOT_FOUND');
  end if;

  if v_owner_profile.primary_role <> 'STUDENT'
    or exists (
      select 1
      from public.business_staff bs
      where bs.user_id = p_owner_user_id
    )
    or exists (
      select 1
      from public.club_members cm
      where cm.user_id = p_owner_user_id
    )
  then
    return jsonb_build_object('status', 'OWNER_PROFILE_NOT_ELIGIBLE');
  end if;

  v_slug_base := regexp_replace(
    translate(lower(coalesce(p_business_name, '')), 'åäö', 'aao'),
    '[^a-z0-9]+',
    '-',
    'g'
  );
  v_slug_base := regexp_replace(v_slug_base, '(^-+|-+$)', '', 'g');

  if v_slug_base = '' then
    v_slug_base := 'business';
  end if;

  v_slug_candidate := v_slug_base;

  while exists (
    select 1
    from public.businesses
    where slug = v_slug_candidate
  ) loop
    v_slug_candidate := v_slug_base || '-' || v_slug_suffix::text;
    v_slug_suffix := v_slug_suffix + 1;
  end loop;

  insert into public.business_applications (
    business_name,
    contact_name,
    contact_email,
    phone,
    address,
    city,
    country,
    website_url,
    instagram_url,
    message,
    status,
    reviewed_by,
    reviewed_at
  )
  values (
    p_business_name,
    p_owner_name,
    p_contact_email,
    nullif(p_phone, ''),
    p_address,
    p_city,
    p_country,
    nullif(p_website_url, ''),
    nullif(p_instagram_url, ''),
    'Created directly by platform admin.',
    'APPROVED',
    p_admin_user_id,
    now()
  )
  returning id into v_application_id;

  insert into public.businesses (
    name,
    slug,
    contact_email,
    phone,
    address,
    city,
    country,
    website_url,
    instagram_url,
    application_id
  )
  values (
    p_business_name,
    v_slug_candidate,
    p_contact_email,
    nullif(p_phone, ''),
    p_address,
    p_city,
    p_country,
    nullif(p_website_url, ''),
    nullif(p_instagram_url, ''),
    v_application_id
  )
  returning id into v_business_id;

  update public.profiles
  set
    display_name = nullif(p_owner_name, ''),
    primary_role = 'BUSINESS_OWNER',
    status = 'ACTIVE',
    updated_at = now()
  where id = p_owner_user_id;

  insert into public.business_staff (
    business_id,
    user_id,
    role,
    status,
    invited_by
  )
  values (
    v_business_id,
    p_owner_user_id,
    'OWNER',
    'ACTIVE',
    p_admin_user_id
  );

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_admin_user_id,
    'BUSINESS_OWNER_ACCOUNT_CREATED',
    'businesses',
    v_business_id,
    jsonb_build_object(
      'applicationId', v_application_id,
      'ownerUserId', p_owner_user_id,
      'ownerEmail', p_owner_email,
      'businessSlug', v_slug_candidate
    )
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'applicationId', v_application_id,
    'businessId', v_business_id,
    'businessSlug', v_slug_candidate,
    'ownerUserId', p_owner_user_id
  );
exception
  when unique_violation then
    return jsonb_build_object('status', 'BUSINESS_ACCOUNT_CONFLICT');
end;
$admin_create_business_owner_account_atomic$;

create or replace function public.admin_update_profile_status_atomic(
  p_admin_user_id uuid,
  p_target_user_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $admin_update_profile_status_atomic$
declare
  v_target_profile public.profiles%rowtype;
begin
  if p_status not in ('ACTIVE', 'SUSPENDED') then
    return jsonb_build_object('status', 'INVALID_PROFILE_STATUS');
  end if;

  if p_admin_user_id = p_target_user_id then
    return jsonb_build_object('status', 'SELF_STATUS_CHANGE_BLOCKED');
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_admin_user_id
      and p.primary_role = 'PLATFORM_ADMIN'
      and p.status = 'ACTIVE'
  ) then
    return jsonb_build_object('status', 'ADMIN_NOT_ALLOWED');
  end if;

  select *
  into v_target_profile
  from public.profiles
  where id = p_target_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'USER_NOT_FOUND');
  end if;

  if v_target_profile.status = 'DELETED' then
    return jsonb_build_object('status', 'DELETED_PROFILE_NOT_MUTABLE');
  end if;

  update public.profiles
  set
    status = p_status,
    updated_at = now()
  where id = p_target_user_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_admin_user_id,
    case when p_status = 'ACTIVE' then 'USER_PROFILE_ACTIVATED' else 'USER_PROFILE_SUSPENDED' end,
    'profiles',
    p_target_user_id,
    jsonb_build_object(
      'previousStatus', v_target_profile.status,
      'status', p_status,
      'targetUserId', p_target_user_id
    )
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'targetUserId', p_target_user_id,
    'profileStatus', p_status,
    'message', case when p_status = 'ACTIVE' then 'User activated.' else 'User set to passive.' end
  );
end;
$admin_update_profile_status_atomic$;

revoke all on function public.admin_update_profile_status_atomic(uuid, uuid, text) from public;
revoke all on function public.admin_update_profile_status_atomic(uuid, uuid, text) from anon;
revoke all on function public.admin_update_profile_status_atomic(uuid, uuid, text) from authenticated;
grant execute on function public.admin_update_profile_status_atomic(uuid, uuid, text) to service_role;

revoke all on function public.admin_create_business_owner_account_atomic(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public;

revoke all on function public.admin_create_business_owner_account_atomic(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from anon;

revoke all on function public.admin_create_business_owner_account_atomic(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from authenticated;

grant execute on function public.admin_create_business_owner_account_atomic(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;
