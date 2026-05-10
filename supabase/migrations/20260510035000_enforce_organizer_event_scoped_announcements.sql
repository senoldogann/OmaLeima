create or replace function public.validate_announcement_event_scope()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_creator_role text;
  v_event record;
begin
  if new.target_city is not null and btrim(new.target_city) = '' then
    new.target_city := null;
  end if;

  select primary_role
  into v_creator_role
  from public.profiles
  where id = new.created_by;

  if new.club_id is not null and coalesce(v_creator_role, '') <> 'PLATFORM_ADMIN' then
    if new.event_id is null then
      raise exception 'Organizer announcements must be scoped to an event.'
        using errcode = '23514';
    end if;

    if new.target_city is null then
      raise exception 'Organizer announcements must be scoped to the event city.'
        using errcode = '23514';
    end if;
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

  if new.target_city is null then
    new.target_city := v_event.city;
  end if;

  if public.normalize_city_key(v_event.city) <> public.normalize_city_key(new.target_city) then
    raise exception 'Event-scoped announcement target_city must match the event city.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;
