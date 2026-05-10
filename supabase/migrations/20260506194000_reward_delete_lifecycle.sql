do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.reward_tiers'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%status%'
      and pg_get_constraintdef(oid) like '%ACTIVE%'
      and pg_get_constraintdef(oid) like '%DISABLED%'
  loop
    execute format('alter table public.reward_tiers drop constraint %I', v_constraint.conname);
  end loop;

  alter table public.reward_tiers
  add constraint reward_tiers_status_check
  check (status in ('ACTIVE', 'DISABLED', 'DELETED'));
end $$;

create or replace function public.delete_reward_tier_atomic(
  p_reward_tier_id uuid,
  p_deleted_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $delete_reward_tier_atomic$
declare
  v_actor_user_id uuid;
  v_actor_role text;
  v_profile public.profiles%rowtype;
  v_event public.events%rowtype;
  v_reward_tier public.reward_tiers%rowtype;
begin
  v_actor_user_id := auth.uid();
  v_actor_role := auth.role();

  if v_actor_role is distinct from 'service_role' and v_actor_user_id is null then
    return jsonb_build_object('status', 'AUTH_REQUIRED');
  end if;

  if v_actor_role is distinct from 'service_role' and v_actor_user_id <> p_deleted_by then
    return jsonb_build_object('status', 'ACTOR_NOT_ALLOWED');
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_deleted_by
  for update;

  if not found then
    return jsonb_build_object('status', 'PROFILE_NOT_FOUND');
  end if;

  if v_profile.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'PROFILE_NOT_ACTIVE');
  end if;

  select *
  into v_reward_tier
  from public.reward_tiers
  where id = p_reward_tier_id
  for update;

  if not found then
    return jsonb_build_object('status', 'REWARD_TIER_NOT_FOUND');
  end if;

  if v_reward_tier.status = 'DELETED' then
    return jsonb_build_object('status', 'REWARD_TIER_ALREADY_DELETED');
  end if;

  select *
  into v_event
  from public.events
  where id = v_reward_tier.event_id
  for update;

  if not found then
    return jsonb_build_object('status', 'EVENT_NOT_FOUND');
  end if;

  if v_actor_role is distinct from 'service_role'
    and not public.is_platform_admin()
    and not public.is_club_event_editor_for(v_event.club_id) then
    return jsonb_build_object('status', 'REWARD_TIER_EDITOR_NOT_ALLOWED');
  end if;

  update public.reward_tiers
  set status = 'DELETED'
  where id = p_reward_tier_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_deleted_by,
    'REWARD_TIER_DELETED',
    'reward_tiers',
    p_reward_tier_id,
    jsonb_build_object(
      'eventId', v_event.id,
      'previousStatus', v_reward_tier.status
    )
  );

  return jsonb_build_object(
    'status', 'REWARD_TIER_DELETED',
    'rewardTierId', p_reward_tier_id
  );
end;
$delete_reward_tier_atomic$;

revoke execute on function public.delete_reward_tier_atomic(uuid, uuid) from public, anon;
grant execute on function public.delete_reward_tier_atomic(uuid, uuid) to authenticated, service_role;
