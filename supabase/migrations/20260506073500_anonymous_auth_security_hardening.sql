create or replace function public.is_active_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.status = 'ACTIVE'
  );
$$;

revoke all on function public.is_active_profile(uuid) from public;
grant execute on function public.is_active_profile(uuid) to authenticated;
grant execute on function public.is_active_profile(uuid) to service_role;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $handle_new_auth_user$
declare
  v_email text;
  v_status text;
begin
  v_email := coalesce(new.email, 'anonymous-' || new.id::text || '@scanner.omaleima.local');
  v_status := case when new.email is null then 'SUSPENDED' else 'ACTIVE' end;

  insert into public.profiles (
    id,
    email,
    display_name,
    avatar_url,
    status
  )
  values (
    new.id,
    v_email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    v_status
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$handle_new_auth_user$;

update public.profiles p
set status = 'SUSPENDED',
    updated_at = now()
where p.email like 'anonymous-%@scanner.omaleima.local'
  and p.status = 'ACTIVE'
  and not exists (
    select 1
    from public.business_staff bs
    where bs.user_id = p.id
      and bs.status = 'ACTIVE'
  );

create or replace function public.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $protect_profile_sensitive_fields$
declare
  v_actor_role text;
begin
  v_actor_role := coalesce(auth.role(), 'postgres');

  if v_actor_role not in ('postgres', 'service_role') then
    if new.email is distinct from old.email
      or new.primary_role is distinct from old.primary_role
      or new.status is distinct from old.status
      or new.created_at is distinct from old.created_at
    then
      raise exception 'PROFILE_SENSITIVE_FIELDS_READONLY'
        using errcode = '42501',
              detail = 'Only trusted backend contexts may change profile email, primary_role, status, or created_at.';
    end if;
  end if;

  return new;
end;
$protect_profile_sensitive_fields$;

drop trigger if exists protect_profile_sensitive_fields on public.profiles;

create trigger protect_profile_sensitive_fields
before update on public.profiles
for each row execute function public.protect_profile_sensitive_fields();

drop policy if exists "anyone can create business applications" on public.business_applications;
drop policy if exists "authenticated users can create business applications" on public.business_applications;

drop policy if exists "users can create own support requests" on public.support_requests;

create policy "users can create own support requests"
on public.support_requests
for insert
with check (
  user_id = auth.uid()
  and public.is_active_profile(auth.uid())
  and (
    (area = 'STUDENT' and business_id is null and club_id is null)
    or (area = 'BUSINESS' and business_id is not null and club_id is null and public.is_business_staff_for(business_id))
    or (area = 'CLUB' and club_id is not null and business_id is null and public.is_club_staff_for(club_id))
  )
);
