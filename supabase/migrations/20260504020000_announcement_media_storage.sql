insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'announcement-media',
  'announcement-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.is_announcement_media_object_manager(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $is_announcement_media_object_manager$
  select case
    when (storage.foldername(object_name))[1] = 'platform'
    then public.is_platform_admin()
    when (storage.foldername(object_name))[1] = 'clubs'
      and (storage.foldername(object_name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.is_club_event_editor_for(((storage.foldername(object_name))[2])::uuid) or public.is_platform_admin()
    else false
  end;
$is_announcement_media_object_manager$;

drop policy if exists "public can read announcement media" on storage.objects;
drop policy if exists "announcement authors can upload announcement media" on storage.objects;
drop policy if exists "announcement authors can update announcement media" on storage.objects;
drop policy if exists "announcement authors can delete announcement media" on storage.objects;

create policy "public can read announcement media"
on storage.objects
for select
to public
using (bucket_id = 'announcement-media');

create policy "announcement authors can upload announcement media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'announcement-media'
  and public.is_announcement_media_object_manager(name)
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy "announcement authors can update announcement media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'announcement-media'
  and public.is_announcement_media_object_manager(name)
)
with check (
  bucket_id = 'announcement-media'
  and public.is_announcement_media_object_manager(name)
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy "announcement authors can delete announcement media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'announcement-media'
  and public.is_announcement_media_object_manager(name)
);
