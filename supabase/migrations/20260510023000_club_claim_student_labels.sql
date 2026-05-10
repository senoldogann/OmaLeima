create or replace function public.get_club_claim_student_labels(p_event_ids uuid[])
returns table (
  event_id uuid,
  student_id uuid,
  display_name text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    er.event_id,
    er.student_id,
    nullif(trim(p.display_name), '') as display_name
  from public.event_registrations er
  join public.events e on e.id = er.event_id
  join public.profiles p on p.id = er.student_id
  where er.event_id = any(p_event_ids)
    and er.status = 'REGISTERED'
    and p.status = 'ACTIVE'
    and public.is_active_profile(auth.uid())
    and exists (
      select 1
      from public.club_members cm
      where cm.club_id = e.club_id
        and cm.user_id = auth.uid()
        and cm.status = 'ACTIVE'
        and cm.role in ('OWNER', 'ORGANIZER', 'STAFF')
    );
$$;

revoke all on function public.get_club_claim_student_labels(uuid[]) from public;
grant execute on function public.get_club_claim_student_labels(uuid[]) to authenticated;
