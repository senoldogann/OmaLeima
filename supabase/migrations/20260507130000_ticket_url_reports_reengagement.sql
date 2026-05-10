alter table public.events
  add column if not exists ticket_url text;

alter table public.events
  drop constraint if exists events_ticket_url_http_check,
  add constraint events_ticket_url_http_check
  check (
    ticket_url is null
    or (
      char_length(btrim(ticket_url)) between 8 and 500
      and ticket_url ~* '^https?://[^[:space:]]+$'
    )
  );

alter table public.announcements
  add column if not exists event_id uuid references public.events(id) on delete set null;

alter table public.announcements
  drop constraint if exists announcements_event_scope_check,
  add constraint announcements_event_scope_check
  check (
    event_id is null
    or (
      club_id is not null
      and audience = 'STUDENTS'
    )
  );

create index if not exists idx_event_registrations_event_status_student
on public.event_registrations(event_id, status, student_id);

create index if not exists idx_event_venues_event_status_business
on public.event_venues(event_id, status, business_id);

create index if not exists idx_event_venues_business_status_event
on public.event_venues(business_id, status, event_id);

create index if not exists idx_stamps_event_valid_scanned_at
on public.stamps(event_id, event_venue_id, scanned_at desc)
where validation_status = 'VALID';

create index if not exists idx_stamps_business_event_valid_scanned_at
on public.stamps(business_id, event_id, scanned_at desc)
where validation_status = 'VALID';

create index if not exists idx_reward_claims_event_status_claimed_at
on public.reward_claims(event_id, status, claimed_at desc);

create index if not exists idx_reward_claims_tier_status
on public.reward_claims(reward_tier_id, status);

create index if not exists idx_announcements_event_status
on public.announcements(event_id, status, starts_at desc)
where event_id is not null;

create index if not exists idx_notifications_announcement_payload_status
on public.notifications((payload->>'announcementId'), status, created_at desc)
where type = 'ANNOUNCEMENT';

create or replace function public.validate_announcement_event_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $validate_announcement_event_scope$
declare
  v_event_club_id uuid;
begin
  if new.event_id is null then
    return new;
  end if;

  select club_id
  into v_event_club_id
  from public.events
  where id = new.event_id;

  if not found then
    raise exception 'Announcement event_id % does not reference an existing event.', new.event_id
      using errcode = '23503';
  end if;

  if new.club_id is null or new.club_id <> v_event_club_id then
    raise exception 'Announcement event_id % must belong to club_id %.', new.event_id, new.club_id
      using errcode = '23514';
  end if;

  if new.audience <> 'STUDENTS' then
    raise exception 'Event-scoped announcements must use STUDENTS audience.'
      using errcode = '23514';
  end if;

  return new;
end;
$validate_announcement_event_scope$;

drop trigger if exists validate_announcement_event_scope_before_write on public.announcements;
create trigger validate_announcement_event_scope_before_write
before insert or update of event_id, club_id, audience on public.announcements
for each row execute function public.validate_announcement_event_scope();

