create table if not exists public.login_slides (
  id uuid primary key default gen_random_uuid(),
  eyebrow text not null default 'OmaLeima' check (char_length(btrim(eyebrow)) between 2 and 40),
  title text not null check (char_length(btrim(title)) between 2 and 90),
  body text not null check (char_length(btrim(body)) between 8 and 260),
  image_url text not null check (image_url ~* '^https?://'),
  image_alt text not null default '' check (char_length(image_alt) <= 140),
  sort_order integer not null default 0 check (sort_order >= 0 and sort_order <= 1000),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.login_slides enable row level security;

drop trigger if exists set_login_slides_updated_at on public.login_slides;
create trigger set_login_slides_updated_at
before update on public.login_slides
for each row execute function public.set_updated_at();

drop policy if exists "public can read active login slides" on public.login_slides;
drop policy if exists "platform admins can manage login slides" on public.login_slides;

create policy "public can read active login slides"
on public.login_slides
for select
using (is_active = true or public.is_platform_admin());

create policy "platform admins can manage login slides"
on public.login_slides
for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'login-slider-media',
  'login-slider-media',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.is_login_slider_media_object_admin(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $is_login_slider_media_object_admin$
  select (storage.foldername(object_name))[1] = 'login-slides'
    and public.is_platform_admin();
$is_login_slider_media_object_admin$;

drop policy if exists "platform admins can upload login slider media" on storage.objects;
drop policy if exists "platform admins can update login slider media" on storage.objects;
drop policy if exists "platform admins can delete login slider media" on storage.objects;

create policy "platform admins can upload login slider media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'login-slider-media'
  and public.is_login_slider_media_object_admin(name)
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy "platform admins can update login slider media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'login-slider-media'
  and public.is_login_slider_media_object_admin(name)
)
with check (
  bucket_id = 'login-slider-media'
  and public.is_login_slider_media_object_admin(name)
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy "platform admins can delete login slider media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'login-slider-media'
  and public.is_login_slider_media_object_admin(name)
);

create index if not exists idx_login_slides_active_order
on public.login_slides (is_active, sort_order, created_at);
