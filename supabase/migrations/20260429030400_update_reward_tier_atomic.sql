create or replace function public.update_reward_tier_atomic(
  p_reward_tier_id uuid,
  p_title text,
  p_description text,
  p_required_stamp_count integer,
  p_reward_type text,
  p_inventory_total integer,
  p_claim_instructions text,
  p_status text,
  p_updated_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $update_reward_tier_atomic$
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

  if v_actor_role is distinct from 'service_role' and v_actor_user_id <> p_updated_by then
    return jsonb_build_object('status', 'ACTOR_NOT_ALLOWED');
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_updated_by
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

  if p_status not in ('ACTIVE', 'DISABLED') then
    return jsonb_build_object('status', 'REWARD_STATUS_INVALID');
  end if;

  if p_inventory_total is not null and p_inventory_total < 0 then
    return jsonb_build_object('status', 'REWARD_INVENTORY_TOTAL_INVALID');
  end if;

  if p_inventory_total is not null and p_inventory_total < v_reward_tier.inventory_claimed then
    return jsonb_build_object(
      'status', 'REWARD_INVENTORY_CONFLICT',
      'inventoryClaimed', v_reward_tier.inventory_claimed
    );
  end if;

  update public.reward_tiers
  set
    title = btrim(p_title),
    description = nullif(btrim(p_description), ''),
    required_stamp_count = p_required_stamp_count,
    reward_type = p_reward_type,
    inventory_total = p_inventory_total,
    claim_instructions = nullif(btrim(p_claim_instructions), ''),
    status = p_status
  where id = p_reward_tier_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_updated_by,
    'REWARD_TIER_UPDATED',
    'reward_tiers',
    p_reward_tier_id,
    jsonb_build_object('eventId', v_event.id, 'rewardType', p_reward_type, 'status', p_status)
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'rewardTierId', p_reward_tier_id
  );
end;
$update_reward_tier_atomic$;
