alter table public.announcements
  drop constraint if exists announcements_check1;

alter table public.announcements
  drop constraint if exists announcements_event_scope_check;

alter table public.announcements
  add constraint announcements_event_scope_check
  check (
    event_id is null
    or (
      club_id is not null
      and audience in ('ALL', 'STUDENTS', 'BUSINESSES')
    )
  );
