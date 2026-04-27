create or replace function public.reject_business_application_atomic(
  p_application_id uuid,
  p_reviewed_by uuid,
  p_rejection_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $reject_business_application_atomic$
declare
  v_application public.business_applications%rowtype;
  v_reason text;
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_reviewed_by
      and primary_role = 'PLATFORM_ADMIN'
      and status = 'ACTIVE'
  ) then
    return jsonb_build_object('status', 'ADMIN_NOT_ALLOWED');
  end if;

  v_reason := nullif(btrim(coalesce(p_rejection_reason, '')), '');

  if v_reason is null then
    return jsonb_build_object('status', 'REJECTION_REASON_REQUIRED');
  end if;

  select * into v_application
  from public.business_applications
  where id = p_application_id
  for update;

  if not found then
    return jsonb_build_object('status', 'APPLICATION_NOT_FOUND');
  end if;

  if v_application.status <> 'PENDING' then
    return jsonb_build_object(
      'status', 'APPLICATION_NOT_PENDING',
      'applicationStatus', v_application.status
    );
  end if;

  update public.business_applications
  set
    status = 'REJECTED',
    reviewed_by = p_reviewed_by,
    reviewed_at = now(),
    rejection_reason = v_reason
  where id = p_application_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_reviewed_by,
    'BUSINESS_APPLICATION_REJECTED',
    'business_applications',
    p_application_id,
    jsonb_build_object('rejectionReason', v_reason)
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'applicationId', p_application_id
  );
end;
$reject_business_application_atomic$;
