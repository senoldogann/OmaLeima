alter table public.announcements
  add column if not exists target_city text;

alter table public.announcements
  drop constraint if exists announcements_target_city_trimmed_check;

alter table public.announcements
  add constraint announcements_target_city_trimmed_check
  check (target_city is null or target_city = btrim(target_city));

alter table public.announcements
  drop constraint if exists announcements_club_audience_check;

alter table public.announcements
  drop constraint if exists announcements_club_scope_check;

alter table public.announcements
  add constraint announcements_club_scope_check
  check (
    (club_id is null and audience in ('ALL', 'STUDENTS', 'BUSINESSES', 'CLUBS'))
    or (club_id is not null and audience in ('ALL', 'STUDENTS', 'BUSINESSES', 'CLUBS'))
  );

create index if not exists idx_announcements_target_city_status
on public.announcements(target_city, status, starts_at desc)
where target_city is not null;

create or replace function public.validate_announcement_event_scope()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_event record;
begin
  if new.target_city is not null and btrim(new.target_city) = '' then
    new.target_city := null;
  end if;

  if new.event_id is null then
    return new;
  end if;

  select id, club_id, city
  into v_event
  from public.events
  where id = new.event_id;

  if not found then
    raise exception 'Announcement event_id % does not reference an existing event.', new.event_id
      using errcode = '23514';
  end if;

  if new.club_id is null or v_event.club_id <> new.club_id then
    raise exception 'Announcement event_id % must belong to club_id %.', new.event_id, new.club_id
      using errcode = '23514';
  end if;

  if new.audience not in ('ALL', 'STUDENTS', 'BUSINESSES') then
    raise exception 'Event-scoped announcements must use ALL, STUDENTS, or BUSINESSES audience.'
      using errcode = '23514';
  end if;

  if new.target_city is not null and public.normalize_city_key(v_event.city) <> public.normalize_city_key(new.target_city) then
    raise exception 'Event-scoped announcement target_city must match the event city.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

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
          a.status = 'PUBLISHED'
          and a.starts_at <= now()
          and (a.ends_at is null or a.ends_at > now())
          and public.is_active_profile(auth.uid())
          and (
            (
              a.club_id is null
              and a.event_id is null
              and a.target_city is null
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
              )
            )
            or
            (
              a.event_id is not null
              and (
                (
                  a.audience in ('ALL', 'STUDENTS')
                  and exists (
                    select 1
                    from public.event_registrations er
                    join public.profiles p on p.id = er.student_id
                    join public.events e on e.id = er.event_id
                    where er.event_id = a.event_id
                      and er.student_id = auth.uid()
                      and er.status = 'REGISTERED'
                      and p.primary_role = 'STUDENT'
                      and p.status = 'ACTIVE'
                      and (a.club_id is null or e.club_id = a.club_id)
                      and (a.target_city is null or public.normalize_city_key(e.city) = public.normalize_city_key(a.target_city))
                  )
                )
                or (
                  a.audience in ('ALL', 'BUSINESSES')
                  and exists (
                    select 1
                    from public.event_venues ev
                    join public.events e on e.id = ev.event_id
                    join public.business_staff bs on bs.business_id = ev.business_id
                    join public.profiles p on p.id = bs.user_id
                    join public.businesses b on b.id = bs.business_id
                    where ev.event_id = a.event_id
                      and ev.status = 'JOINED'
                      and bs.user_id = auth.uid()
                      and bs.status = 'ACTIVE'
                      and p.status = 'ACTIVE'
                      and (a.club_id is null or e.club_id = a.club_id)
                      and (
                        a.target_city is null
                        or public.normalize_city_key(e.city) = public.normalize_city_key(a.target_city)
                        or public.normalize_city_key(b.city) = public.normalize_city_key(a.target_city)
                      )
                  )
                )
              )
            )
            or (
              a.event_id is null
              and (
                (
                  a.audience in ('ALL', 'STUDENTS')
                  and exists (
                    select 1
                    from public.event_registrations er
                    join public.events e on e.id = er.event_id
                    join public.profiles p on p.id = er.student_id
                    where er.student_id = auth.uid()
                      and er.status = 'REGISTERED'
                      and p.primary_role = 'STUDENT'
                      and p.status = 'ACTIVE'
                      and (a.club_id is null or e.club_id = a.club_id)
                      and (a.target_city is null or public.normalize_city_key(e.city) = public.normalize_city_key(a.target_city))
                  )
                )
                or (
                  a.audience in ('ALL', 'BUSINESSES')
                  and exists (
                    select 1
                    from public.business_staff bs
                    join public.businesses b on b.id = bs.business_id
                    join public.profiles p on p.id = bs.user_id
                    where bs.user_id = auth.uid()
                      and bs.status = 'ACTIVE'
                      and p.status = 'ACTIVE'
                      and (a.target_city is null or public.normalize_city_key(b.city) = public.normalize_city_key(a.target_city))
                      and (
                        a.club_id is null
                        or exists (
                          select 1
                          from public.event_venues ev
                          join public.events e on e.id = ev.event_id
                          where ev.business_id = bs.business_id
                            and ev.status = 'JOINED'
                            and e.club_id = a.club_id
                            and e.status in ('PUBLISHED', 'ACTIVE')
                            and (a.target_city is null or public.normalize_city_key(e.city) = public.normalize_city_key(a.target_city))
                        )
                      )
                  )
                )
                or (
                  a.audience in ('ALL', 'CLUBS')
                  and exists (
                    select 1
                    from public.club_members cm
                    join public.clubs c on c.id = cm.club_id
                    join public.profiles p on p.id = cm.user_id
                    where cm.user_id = auth.uid()
                      and cm.status = 'ACTIVE'
                      and p.status = 'ACTIVE'
                      and (a.club_id is null or cm.club_id = a.club_id)
                      and (a.target_city is null or public.normalize_city_key(c.city) = public.normalize_city_key(a.target_city))
                  )
                )
              )
            )
          )
        )
      )
  );
$can_read_announcement$;

create or replace function public.get_business_scan_history(p_limit integer)
returns table (
  stamp_id uuid,
  event_id uuid,
  event_name text,
  business_id uuid,
  business_name text,
  student_id uuid,
  scanned_at timestamptz,
  validation_status text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $get_business_scan_history$
  select
    s.id as stamp_id,
    s.event_id,
    e.name as event_name,
    s.business_id,
    b.name as business_name,
    s.student_id,
    s.scanned_at,
    s.validation_status
  from public.stamps s
  join public.businesses b on b.id = s.business_id
  join public.events e on e.id = s.event_id
  join public.event_venues ev on ev.event_id = s.event_id and ev.business_id = s.business_id
  where public.is_active_profile(auth.uid())
    and ev.status = 'JOINED'
    and exists (
      select 1
      from public.business_staff bs
      where bs.business_id = s.business_id
        and bs.user_id = auth.uid()
        and bs.status = 'ACTIVE'
    )
  order by s.scanned_at desc
  limit least(greatest(coalesce(p_limit, 120), 1), 500);
$get_business_scan_history$;

revoke all on function public.get_business_scan_history(integer) from public;
grant execute on function public.get_business_scan_history(integer) to authenticated;
