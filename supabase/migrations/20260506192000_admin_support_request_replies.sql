do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'support_requests'
  ) then
    alter publication supabase_realtime add table public.support_requests;
  end if;
end $$;

create or replace function public.admin_reply_support_request_atomic(
  p_admin_user_id uuid,
  p_support_request_id uuid,
  p_admin_reply text,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $admin_reply_support_request_atomic$
declare
  v_reply text := btrim(p_admin_reply);
  v_request public.support_requests%rowtype;
begin
  if p_status not in ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') then
    return jsonb_build_object('status', 'INVALID_SUPPORT_REQUEST_STATUS');
  end if;

  if v_reply is null or char_length(v_reply) not between 2 and 2000 then
    return jsonb_build_object('status', 'INVALID_SUPPORT_REPLY');
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
  into v_request
  from public.support_requests
  where id = p_support_request_id
  for update;

  if not found then
    return jsonb_build_object('status', 'SUPPORT_REQUEST_NOT_FOUND');
  end if;

  update public.support_requests
  set
    admin_reply = v_reply,
    status = p_status,
    resolved_at = case
      when p_status in ('RESOLVED', 'CLOSED') then now()
      else null
    end
  where id = p_support_request_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_admin_user_id,
    'SUPPORT_REQUEST_REPLIED',
    'support_requests',
    p_support_request_id,
    jsonb_build_object(
      'area', v_request.area,
      'businessId', v_request.business_id,
      'clubId', v_request.club_id,
      'hasPreviousReply', v_request.admin_reply is not null,
      'previousStatus', v_request.status,
      'status', p_status,
      'userId', v_request.user_id
    )
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'message', 'Support reply saved.',
    'supportRequestId', p_support_request_id,
    'supportRequestStatus', p_status
  );
end;
$admin_reply_support_request_atomic$;

revoke all on function public.admin_reply_support_request_atomic(uuid, uuid, text, text) from public;
revoke all on function public.admin_reply_support_request_atomic(uuid, uuid, text, text) from anon;
revoke all on function public.admin_reply_support_request_atomic(uuid, uuid, text, text) from authenticated;
grant execute on function public.admin_reply_support_request_atomic(uuid, uuid, text, text) to service_role;
