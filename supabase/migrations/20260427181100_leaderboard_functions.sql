create or replace function public.update_event_leaderboard(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $update_event_leaderboard$
begin
  insert into public.leaderboard_scores (
    scope_type,
    scope_key,
    event_id,
    student_id,
    stamp_count,
    last_stamp_at,
    updated_at
  )
  select
    'EVENT',
    p_event_id::text,
    p_event_id,
    student_id,
    count(*)::integer,
    max(scanned_at),
    now()
  from public.stamps
  where event_id = p_event_id
    and validation_status = 'VALID'
  group by student_id
  on conflict (scope_type, scope_key, student_id)
  do update set
    stamp_count = excluded.stamp_count,
    last_stamp_at = excluded.last_stamp_at,
    updated_at = excluded.updated_at;

  insert into public.leaderboard_updates (event_id, version, updated_at)
  values (p_event_id, 1, now())
  on conflict (event_id)
  do update set
    version = public.leaderboard_updates.version + 1,
    updated_at = excluded.updated_at;
end;
$update_event_leaderboard$;

create or replace function public.get_event_leaderboard(
  p_event_id uuid,
  p_current_user_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $get_event_leaderboard$
  with ranked as (
    select
      ls.student_id,
      p.display_name,
      p.avatar_url,
      ls.stamp_count,
      ls.last_stamp_at,
      rank() over (
        order by ls.stamp_count desc, ls.last_stamp_at asc, ls.student_id asc
      ) as rank
    from public.leaderboard_scores ls
    join public.profiles p on p.id = ls.student_id
    where ls.scope_type = 'EVENT'
      and ls.scope_key = p_event_id::text
  ),
  top10 as (
    select * from ranked where rank <= 10 order by rank asc, student_id asc
  ),
  me as (
    select * from ranked where student_id = p_current_user_id
  )
  select jsonb_build_object(
    'top10', coalesce((select jsonb_agg(to_jsonb(top10)) from top10), '[]'::jsonb),
    'currentUser', (select to_jsonb(me) from me)
  );
$get_event_leaderboard$;
