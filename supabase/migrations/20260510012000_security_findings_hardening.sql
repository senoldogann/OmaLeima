create or replace function public.is_club_event_editor_for(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $is_club_event_editor_for$
  select public.is_active_profile(auth.uid())
    and exists (
      select 1
      from public.club_members
      where club_id = target_club_id
        and user_id = auth.uid()
        and status = 'ACTIVE'
        and role in ('OWNER', 'ORGANIZER')
    );
$is_club_event_editor_for$;

create or replace function public.is_business_staff_for(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $is_business_staff_for$
  select public.is_active_profile(auth.uid())
    and exists (
      select 1
      from public.business_staff
      where business_id = target_business_id
        and user_id = auth.uid()
        and status = 'ACTIVE'
    );
$is_business_staff_for$;

create or replace function public.is_club_staff_for(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $is_club_staff_for$
  select public.is_active_profile(auth.uid())
    and exists (
      select 1
      from public.club_members
      where club_id = target_club_id
        and user_id = auth.uid()
        and status = 'ACTIVE'
    );
$is_club_staff_for$;

drop policy if exists "students can read registered events" on public.events;
create policy "students can read registered events"
on public.events
for select
using (
  status in ('PUBLISHED', 'ACTIVE', 'COMPLETED')
  and public.is_active_profile(auth.uid())
  and exists (
    select 1
    from public.event_registrations er
    where er.event_id = events.id
      and er.student_id = auth.uid()
      and er.status = 'REGISTERED'
  )
);

create or replace function public.can_read_announcement(target_announcement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $can_read_announcement$
  select exists (
    select 1
    from public.announcements a
    where a.id = target_announcement_id
      and (
        public.is_platform_admin()
        or (a.club_id is not null and public.is_club_staff_for(a.club_id))
        or (
          public.is_active_profile(auth.uid())
          and a.status = 'PUBLISHED'
          and a.starts_at <= now()
          and (a.ends_at is null or a.ends_at > now())
          and (
            (
              a.event_id is not null
              and a.audience = 'STUDENTS'
              and exists (
                select 1
                from public.event_registrations er
                join public.profiles p on p.id = er.student_id
                where er.event_id = a.event_id
                  and er.student_id = auth.uid()
                  and er.status = 'REGISTERED'
                  and p.primary_role = 'STUDENT'
                  and p.status = 'ACTIVE'
              )
            )
            or (
              a.event_id is null
              and (
                a.audience = 'ALL'
                or (
                  a.audience = 'STUDENTS'
                  and exists (
                    select 1
                    from public.profiles p
                    where p.id = auth.uid()
                      and p.primary_role = 'STUDENT'
                      and p.status = 'ACTIVE'
                  )
                )
                or (
                  a.audience = 'BUSINESSES'
                  and (
                    (
                      a.club_id is null
                      and exists (
                        select 1
                        from public.business_staff bs
                        join public.profiles p on p.id = bs.user_id
                        where bs.user_id = auth.uid()
                          and bs.status = 'ACTIVE'
                          and p.status = 'ACTIVE'
                      )
                    )
                    or (
                      a.club_id is not null
                      and exists (
                        select 1
                        from public.events e
                        join public.event_venues ev on ev.event_id = e.id
                        join public.business_staff bs on bs.business_id = ev.business_id
                        join public.profiles p on p.id = bs.user_id
                        where e.club_id = a.club_id
                          and e.status in ('PUBLISHED', 'ACTIVE')
                          and ev.status = 'JOINED'
                          and bs.user_id = auth.uid()
                          and bs.status = 'ACTIVE'
                          and p.status = 'ACTIVE'
                      )
                    )
                  )
                )
                or (
                  a.audience = 'CLUBS'
                  and (
                    (a.club_id is null and exists (
                      select 1
                      from public.club_members cm
                      join public.profiles p on p.id = cm.user_id
                      where cm.user_id = auth.uid()
                        and cm.status = 'ACTIVE'
                        and p.status = 'ACTIVE'
                    ))
                    or (a.club_id is not null and public.is_club_staff_for(a.club_id))
                  )
                )
              )
            )
          )
        )
      )
  );
$can_read_announcement$;

create table if not exists public.promotion_push_send_attempts (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  status text not null check (status in ('RESERVED', 'SENT', 'FAILED')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists idx_promotion_push_attempts_active_promotion
  on public.promotion_push_send_attempts(promotion_id)
  where status in ('RESERVED', 'SENT');

create index if not exists idx_promotion_push_attempts_event_business_status
  on public.promotion_push_send_attempts(event_id, business_id, status, created_at desc);

alter table public.promotion_push_send_attempts enable row level security;

revoke all on table public.promotion_push_send_attempts from public, anon, authenticated;
grant select, insert, update on table public.promotion_push_send_attempts to service_role;

create or replace function public.reserve_promotion_push_send(
  p_promotion_id uuid,
  p_event_id uuid,
  p_business_id uuid,
  p_requested_by uuid,
  p_max_sent integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $reserve_promotion_push_send$
declare
  v_attempt_id uuid;
  v_active_count integer;
begin
  if p_promotion_id is null or p_event_id is null or p_business_id is null then
    raise exception 'promotion_id, event_id and business_id are required';
  end if;

  if p_max_sent < 1 then
    raise exception 'p_max_sent must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text || ':' || p_business_id::text, 0));

  if exists (
    select 1
    from public.promotion_push_send_attempts
    where promotion_id = p_promotion_id
      and status in ('RESERVED', 'SENT')
  ) then
    return jsonb_build_object('status', 'PROMOTION_ALREADY_SENT');
  end if;

  select count(distinct promotion_id)
  into v_active_count
  from public.promotion_push_send_attempts
  where event_id = p_event_id
    and business_id = p_business_id
    and status in ('RESERVED', 'SENT');

  if v_active_count >= p_max_sent then
    return jsonb_build_object(
      'status', 'PROMOTION_LIMIT_REACHED',
      'sentPromotionCount', v_active_count
    );
  end if;

  insert into public.promotion_push_send_attempts(
    promotion_id,
    event_id,
    business_id,
    requested_by,
    status
  )
  values (
    p_promotion_id,
    p_event_id,
    p_business_id,
    p_requested_by,
    'RESERVED'
  )
  returning id into v_attempt_id;

  return jsonb_build_object(
    'status', 'RESERVED',
    'attemptId', v_attempt_id,
    'sentPromotionCount', v_active_count
  );
end;
$reserve_promotion_push_send$;

revoke execute on function public.reserve_promotion_push_send(uuid, uuid, uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_promotion_push_send(uuid, uuid, uuid, uuid, integer)
  to service_role;

create or replace function public.complete_promotion_push_send_attempt(
  p_attempt_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $complete_promotion_push_send_attempt$
begin
  if p_attempt_id is null then
    raise exception 'p_attempt_id is required';
  end if;

  if p_status not in ('SENT', 'FAILED') then
    raise exception 'p_status must be SENT or FAILED';
  end if;

  update public.promotion_push_send_attempts
  set status = p_status,
      completed_at = now()
  where id = p_attempt_id
    and status = 'RESERVED';
end;
$complete_promotion_push_send_attempt$;

revoke execute on function public.complete_promotion_push_send_attempt(uuid, text)
  from public, anon, authenticated;
grant execute on function public.complete_promotion_push_send_attempt(uuid, text)
  to service_role;
