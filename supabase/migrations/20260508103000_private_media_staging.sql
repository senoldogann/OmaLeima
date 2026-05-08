insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media-staging',
  'media-staging',
  false,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.events
add column if not exists cover_image_staging_path text;

alter table public.announcements
add column if not exists image_staging_path text;

create or replace function public.is_media_staging_object_owner(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $is_media_staging_object_owner$
  select auth.uid() is not null
    and (storage.foldername(object_name))[1] = 'users'
    and (storage.foldername(object_name))[2] = auth.uid()::text
    and lower(storage.extension(object_name)) in ('jpg', 'jpeg', 'png', 'webp');
$is_media_staging_object_owner$;

create or replace function public.is_private_media_staging_path(p_path text)
returns boolean
language sql
immutable
as $is_private_media_staging_path$
  select coalesce(p_path, '') ~* '^users/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.+\.(jpg|jpeg|png|webp)$';
$is_private_media_staging_path$;

drop policy if exists "owners can read private media staging" on storage.objects;
drop policy if exists "owners can upload private media staging" on storage.objects;
drop policy if exists "owners can update private media staging" on storage.objects;
drop policy if exists "owners can delete private media staging" on storage.objects;

create policy "owners can read private media staging"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'media-staging'
  and public.is_media_staging_object_owner(name)
);

create policy "owners can upload private media staging"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media-staging'
  and public.is_media_staging_object_owner(name)
);

create policy "owners can update private media staging"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'media-staging'
  and public.is_media_staging_object_owner(name)
)
with check (
  bucket_id = 'media-staging'
  and public.is_media_staging_object_owner(name)
);

create policy "owners can delete private media staging"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'media-staging'
  and public.is_media_staging_object_owner(name)
);

create or replace function public.reject_draft_event_public_media()
returns trigger
language plpgsql
set search_path = public
as $reject_draft_event_public_media$
begin
  if
    new.status = 'DRAFT'
    and nullif(btrim(coalesce(new.cover_image_url, '')), '') is not null
    and public.is_public_storage_media_url(new.cover_image_url)
  then
    raise exception 'DRAFT_PUBLIC_MEDIA_NOT_ALLOWED: draft events cannot reference public storage media'
      using errcode = '23514';
  end if;

  if
    nullif(btrim(coalesce(new.cover_image_staging_path, '')), '') is not null
    and not public.is_private_media_staging_path(new.cover_image_staging_path)
  then
    raise exception 'INVALID_PRIVATE_MEDIA_STAGING_PATH: event staging media path is invalid'
      using errcode = '23514';
  end if;

  if
    new.status <> 'DRAFT'
    and nullif(btrim(coalesce(new.cover_image_staging_path, '')), '') is not null
  then
    raise exception 'PUBLISHED_STAGING_MEDIA_NOT_ALLOWED: published events cannot retain private staging media'
      using errcode = '23514';
  end if;

  return new;
end;
$reject_draft_event_public_media$;

create or replace function public.reject_draft_announcement_public_media()
returns trigger
language plpgsql
set search_path = public
as $reject_draft_announcement_public_media$
begin
  if
    new.status = 'DRAFT'
    and nullif(btrim(coalesce(new.image_url, '')), '') is not null
    and public.is_public_storage_media_url(new.image_url)
  then
    raise exception 'DRAFT_PUBLIC_MEDIA_NOT_ALLOWED: draft announcements cannot reference public storage media'
      using errcode = '23514';
  end if;

  if
    nullif(btrim(coalesce(new.image_staging_path, '')), '') is not null
    and not public.is_private_media_staging_path(new.image_staging_path)
  then
    raise exception 'INVALID_PRIVATE_MEDIA_STAGING_PATH: announcement staging media path is invalid'
      using errcode = '23514';
  end if;

  if
    new.status <> 'DRAFT'
    and nullif(btrim(coalesce(new.image_staging_path, '')), '') is not null
  then
    raise exception 'PUBLISHED_STAGING_MEDIA_NOT_ALLOWED: published announcements cannot retain private staging media'
      using errcode = '23514';
  end if;

  return new;
end;
$reject_draft_announcement_public_media$;

drop trigger if exists reject_draft_event_public_media_before_write on public.events;
create trigger reject_draft_event_public_media_before_write
before insert or update of status, cover_image_url, cover_image_staging_path on public.events
for each row
execute function public.reject_draft_event_public_media();

drop trigger if exists reject_draft_announcement_public_media_before_write on public.announcements;
create trigger reject_draft_announcement_public_media_before_write
before insert or update of status, image_url, image_staging_path on public.announcements
for each row
execute function public.reject_draft_announcement_public_media();
