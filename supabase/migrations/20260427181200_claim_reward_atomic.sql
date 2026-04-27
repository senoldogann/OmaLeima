create or replace function public.claim_reward_atomic(
  p_event_id uuid,
  p_student_id uuid,
  p_reward_tier_id uuid,
  p_claimed_by uuid,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $claim_reward_atomic$
declare
  v_reward_tier public.reward_tiers%rowtype;
  v_stamp_count integer;
  v_reward_claim_id uuid;
begin
  if not exists (
    select 1
    from public.events e
    join public.club_members cm on cm.club_id = e.club_id
    where e.id = p_event_id
      and cm.user_id = p_claimed_by
      and cm.status = 'ACTIVE'
  ) and not exists (
    select 1
    from public.profiles
    where id = p_claimed_by
      and primary_role = 'PLATFORM_ADMIN'
      and status = 'ACTIVE'
  ) then
    return jsonb_build_object('status', 'CLAIMER_NOT_ALLOWED');
  end if;

  select * into v_reward_tier
  from public.reward_tiers
  where id = p_reward_tier_id
    and event_id = p_event_id
    and status = 'ACTIVE'
  for update;

  if not found then
    return jsonb_build_object('status', 'REWARD_TIER_NOT_FOUND');
  end if;

  select count(*) into v_stamp_count
  from public.stamps
  where event_id = p_event_id
    and student_id = p_student_id
    and validation_status = 'VALID';

  if v_stamp_count < v_reward_tier.required_stamp_count then
    return jsonb_build_object(
      'status', 'NOT_ENOUGH_STAMPS',
      'requiredStampCount', v_reward_tier.required_stamp_count,
      'stampCount', v_stamp_count
    );
  end if;

  if v_reward_tier.inventory_total is not null
    and v_reward_tier.inventory_claimed >= v_reward_tier.inventory_total then
    return jsonb_build_object('status', 'REWARD_OUT_OF_STOCK');
  end if;

  insert into public.reward_claims (
    event_id,
    student_id,
    reward_tier_id,
    claimed_by,
    notes
  )
  values (
    p_event_id,
    p_student_id,
    p_reward_tier_id,
    p_claimed_by,
    p_notes
  )
  returning id into v_reward_claim_id;

  update public.reward_tiers
  set inventory_claimed = inventory_claimed + 1
  where id = p_reward_tier_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_claimed_by,
    'REWARD_CLAIMED',
    'reward_claims',
    v_reward_claim_id,
    jsonb_build_object('eventId', p_event_id, 'studentId', p_student_id, 'rewardTierId', p_reward_tier_id)
  );

  return jsonb_build_object('status', 'SUCCESS', 'rewardClaimId', v_reward_claim_id);
exception
  when unique_violation then
    return jsonb_build_object('status', 'REWARD_ALREADY_CLAIMED');
end;
$claim_reward_atomic$;
