create table public.announcement_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null check (source_type in ('PLATFORM', 'CLUB')),
  club_id uuid references public.clubs(id) on delete cascade,
  push_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  check (
    (source_type = 'PLATFORM' and club_id is null)
    or (source_type = 'CLUB' and club_id is not null)
  )
);

create unique index announcement_notification_preferences_platform_key
on public.announcement_notification_preferences(user_id)
where source_type = 'PLATFORM';

create unique index announcement_notification_preferences_club_key
on public.announcement_notification_preferences(user_id, club_id)
where source_type = 'CLUB';

create index announcement_notification_preferences_club_idx
on public.announcement_notification_preferences(club_id, push_enabled);

create trigger set_announcement_notification_preferences_updated_at
before update on public.announcement_notification_preferences
for each row execute function public.set_updated_at();

alter table public.announcement_notification_preferences enable row level security;

create policy "users can manage own announcement notification preferences"
on public.announcement_notification_preferences
for all
using (user_id = auth.uid() or public.is_platform_admin())
with check (user_id = auth.uid() or public.is_platform_admin());

create table public.announcement_impressions (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  seen_count integer not null default 1 check (seen_count > 0),
  primary key (announcement_id, user_id)
);

create index announcement_impressions_user_idx
on public.announcement_impressions(user_id, last_seen_at desc);

alter table public.announcement_impressions enable row level security;

create policy "users can read own announcement impressions"
on public.announcement_impressions
for select
using (user_id = auth.uid() or public.is_platform_admin());

create policy "users can insert own visible announcement impressions"
on public.announcement_impressions
for insert
with check (
  user_id = auth.uid()
  and public.can_read_announcement(announcement_id)
);

create policy "users can update own announcement impressions"
on public.announcement_impressions
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and public.can_read_announcement(announcement_id)
);

create or replace function public.record_announcement_impressions(p_announcement_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  insert into public.announcement_impressions (
    announcement_id,
    user_id,
    first_seen_at,
    last_seen_at,
    seen_count
  )
  select distinct
    visible_announcement_id,
    auth.uid(),
    now(),
    now(),
    1
  from unnest(p_announcement_ids) as visible_announcement_id
  where public.can_read_announcement(visible_announcement_id)
  on conflict (announcement_id, user_id)
  do update set
    last_seen_at = now(),
    seen_count = public.announcement_impressions.seen_count + 1;
end;
$$;

grant execute on function public.record_announcement_impressions(uuid[]) to authenticated;
