create or replace function public.acknowledge_announcement_atomic(p_announcement_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $acknowledge_announcement_atomic$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    return 'AUTH_REQUIRED';
  end if;

  if p_announcement_id is null then
    return 'ANNOUNCEMENT_REQUIRED';
  end if;

  if not public.can_read_announcement(p_announcement_id) then
    return 'ANNOUNCEMENT_NOT_VISIBLE';
  end if;

  insert into public.announcement_acknowledgements (
    announcement_id,
    user_id,
    acknowledged_at
  )
  values (
    p_announcement_id,
    current_user_id,
    now()
  )
  on conflict (announcement_id, user_id)
  do update set acknowledged_at = excluded.acknowledged_at;

  return 'SUCCESS';
end;
$acknowledge_announcement_atomic$;

revoke execute on function public.acknowledge_announcement_atomic(uuid) from public, anon;
grant execute on function public.acknowledge_announcement_atomic(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
