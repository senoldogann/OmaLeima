create table if not exists public.qr_token_generation_rate_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_qr_token_generation_rate_events_actor_event_created
  on public.qr_token_generation_rate_events(actor_user_id, event_id, created_at desc);

alter table public.qr_token_generation_rate_events enable row level security;

revoke all on table public.qr_token_generation_rate_events from public, anon, authenticated;
grant select, insert, delete on table public.qr_token_generation_rate_events to service_role;

create or replace function public.check_generate_qr_token_rate_limit(
  p_actor_user_id uuid,
  p_event_id uuid,
  p_window_seconds integer,
  p_window_max_requests integer,
  p_day_max_requests integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $check_generate_qr_token_rate_limit$
declare
  v_now timestamptz := now();
  v_window_since timestamptz;
  v_day_since timestamptz := v_now - interval '24 hours';
  v_recent_count integer;
  v_day_count integer;
  v_oldest_recent timestamptz;
  v_retry_after_seconds integer;
begin
  if p_actor_user_id is null then
    raise exception 'p_actor_user_id is required';
  end if;

  if p_event_id is null then
    raise exception 'p_event_id is required';
  end if;

  if p_window_seconds < 1 or p_window_max_requests < 1 or p_day_max_requests < 1 then
    raise exception 'rate limit configuration must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_actor_user_id::text || ':' || p_event_id::text, 0));

  v_window_since := v_now - make_interval(secs => p_window_seconds);

  delete from public.qr_token_generation_rate_events
  where actor_user_id = p_actor_user_id
    and event_id = p_event_id
    and created_at < v_day_since;

  select count(*), min(created_at)
  into v_recent_count, v_oldest_recent
  from public.qr_token_generation_rate_events
  where actor_user_id = p_actor_user_id
    and event_id = p_event_id
    and created_at >= v_window_since;

  if v_recent_count >= p_window_max_requests then
    v_retry_after_seconds := greatest(
      1,
      ceiling(extract(epoch from (v_oldest_recent + make_interval(secs => p_window_seconds) - v_now)))::integer
    );

    return jsonb_build_object(
      'status', 'RATE_LIMITED',
      'retryAfterSeconds', v_retry_after_seconds,
      'windowSeconds', p_window_seconds,
      'limit', p_window_max_requests
    );
  end if;

  select count(*)
  into v_day_count
  from public.qr_token_generation_rate_events
  where actor_user_id = p_actor_user_id
    and event_id = p_event_id
    and created_at >= v_day_since;

  if v_day_count >= p_day_max_requests then
    return jsonb_build_object(
      'status', 'RATE_LIMITED',
      'retryAfterSeconds', 3600,
      'windowSeconds', 86400,
      'limit', p_day_max_requests
    );
  end if;

  insert into public.qr_token_generation_rate_events(actor_user_id, event_id, created_at)
  values (p_actor_user_id, p_event_id, v_now);

  return jsonb_build_object(
    'status', 'ALLOWED',
    'remainingInWindow', greatest(p_window_max_requests - v_recent_count - 1, 0),
    'remainingToday', greatest(p_day_max_requests - v_day_count - 1, 0)
  );
end;
$check_generate_qr_token_rate_limit$;

revoke execute on function public.check_generate_qr_token_rate_limit(uuid, uuid, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.check_generate_qr_token_rate_limit(uuid, uuid, integer, integer, integer)
  to service_role;
