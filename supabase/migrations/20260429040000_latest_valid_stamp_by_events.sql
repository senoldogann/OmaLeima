create or replace function public.get_latest_valid_stamp_by_events(p_event_ids uuid[])
returns table (
  event_id uuid,
  latest_scanned_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $get_latest_valid_stamp_by_events$
  select
    stamps.event_id,
    max(stamps.scanned_at) as latest_scanned_at
  from public.stamps
  where stamps.event_id = any(p_event_ids)
    and stamps.validation_status = 'VALID'
  group by stamps.event_id;
$get_latest_valid_stamp_by_events$;
