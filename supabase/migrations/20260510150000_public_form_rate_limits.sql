create table if not exists public.public_form_rate_limits (
  id uuid primary key default gen_random_uuid(),
  form_key text not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists public_form_rate_limits_form_ip_created_idx
  on public.public_form_rate_limits (form_key, ip_hash, created_at desc);

alter table public.public_form_rate_limits enable row level security;

drop policy if exists "Service role can manage public form rate limits" on public.public_form_rate_limits;

create policy "Service role can manage public form rate limits"
  on public.public_form_rate_limits
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

revoke all on public.public_form_rate_limits from anon, authenticated;
grant all on public.public_form_rate_limits to service_role;
