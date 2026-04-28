create or replace function public.is_club_event_editor_for(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $is_club_event_editor_for$
  select exists (
    select 1
    from public.club_members
    where club_id = target_club_id
      and user_id = auth.uid()
      and status = 'ACTIVE'
      and role in ('OWNER', 'ORGANIZER')
  );
$is_club_event_editor_for$;

drop policy if exists "club staff can manage own events" on public.events;

create policy "club organizers can manage own events"
on public.events
for all
using (public.is_club_event_editor_for(club_id) or public.is_platform_admin())
with check (public.is_club_event_editor_for(club_id) or public.is_platform_admin());
