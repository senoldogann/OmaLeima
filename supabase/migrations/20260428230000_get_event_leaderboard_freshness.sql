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
  ),
  freshness as (
    select updated_at, version
    from public.leaderboard_updates
    where event_id = p_event_id
  )
  select jsonb_build_object(
    'top10', coalesce((select jsonb_agg(to_jsonb(top10)) from top10), '[]'::jsonb),
    'currentUser', (select to_jsonb(me) from me),
    'refreshedAt', (select updated_at from freshness),
    'version', (select version from freshness)
  );
$get_event_leaderboard$;
