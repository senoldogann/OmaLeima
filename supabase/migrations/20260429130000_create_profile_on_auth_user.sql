create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $handle_new_auth_user$
begin
  if new.email is null then
    raise exception 'AUTH_USER_EMAIL_REQUIRED';
  end if;

  insert into public.profiles (
    id,
    email,
    display_name,
    avatar_url
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
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

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.profiles (
  id,
  email,
  display_name,
  avatar_url
)
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data ->> 'full_name', au.raw_user_meta_data ->> 'name'),
  au.raw_user_meta_data ->> 'avatar_url'
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null
  and au.email is not null
on conflict (id) do update
set
  email = excluded.email,
  display_name = coalesce(excluded.display_name, public.profiles.display_name),
  avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
  updated_at = now();