create or replace function public.can_read_announcement(target_announcement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
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
                  and exists (
                    select 1
                    from public.business_staff bs
                    where bs.user_id = auth.uid()
                      and bs.status = 'ACTIVE'
                  )
                )
                or (
                  a.audience = 'CLUBS'
                  and (
                    (a.club_id is null and exists (
                      select 1
                      from public.club_members cm
                      where cm.user_id = auth.uid()
                        and cm.status = 'ACTIVE'
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

create or replace function public.get_club_report(
  p_club_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $get_club_report$
declare
  v_summary jsonb;
  v_events jsonb;
begin
  if p_from >= p_to then
    raise exception 'p_from must be before p_to.';
  end if;

  if not (public.is_platform_admin() or public.is_club_staff_for(p_club_id)) then
    raise exception 'Club report access denied for club %.', p_club_id
      using errcode = '42501';
  end if;

  with scoped_events as (
    select *
    from public.events e
    where e.club_id = p_club_id
      and e.start_at < p_to
      and e.end_at >= p_from
  ),
  registrations as (
    select er.event_id, count(*) filter (where er.status = 'REGISTERED') as registered_count
    from public.event_registrations er
    join scoped_events se on se.id = er.event_id
    group by er.event_id
  ),
  venues as (
    select ev.event_id, count(*) filter (where ev.status = 'JOINED') as joined_venue_count
    from public.event_venues ev
    join scoped_events se on se.id = ev.event_id
    group by ev.event_id
  ),
  stamps as (
    select
      s.event_id,
      count(*) filter (where s.validation_status = 'VALID') as valid_stamp_count,
      count(distinct s.student_id) filter (where s.validation_status = 'VALID') as unique_student_count,
      count(*) filter (where s.validation_status = 'MANUAL_REVIEW') as manual_review_stamp_count,
      count(*) filter (where s.validation_status = 'REVOKED') as revoked_stamp_count
    from public.stamps s
    join scoped_events se on se.id = s.event_id
    group by s.event_id
  ),
  rewards as (
    select
      rt.event_id,
      count(distinct rt.id) filter (where rt.status = 'ACTIVE') as active_reward_tier_count,
      count(rc.id) filter (where rc.status = 'CLAIMED') as claimed_reward_count
    from public.reward_tiers rt
    join scoped_events se on se.id = rt.event_id
    left join public.reward_claims rc on rc.reward_tier_id = rt.id
    group by rt.event_id
  ),
  event_metrics as (
    select
      se.id,
      se.name,
      se.city,
      se.status,
      se.start_at,
      se.end_at,
      se.ticket_url,
      coalesce(r.registered_count, 0)::integer as registered_count,
      coalesce(v.joined_venue_count, 0)::integer as joined_venue_count,
      coalesce(s.valid_stamp_count, 0)::integer as valid_stamp_count,
      coalesce(s.unique_student_count, 0)::integer as unique_student_count,
      coalesce(s.manual_review_stamp_count, 0)::integer as manual_review_stamp_count,
      coalesce(s.revoked_stamp_count, 0)::integer as revoked_stamp_count,
      coalesce(re.active_reward_tier_count, 0)::integer as active_reward_tier_count,
      coalesce(re.claimed_reward_count, 0)::integer as claimed_reward_count
    from scoped_events se
    left join registrations r on r.event_id = se.id
    left join venues v on v.event_id = se.id
    left join stamps s on s.event_id = se.id
    left join rewards re on re.event_id = se.id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'eventId', id,
      'name', name,
      'city', city,
      'status', status,
      'startAt', start_at,
      'endAt', end_at,
      'ticketUrl', ticket_url,
      'registeredParticipantCount', registered_count,
      'joinedVenueCount', joined_venue_count,
      'validStampCount', valid_stamp_count,
      'uniqueStampedStudentCount', unique_student_count,
      'manualReviewStampCount', manual_review_stamp_count,
      'revokedStampCount', revoked_stamp_count,
      'activeRewardTierCount', active_reward_tier_count,
      'claimedRewardCount', claimed_reward_count,
      'attendanceRate', case when registered_count = 0 then 0 else round((unique_student_count::numeric / registered_count::numeric) * 100, 1) end,
      'rewardClaimRate', case when unique_student_count = 0 then 0 else round((claimed_reward_count::numeric / unique_student_count::numeric) * 100, 1) end
    )
    order by start_at desc
  ), '[]'::jsonb)
  into v_events
  from event_metrics;

  with event_objects as (
    select value as event_object
    from jsonb_array_elements(v_events)
  )
  select jsonb_build_object(
    'eventCount', coalesce(count(*), 0),
    'registeredParticipantCount', coalesce(sum((event_object->>'registeredParticipantCount')::integer), 0),
    'joinedVenueCount', coalesce(sum((event_object->>'joinedVenueCount')::integer), 0),
    'validStampCount', coalesce(sum((event_object->>'validStampCount')::integer), 0),
    'uniqueStampedStudentCount', coalesce(sum((event_object->>'uniqueStampedStudentCount')::integer), 0),
    'claimedRewardCount', coalesce(sum((event_object->>'claimedRewardCount')::integer), 0)
  )
  into v_summary
  from event_objects;

  return jsonb_build_object(
    'clubId', p_club_id,
    'from', p_from,
    'to', p_to,
    'summary', coalesce(v_summary, '{}'::jsonb),
    'events', v_events
  );
end;
$get_club_report$;

create or replace function public.get_business_roi_report(
  p_business_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $get_business_roi_report$
declare
  v_summary jsonb;
  v_events jsonb;
begin
  if p_from >= p_to then
    raise exception 'p_from must be before p_to.';
  end if;

  if not public.is_business_manager_for(p_business_id) then
    raise exception 'Business ROI report access denied for business %.', p_business_id
      using errcode = '42501';
  end if;

  with scoped_event_venues as (
    select ev.id, ev.event_id, ev.status, e.name, e.city, e.start_at, e.end_at, e.status as event_status
    from public.event_venues ev
    join public.events e on e.id = ev.event_id
    where ev.business_id = p_business_id
      and e.start_at < p_to
      and e.end_at >= p_from
  ),
  stamps_by_event as (
    select
      sev.event_id,
      count(*) filter (where s.validation_status = 'VALID') as valid_stamp_count,
      count(distinct s.student_id) filter (where s.validation_status = 'VALID') as unique_student_count,
      count(distinct s.scanner_user_id) filter (where s.validation_status = 'VALID') as active_scanner_count
    from scoped_event_venues sev
    left join public.stamps s on s.event_venue_id = sev.id
    group by sev.event_id
  ),
  repeat_by_event as (
    select event_id, count(*) as repeat_student_count
    from (
      select s.event_id, s.student_id
      from public.stamps s
      where s.business_id = p_business_id
        and s.validation_status = 'VALID'
        and s.scanned_at >= p_from
        and s.scanned_at < p_to
      group by s.event_id, s.student_id
      having count(*) > 1
    ) repeat_students
    group by event_id
  ),
  event_metrics as (
    select
      sev.event_id,
      max(sev.name) as name,
      max(sev.city) as city,
      max(sev.start_at) as start_at,
      max(sev.end_at) as end_at,
      max(sev.event_status) as status,
      max(sev.status) as venue_status,
      coalesce(max(sbe.valid_stamp_count), 0)::integer as valid_stamp_count,
      coalesce(max(sbe.unique_student_count), 0)::integer as unique_student_count,
      coalesce(max(sbe.active_scanner_count), 0)::integer as active_scanner_count,
      coalesce(max(rbe.repeat_student_count), 0)::integer as repeat_student_count
    from scoped_event_venues sev
    left join stamps_by_event sbe on sbe.event_id = sev.event_id
    left join repeat_by_event rbe on rbe.event_id = sev.event_id
    group by sev.event_id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'eventId', event_id,
      'name', name,
      'city', city,
      'startAt', start_at,
      'endAt', end_at,
      'status', status,
      'venueStatus', venue_status,
      'validStampCount', valid_stamp_count,
      'uniqueStudentCount', unique_student_count,
      'repeatStudentCount', repeat_student_count,
      'activeScannerCount', active_scanner_count,
      'repeatVisitRate', case when unique_student_count = 0 then 0 else round((repeat_student_count::numeric / unique_student_count::numeric) * 100, 1) end
    )
    order by start_at desc
  ), '[]'::jsonb)
  into v_events
  from event_metrics;

  with event_objects as (
    select value as event_object
    from jsonb_array_elements(v_events)
  )
  select jsonb_build_object(
    'eventCount', coalesce(count(*), 0),
    'joinedEventCount', coalesce(count(*) filter (where event_object->>'venueStatus' = 'JOINED'), 0),
    'validStampCount', coalesce(sum((event_object->>'validStampCount')::integer), 0),
    'uniqueStudentCount', coalesce(sum((event_object->>'uniqueStudentCount')::integer), 0),
    'repeatStudentCount', coalesce(sum((event_object->>'repeatStudentCount')::integer), 0),
    'activeScannerCount', coalesce(sum((event_object->>'activeScannerCount')::integer), 0)
  )
  into v_summary
  from event_objects;

  return jsonb_build_object(
    'businessId', p_business_id,
    'from', p_from,
    'to', p_to,
    'summary', coalesce(v_summary, '{}'::jsonb),
    'events', v_events
  );
end;
$get_business_roi_report$;

revoke execute on function public.validate_announcement_event_scope() from public, anon;
revoke execute on function public.get_club_report(uuid, timestamp with time zone, timestamp with time zone) from public, anon;
revoke execute on function public.get_business_roi_report(uuid, timestamp with time zone, timestamp with time zone) from public, anon;

grant execute on function public.get_club_report(uuid, timestamp with time zone, timestamp with time zone) to authenticated, service_role;
grant execute on function public.get_business_roi_report(uuid, timestamp with time zone, timestamp with time zone) to authenticated, service_role;
