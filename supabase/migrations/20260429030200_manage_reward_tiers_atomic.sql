create or replace function public.create_reward_tier_atomic(
  p_event_id uuid,
  p_title text,
  p_description text,
  p_required_stamp_count integer,
  p_reward_type text,
  p_inventory_total integer,
  p_claim_instructions text,
  p_created_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $create_reward_tier_atomic$
declare
  v_actor_user_id uuid;
  v_actor_role text;
  v_profile public.profiles%rowtype;
  v_event public.events%rowtype;
  v_reward_tier_id uuid;
begin
  v_actor_user_id := auth.uid();
  v_actor_role := auth.role();

  if v_actor_role is distinct from 'service_role' and v_actor_user_id is null then
    return jsonb_build_object('status', 'AUTH_REQUIRED');
  end if;

  if v_actor_role is distinct from 'service_role' and v_actor_user_id <> p_created_by then
    return jsonb_build_object('status', 'ACTOR_NOT_ALLOWED');
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_created_by
  for update;

  if not found then
    return jsonb_build_object('status', 'PROFILE_NOT_FOUND');
  end if;

  if v_profile.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'PROFILE_NOT_ACTIVE');
  end if;

  select *
  into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return jsonb_build_object('status', 'EVENT_NOT_FOUND');
  end if;

  if v_actor_role is distinct from 'service_role'
    and not public.is_platform_admin()
    and not public.is_club_event_editor_for(v_event.club_id) then
    return jsonb_build_object('status', 'REWARD_TIER_EDITOR_NOT_ALLOWED');
  end if;

  if v_event.status not in ('DRAFT', 'PUBLISHED', 'ACTIVE') then
    return jsonb_build_object('status', 'EVENT_NOT_EDITABLE');
  end if;

  if btrim(p_title) = '' then
    return jsonb_build_object('status', 'REWARD_TITLE_REQUIRED');
  end if;

  if p_required_stamp_count <= 0 then
    return jsonb_build_object('status', 'REWARD_REQUIRED_STAMPS_INVALID');
  end if;

  if p_reward_type not in ('HAALARIMERKKI', 'PATCH', 'COUPON', 'PRODUCT', 'ENTRY', 'OTHER') then
    return jsonb_build_object('status', 'REWARD_TYPE_INVALID');
  end if;

  if p_inventory_total is not null and p_inventory_total < 0 then
    return jsonb_build_object('status', 'REWARD_INVENTORY_TOTAL_INVALID');
  end if;

  insert into public.reward_tiers (
    event_id,
    title,
    description,
    required_stamp_count,
    reward_type,
    inventory_total,
    claim_instructions
  )
  values (
    p_event_id,
    btrim(p_title),
    nullif(btrim(p_description), ''),
    p_required_stamp_count,
    p_reward_type,
    p_inventory_total,
    nullif(btrim(p_claim_instructions), '')
  )
  returning id into v_reward_tier_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_created_by,
    'REWARD_TIER_CREATED',
    'reward_tiers',
    v_reward_tier_id,
    jsonb_build_object('eventId', p_event_id, 'rewardType', p_reward_type)
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'rewardTierId', v_reward_tier_id
  );
end;
$create_reward_tier_atomic$;
