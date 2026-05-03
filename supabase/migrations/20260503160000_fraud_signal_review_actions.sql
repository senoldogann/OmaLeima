alter table public.fraud_signals
add column if not exists reviewed_by uuid references public.profiles(id),
add column if not exists reviewed_at timestamptz,
add column if not exists resolution_note text;

create or replace function public.review_fraud_signal_atomic(
  p_signal_id uuid,
  p_status text,
  p_resolution_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $review_fraud_signal_atomic$
declare
  v_actor_user_id uuid := auth.uid();
  v_signal public.fraud_signals%rowtype;
  v_note text := nullif(left(btrim(coalesce(p_resolution_note, '')), 500), '');
  v_status text := upper(btrim(coalesce(p_status, '')));
begin
  if v_actor_user_id is null then
    return jsonb_build_object('status', 'AUTH_REQUIRED');
  end if;

  if p_signal_id is null then
    return jsonb_build_object('status', 'FRAUD_SIGNAL_NOT_FOUND');
  end if;

  if v_status not in ('REVIEWED', 'DISMISSED', 'CONFIRMED') then
    return jsonb_build_object('status', 'FRAUD_SIGNAL_STATUS_INVALID');
  end if;

  select *
  into v_signal
  from public.fraud_signals
  where id = p_signal_id
  for update;

  if not found then
    return jsonb_build_object('status', 'FRAUD_SIGNAL_NOT_FOUND');
  end if;

  if v_signal.status <> 'OPEN' then
    return jsonb_build_object(
      'status', 'FRAUD_SIGNAL_ALREADY_REVIEWED',
      'currentStatus', v_signal.status
    );
  end if;

  if not public.is_platform_admin()
    and (
      v_signal.event_id is null
      or not public.can_user_manage_event(v_signal.event_id)
    )
  then
    return jsonb_build_object('status', 'FRAUD_SIGNAL_NOT_ALLOWED');
  end if;

  update public.fraud_signals
  set
    status = v_status,
    reviewed_by = v_actor_user_id,
    reviewed_at = now(),
    resolution_note = v_note
  where id = v_signal.id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    v_actor_user_id,
    'FRAUD_SIGNAL_REVIEWED',
    'fraud_signal',
    v_signal.id,
    jsonb_build_object(
      'eventId', v_signal.event_id,
      'businessId', v_signal.business_id,
      'scannerUserId', v_signal.scanner_user_id,
      'fraudType', v_signal.type,
      'previousStatus', v_signal.status,
      'nextStatus', v_status,
      'resolutionNote', v_note
    )
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'fraudSignalId', v_signal.id,
    'nextStatus', v_status
  );
end;
$review_fraud_signal_atomic$;

revoke all on function public.review_fraud_signal_atomic(uuid, text, text) from public;
revoke all on function public.review_fraud_signal_atomic(uuid, text, text) from anon;
grant execute on function public.review_fraud_signal_atomic(uuid, text, text) to authenticated;
