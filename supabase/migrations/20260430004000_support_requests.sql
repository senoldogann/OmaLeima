create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  area text not null check (area in ('STUDENT', 'BUSINESS')),
  subject text not null,
  message text not null,
  status text not null default 'OPEN'
    check (status in ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (char_length(btrim(subject)) between 3 and 120),
  check (char_length(btrim(message)) between 12 and 2000),
  check (
    (area = 'STUDENT' and business_id is null)
    or (area = 'BUSINESS' and business_id is not null)
  )
);

create index idx_support_requests_user_created
on public.support_requests(user_id, created_at desc);

create index idx_support_requests_business_status
on public.support_requests(business_id, status, created_at desc);

create trigger set_support_requests_updated_at
before update on public.support_requests
for each row execute function public.set_updated_at();

alter table public.support_requests enable row level security;

create policy "users can read own support requests"
on public.support_requests
for select
using (user_id = auth.uid() or public.is_platform_admin());

create policy "users can create own support requests"
on public.support_requests
for insert
with check (
  user_id = auth.uid()
  and (
    (area = 'STUDENT' and business_id is null)
    or (area = 'BUSINESS' and business_id is not null and public.is_business_staff_for(business_id))
  )
);

create policy "platform admins can manage support requests"
on public.support_requests
for all
using (public.is_platform_admin())
with check (public.is_platform_admin());
