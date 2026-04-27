drop policy if exists "students can register themselves" on public.event_registrations;
drop policy if exists "students can cancel own registrations" on public.event_registrations;

create or replace function public.register_event_atomic(
  p_event_id uuid,
  p_student_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $register_event_atomic$
declare
  v_event public.events%rowtype;
  v_profile public.profiles%rowtype;
  v_registration public.event_registrations%rowtype;
  v_registration_id uuid;
  v_registered_count integer;
  v_actor_user_id uuid;
  v_actor_role text;
begin
  v_actor_user_id := auth.uid();
  v_actor_role := auth.role();

  if v_actor_role is distinct from 'service_role' and v_actor_user_id is null then
    return jsonb_build_object('status', 'AUTH_REQUIRED');
  end if;

  if v_actor_role is distinct from 'service_role' and v_actor_user_id <> p_student_id then
    return jsonb_build_object('status', 'ACTOR_NOT_ALLOWED');
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_student_id
  for update;

  if not found then
    return jsonb_build_object('status', 'PROFILE_NOT_FOUND');
  end if;

  if v_profile.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'PROFILE_NOT_ACTIVE');
  end if;

  if v_profile.primary_role <> 'STUDENT' then
    return jsonb_build_object('status', 'ROLE_NOT_ALLOWED');
  end if;

  select *
  into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return jsonb_build_object('status', 'EVENT_NOT_FOUND');
  end if;

  if v_event.visibility <> 'PUBLIC' or v_event.status not in ('PUBLISHED', 'ACTIVE') then
    return jsonb_build_object('status', 'EVENT_NOT_AVAILABLE');
  end if;

  if now() >= v_event.join_deadline_at or now() >= v_event.start_at then
    return jsonb_build_object(
      'status', 'EVENT_REGISTRATION_CLOSED',
      'startAt', v_event.start_at,
      'joinDeadlineAt', v_event.join_deadline_at
    );
  end if;

  select *
  into v_registration
  from public.event_registrations
  where event_id = p_event_id
    and student_id = p_student_id
  for update;

  if found then
    if v_registration.status = 'REGISTERED' then
      return jsonb_build_object(
        'status', 'ALREADY_REGISTERED',
        'registrationId', v_registration.id
      );
    end if;

    if v_registration.status = 'BANNED' then
      return jsonb_build_object('status', 'STUDENT_BANNED');
    end if;
  end if;

  if v_event.max_participants is not null then
    select count(*)
    into v_registered_count
    from public.event_registrations
    where event_id = p_event_id
      and status = 'REGISTERED';

    if v_registered_count >= v_event.max_participants then
      return jsonb_build_object(
        'status', 'EVENT_FULL',
        'maxParticipants', v_event.max_participants,
        'currentRegistrations', v_registered_count
      );
    end if;
  end if;

  if v_registration.id is not null then
    update public.event_registrations
    set
      status = 'REGISTERED',
      registered_at = now(),
      completed_at = null
    where id = v_registration.id
    returning id into v_registration_id;
  else
    insert into public.event_registrations (
      event_id,
      student_id,
      status
    )
    values (
      p_event_id,
      p_student_id,
      'REGISTERED'
    )
    returning id into v_registration_id;
  end if;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_student_id,
    'EVENT_REGISTERED',
    'event_registrations',
    v_registration_id,
    jsonb_build_object('eventId', p_event_id, 'studentId', p_student_id, 'sourceRole', coalesce(v_actor_role, 'unknown'))
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'registrationId', v_registration_id
  );
end;
$register_event_atomic$;
