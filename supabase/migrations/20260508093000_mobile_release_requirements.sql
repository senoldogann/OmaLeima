create table if not exists public.mobile_release_requirements (
  platform text primary key check (platform in ('IOS', 'ANDROID', 'WEB')),
  minimum_app_version text not null default '1.0.0' check (minimum_app_version ~ '^[0-9]+(\.[0-9]+){0,2}$'),
  minimum_build_number integer check (minimum_build_number is null or minimum_build_number >= 1),
  is_blocking boolean not null default false,
  update_url text check (update_url is null or update_url ~* '^https?://'),
  message_fi text not null default 'Paivita OmaLeima uusimpaan versioon ennen jatkamista.',
  message_en text not null default 'Update OmaLeima to the latest version before continuing.',
  updated_at timestamptz not null default now()
);

alter table public.mobile_release_requirements enable row level security;

drop trigger if exists set_mobile_release_requirements_updated_at on public.mobile_release_requirements;
create trigger set_mobile_release_requirements_updated_at
before update on public.mobile_release_requirements
for each row execute function public.set_updated_at();

drop policy if exists "public can read mobile release requirements" on public.mobile_release_requirements;
drop policy if exists "platform admins can manage mobile release requirements" on public.mobile_release_requirements;

create policy "public can read mobile release requirements"
on public.mobile_release_requirements
for select
using (true);

create policy "platform admins can manage mobile release requirements"
on public.mobile_release_requirements
for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

insert into public.mobile_release_requirements (
  platform,
  minimum_app_version,
  minimum_build_number,
  is_blocking,
  update_url
)
values
  ('IOS', '1.0.0', 1, false, 'https://omaleima.fi'),
  ('ANDROID', '1.0.0', 1, false, 'https://omaleima.fi'),
  ('WEB', '1.0.0', null, false, 'https://omaleima.fi')
on conflict (platform) do update
set
  minimum_app_version = excluded.minimum_app_version,
  minimum_build_number = excluded.minimum_build_number,
  update_url = coalesce(public.mobile_release_requirements.update_url, excluded.update_url);
