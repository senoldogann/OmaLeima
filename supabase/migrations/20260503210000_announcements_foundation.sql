create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  audience text not null default 'ALL'
    check (audience in ('ALL', 'STUDENTS', 'BUSINESSES', 'CLUBS')),
  title text not null,
  body text not null,
  cta_label text,
  cta_url text,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  priority integer not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  show_as_popup boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(btrim(title)) between 3 and 120),
  check (char_length(btrim(body)) between 12 and 1200),
  check (cta_label is null or char_length(btrim(cta_label)) between 2 and 60),
  check (cta_url is null or char_length(btrim(cta_url)) between 8 and 500),
  check (ends_at is null or ends_at > starts_at),
  check (
    (club_id is null and audience in ('ALL', 'STUDENTS', 'BUSINESSES', 'CLUBS'))
    or (club_id is not null and audience in ('ALL', 'STUDENTS', 'CLUBS'))
  )
);

create table public.announcement_acknowledgements (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

create index idx_announcements_active_window
on public.announcements(status, starts_at desc, priority desc)
where status = 'PUBLISHED';

create index idx_announcements_club_status
on public.announcements(club_id, status, starts_at desc);

create index idx_announcement_acknowledgements_user
on public.announcement_acknowledgements(user_id, acknowledged_at desc);

create trigger set_announcements_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

alter table public.announcements enable row level security;
alter table public.announcement_acknowledgements enable row level security;

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
        or (
          a.status = 'PUBLISHED'
          and a.show_as_popup = true
          and a.starts_at <= now()
          and (a.ends_at is null or a.ends_at > now())
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
        or (a.club_id is not null and public.is_club_staff_for(a.club_id))
      )
  );
$can_read_announcement$;

create policy "users can read visible announcements"
on public.announcements
for select
using (public.can_read_announcement(id));

create policy "platform admins can manage announcements"
on public.announcements
for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "club organizers can manage own announcements"
on public.announcements
for all
using (club_id is not null and public.is_club_event_editor_for(club_id))
with check (club_id is not null and public.is_club_event_editor_for(club_id));

create policy "users can read own announcement acknowledgements"
on public.announcement_acknowledgements
for select
using (user_id = auth.uid() or public.is_platform_admin());

create policy "users can acknowledge visible announcements"
on public.announcement_acknowledgements
for insert
with check (
  user_id = auth.uid()
  and public.can_read_announcement(announcement_id)
);

create policy "platform admins can read announcement acknowledgements"
on public.announcement_acknowledgements
for select
using (public.is_platform_admin());
