alter table public.support_requests
  add column club_id uuid references public.clubs(id) on delete set null;

alter table public.support_requests
  drop constraint support_requests_area_check;

alter table public.support_requests
  add constraint support_requests_area_check
  check (area in ('STUDENT', 'BUSINESS', 'CLUB'));

alter table public.support_requests
  drop constraint support_requests_check;

alter table public.support_requests
  add constraint support_requests_target_check
  check (
    (area = 'STUDENT' and business_id is null and club_id is null)
    or (area = 'BUSINESS' and business_id is not null and club_id is null)
    or (area = 'CLUB' and club_id is not null and business_id is null)
  );

create index idx_support_requests_club_status
on public.support_requests(club_id, status, created_at desc);

drop policy "users can create own support requests" on public.support_requests;

create policy "users can create own support requests"
on public.support_requests
for insert
with check (
  user_id = auth.uid()
  and (
    (area = 'STUDENT' and business_id is null and club_id is null)
    or (area = 'BUSINESS' and business_id is not null and club_id is null and public.is_business_staff_for(business_id))
    or (area = 'CLUB' and club_id is not null and business_id is null and public.is_club_staff_for(club_id))
  )
);
