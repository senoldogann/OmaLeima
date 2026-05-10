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
  v_actor_user_id uuid;
  v_actor_role text;
  v_reward_tier public.reward_tiers%rowtype;
  v_stamp_count integer;
  v_reward_claim_id uuid;
begin
  v_actor_user_id := auth.uid();
  v_actor_role := auth.role();

  if v_actor_role is distinct from 'service_role' then
    if v_actor_user_id is null then
      return jsonb_build_object('status', 'AUTH_REQUIRED');
    end if;

    if v_actor_user_id <> p_claimed_by then
      return jsonb_build_object('status', 'CLAIMER_NOT_ALLOWED');
    end if;
  end if;

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

revoke execute on function public.approve_business_application_atomic(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.reject_business_application_atomic(uuid, uuid, text) from public, anon, authenticated;

grant execute on function public.approve_business_application_atomic(uuid, uuid) to service_role;
grant execute on function public.reject_business_application_atomic(uuid, uuid, text) to service_role;
grant execute on function public.claim_reward_atomic(uuid, uuid, uuid, uuid, text) to authenticated, service_role;

do $$
begin
  if to_regprocedure('public.provision_business_scanner_device_atomic(text, uuid, uuid, text, text, text, text, uuid)') is not null then
    revoke execute on function public.provision_business_scanner_device_atomic(text, uuid, uuid, text, text, text, text, uuid) from public, anon, authenticated;
    grant execute on function public.provision_business_scanner_device_atomic(text, uuid, uuid, text, text, text, text, uuid) to service_role;
  end if;
end $$;

drop policy if exists "students can read registered events" on public.events;
create policy "students can read registered events"
on public.events
for select
using (
  status in ('PUBLISHED', 'ACTIVE', 'COMPLETED')
  and exists (
    select 1
    from public.event_registrations er
    where er.event_id = events.id
      and er.student_id = auth.uid()
      and er.status = 'REGISTERED'
  )
);

drop policy if exists "public can read joined event venues" on public.event_venues;
create policy "public can read joined event venues"
on public.event_venues
for select
using (
  status = 'JOINED'
  and exists (
    select 1
    from public.events e
    where e.id = event_venues.event_id
      and e.status in ('PUBLISHED', 'ACTIVE', 'COMPLETED')
      and (
        e.visibility = 'PUBLIC'
        or exists (
          select 1
          from public.event_registrations er
          where er.event_id = e.id
            and er.student_id = auth.uid()
            and er.status = 'REGISTERED'
        )
      )
  )
);

drop policy if exists "public can read event leaderboard scores" on public.leaderboard_scores;
create policy "public can read event leaderboard scores"
on public.leaderboard_scores
for select
using (
  scope_type = 'EVENT'
  and exists (
    select 1
    from public.events e
    where e.id = leaderboard_scores.event_id
      and e.status in ('PUBLISHED', 'ACTIVE', 'COMPLETED')
      and (
        e.visibility = 'PUBLIC'
        or exists (
          select 1
          from public.event_registrations er
          where er.event_id = e.id
            and er.student_id = auth.uid()
            and er.status = 'REGISTERED'
        )
      )
  )
);

drop policy if exists "public can read leaderboard updates" on public.leaderboard_updates;
create policy "public can read leaderboard updates"
on public.leaderboard_updates
for select
using (
  exists (
    select 1
    from public.events e
    where e.id = leaderboard_updates.event_id
      and e.status in ('PUBLISHED', 'ACTIVE', 'COMPLETED')
      and (
        e.visibility = 'PUBLIC'
        or exists (
          select 1
          from public.event_registrations er
          where er.event_id = e.id
            and er.student_id = auth.uid()
            and er.status = 'REGISTERED'
        )
      )
  )
);

drop policy if exists "public can read active reward tiers" on public.reward_tiers;
create policy "public can read active reward tiers"
on public.reward_tiers
for select
using (
  status = 'ACTIVE'
  and exists (
    select 1
    from public.events e
    where e.id = reward_tiers.event_id
      and e.status in ('PUBLISHED', 'ACTIVE', 'COMPLETED')
      and (
        e.visibility = 'PUBLIC'
        or exists (
          select 1
          from public.event_registrations er
          where er.event_id = e.id
            and er.student_id = auth.uid()
            and er.status = 'REGISTERED'
        )
      )
  )
);
