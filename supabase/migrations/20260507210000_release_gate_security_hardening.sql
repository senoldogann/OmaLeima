create or replace function public.is_business_staff_for(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $is_business_staff_for$
  select public.is_active_profile((select auth.uid()))
    and exists (
      select 1
      from public.business_staff
      where business_id = target_business_id
        and user_id = (select auth.uid())
        and status = 'ACTIVE'
    );
$is_business_staff_for$;

create or replace function public.is_club_staff_for(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $is_club_staff_for$
  select public.is_active_profile((select auth.uid()))
    and exists (
      select 1
      from public.club_members
      where club_id = target_club_id
        and user_id = (select auth.uid())
        and status = 'ACTIVE'
    );
$is_club_staff_for$;

create or replace function public.can_user_manage_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $can_user_manage_event$
  select exists (
    select 1
    from public.events e
    where e.id = target_event_id
      and public.is_club_staff_for(e.club_id)
  ) or public.is_platform_admin();
$can_user_manage_event$;

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
on public.profiles
for select
using (
  (id = (select auth.uid()) and public.is_active_profile((select auth.uid())))
  or public.is_platform_admin()
);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles
for update
using (
  id = (select auth.uid())
  and public.is_active_profile((select auth.uid()))
)
with check (
  id = (select auth.uid())
  and public.is_active_profile((select auth.uid()))
);

drop policy if exists "club staff can read own memberships" on public.club_members;
create policy "club staff can read own memberships"
on public.club_members
for select
using (
  (user_id = (select auth.uid()) and public.is_active_profile((select auth.uid())))
  or public.is_club_staff_for(club_id)
  or public.is_platform_admin()
);

drop policy if exists "business staff can read own memberships" on public.business_staff;
create policy "business staff can read own memberships"
on public.business_staff
for select
using (
  (user_id = (select auth.uid()) and public.is_active_profile((select auth.uid())))
  or public.is_business_staff_for(business_id)
  or public.is_platform_admin()
);

drop policy if exists "students can read own registrations" on public.event_registrations;
create policy "students can read own registrations"
on public.event_registrations
for select
using (
  student_id = (select auth.uid())
  and public.is_active_profile((select auth.uid()))
);

drop policy if exists "students can register themselves" on public.event_registrations;
create policy "students can register themselves"
on public.event_registrations
for insert
with check (
  student_id = (select auth.uid())
  and status = 'REGISTERED'
  and public.is_active_profile((select auth.uid()))
);

drop policy if exists "students can cancel own registrations" on public.event_registrations;
create policy "students can cancel own registrations"
on public.event_registrations
for update
using (
  student_id = (select auth.uid())
  and public.is_active_profile((select auth.uid()))
)
with check (
  student_id = (select auth.uid())
  and status in ('REGISTERED', 'CANCELLED')
  and public.is_active_profile((select auth.uid()))
);

drop policy if exists "students can read own stamps" on public.stamps;
create policy "students can read own stamps"
on public.stamps
for select
using (
  student_id = (select auth.uid())
  and public.is_active_profile((select auth.uid()))
);

drop policy if exists "students can read own reward claims" on public.reward_claims;
create policy "students can read own reward claims"
on public.reward_claims
for select
using (
  student_id = (select auth.uid())
  and public.is_active_profile((select auth.uid()))
);

drop policy if exists "users can manage own device tokens" on public.device_tokens;
create policy "users can manage own device tokens"
on public.device_tokens
for all
using (
  user_id = (select auth.uid())
  and public.is_active_profile((select auth.uid()))
)
with check (
  user_id = (select auth.uid())
  and public.is_active_profile((select auth.uid()))
);

drop policy if exists "users can read own notifications" on public.notifications;
create policy "users can read own notifications"
on public.notifications
for select
using (
  user_id = (select auth.uid())
  and public.is_active_profile((select auth.uid()))
);

drop policy if exists "users can mark own notifications read" on public.notifications;
create policy "users can mark own notifications read"
on public.notifications
for update
using (
  user_id = (select auth.uid())
  and public.is_active_profile((select auth.uid()))
)
with check (
  user_id = (select auth.uid())
  and public.is_active_profile((select auth.uid()))
);

drop policy if exists "users can read own support requests" on public.support_requests;
create policy "users can read own support requests"
on public.support_requests
for select
using (
  (user_id = (select auth.uid()) and public.is_active_profile((select auth.uid())))
  or public.is_platform_admin()
);

drop policy if exists "public can read event leaderboard scores" on public.leaderboard_scores;
create policy "public can read public event leaderboard scores"
on public.leaderboard_scores
for select
using (
  scope_type = 'EVENT'
  and event_id is not null
  and exists (
    select 1
    from public.events e
    where e.id = leaderboard_scores.event_id
      and e.status in ('PUBLISHED', 'ACTIVE', 'COMPLETED')
      and e.visibility = 'PUBLIC'
  )
);

drop policy if exists "public can read leaderboard updates" on public.leaderboard_updates;
create policy "public can read public event leaderboard updates"
on public.leaderboard_updates
for select
using (
  exists (
    select 1
    from public.events e
    where e.id = leaderboard_updates.event_id
      and e.status in ('PUBLISHED', 'ACTIVE', 'COMPLETED')
      and e.visibility = 'PUBLIC'
  )
);

create or replace function public.get_event_leaderboard(
  p_event_id uuid,
  p_current_user_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $get_event_leaderboard$
  with viewer as (
    select (select auth.uid()) as user_id
  ),
  visible_event as (
    select e.id
    from public.events e
    cross join viewer v
    where e.id = p_event_id
      and e.status in ('PUBLISHED', 'ACTIVE', 'COMPLETED')
      and (
        e.visibility = 'PUBLIC'
        or public.can_user_manage_event(e.id)
        or public.is_platform_admin()
        or (
          v.user_id is not null
          and public.is_active_profile(v.user_id)
          and exists (
            select 1
            from public.event_registrations er
            where er.event_id = e.id
              and er.student_id = v.user_id
              and er.status = 'REGISTERED'
          )
        )
      )
  ),
  ranked as (
    select
      ls.student_id,
      p.display_name,
      p.avatar_url,
      ls.stamp_count,
      ls.last_stamp_at,
      rank() over (
        order by ls.stamp_count desc, ls.last_stamp_at asc, ls.student_id asc
      ) as rank
    from public.leaderboard_scores ls
    join public.profiles p on p.id = ls.student_id
    join visible_event ve on ve.id = ls.event_id
    where ls.scope_type = 'EVENT'
      and ls.scope_key = p_event_id::text
  ),
  top10 as (
    select * from ranked where rank <= 10 order by rank asc, student_id asc
  ),
  me as (
    select ranked.*
    from ranked
    cross join viewer
    where ranked.student_id = viewer.user_id
  ),
  freshness as (
    select lu.updated_at, lu.version
    from public.leaderboard_updates lu
    join visible_event ve on ve.id = lu.event_id
    where lu.event_id = p_event_id
  )
  select jsonb_build_object(
    'top10', coalesce((select jsonb_agg(to_jsonb(top10)) from top10), '[]'::jsonb),
    'currentUser', (select to_jsonb(me) from me),
    'refreshedAt', (select updated_at from freshness),
    'version', (select version from freshness)
  );
$get_event_leaderboard$;

revoke all on function public.get_event_leaderboard(uuid, uuid) from public;
revoke all on function public.get_event_leaderboard(uuid, uuid) from anon;
grant execute on function public.get_event_leaderboard(uuid, uuid) to authenticated;
grant execute on function public.get_event_leaderboard(uuid, uuid) to service_role;

create or replace function public.get_latest_valid_stamp_by_events(p_event_ids uuid[])
returns table (
  event_id uuid,
  latest_scanned_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $get_latest_valid_stamp_by_events$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'GET_LATEST_VALID_STAMP_BY_EVENTS_REQUIRES_SERVICE_ROLE'
      using errcode = '42501';
  end if;

  return query
  select
    stamps.event_id,
    max(stamps.scanned_at) as latest_scanned_at
  from public.stamps
  where stamps.event_id = any(p_event_ids)
    and stamps.validation_status = 'VALID'
  group by stamps.event_id;
end;
$get_latest_valid_stamp_by_events$;

revoke all on function public.get_latest_valid_stamp_by_events(uuid[]) from public;
revoke all on function public.get_latest_valid_stamp_by_events(uuid[]) from anon;
revoke all on function public.get_latest_valid_stamp_by_events(uuid[]) from authenticated;
grant execute on function public.get_latest_valid_stamp_by_events(uuid[]) to service_role;
