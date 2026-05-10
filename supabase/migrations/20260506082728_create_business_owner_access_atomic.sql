create or replace function public.create_business_owner_access_atomic(
  p_business_id uuid,
  p_owner_user_id uuid,
  p_admin_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses%rowtype;
  v_owner_profile public.profiles%rowtype;
  v_actor_role text;
begin
  v_actor_role := auth.role();

  if v_actor_role is distinct from 'service_role' and auth.uid() is distinct from p_admin_user_id then
    return jsonb_build_object('status', 'ADMIN_NOT_ALLOWED');
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
  into v_business
  from public.businesses
  where id = p_business_id
  for update;

  if not found then
    return jsonb_build_object('status', 'BUSINESS_NOT_FOUND');
  end if;

  if v_business.status <> 'ACTIVE' then
    return jsonb_build_object(
      'status', 'BUSINESS_NOT_ACTIVE',
      'businessStatus', v_business.status
    );
  end if;

  select *
  into v_owner_profile
  from public.profiles
  where id = p_owner_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'OWNER_PROFILE_NOT_FOUND');
  end if;

  update public.profiles
  set primary_role = 'BUSINESS_OWNER',
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
    p_business_id,
    p_owner_user_id,
    'OWNER',
    'ACTIVE',
    p_admin_user_id
  )
  on conflict (business_id, user_id) do update
  set
    role = 'OWNER',
    status = 'ACTIVE',
    invited_by = excluded.invited_by;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_admin_user_id,
    'BUSINESS_OWNER_ACCESS_CREATED',
    'businesses',
    p_business_id,
    jsonb_build_object(
      'ownerUserId', p_owner_user_id,
      'businessName', v_business.name
    )
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'businessId', p_business_id,
    'ownerUserId', p_owner_user_id
  );
end;
$$;
