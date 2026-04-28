drop policy if exists "club staff can manage reward tiers" on public.reward_tiers;

create policy "club organizers can manage reward tiers"
on public.reward_tiers
for all
using (
  exists (
    select 1
    from public.events e
    where e.id = reward_tiers.event_id
      and (public.is_club_event_editor_for(e.club_id) or public.is_platform_admin())
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = reward_tiers.event_id
      and (public.is_club_event_editor_for(e.club_id) or public.is_platform_admin())
  )
);
