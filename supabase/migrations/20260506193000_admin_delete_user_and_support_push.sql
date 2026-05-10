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
  v_anonymized_email text;
  v_target_profile public.profiles%rowtype;
begin
  if p_status not in ('ACTIVE', 'SUSPENDED', 'DELETED') then
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

  if p_status = 'DELETED' then
    v_anonymized_email := concat(
      'deleted-',
      replace(p_target_user_id::text, '-', ''),
      '@deleted.omaleima.invalid'
    );

    update public.profiles
    set
      avatar_url = null,
      display_name = null,
      email = v_anonymized_email,
      status = 'DELETED',
      updated_at = now()
    where id = p_target_user_id;

    update public.device_tokens
    set enabled = false
    where user_id = p_target_user_id;

    update public.business_staff
    set status = 'DISABLED'
    where user_id = p_target_user_id;

    update public.club_members
    set status = 'DISABLED'
    where user_id = p_target_user_id;

    delete from public.profile_department_tags
    where profile_id = p_target_user_id;

    insert into public.audit_logs (
      actor_user_id,
      action,
      resource_type,
      resource_id,
      metadata
    )
    values (
      p_admin_user_id,
      'USER_PROFILE_DELETED',
      'profiles',
      p_target_user_id,
      jsonb_build_object(
        'previousPrimaryRole', v_target_profile.primary_role,
        'previousStatus', v_target_profile.status,
        'status', 'DELETED',
        'targetUserId', p_target_user_id
      )
    );

    return jsonb_build_object(
      'status', 'SUCCESS',
      'targetUserId', p_target_user_id,
      'profileStatus', 'DELETED',
      'message', 'User account deleted and anonymized.'
    );
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
