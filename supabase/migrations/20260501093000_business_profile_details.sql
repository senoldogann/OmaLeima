alter table public.businesses
  add column if not exists cover_image_url text,
  add column if not exists y_tunnus text,
  add column if not exists contact_person_name text,
  add column if not exists opening_hours text,
  add column if not exists announcement text;

create or replace function public.is_business_manager_for(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $is_business_manager_for$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.business_staff
      where business_id = target_business_id
        and user_id = auth.uid()
        and status = 'ACTIVE'
        and role in ('OWNER', 'MANAGER')
    );
$is_business_manager_for$;

drop policy if exists "business staff can update own business" on public.businesses;

create policy "business managers can update own business"
on public.businesses
for update
using (public.is_business_manager_for(id))
with check (public.is_business_manager_for(id));
