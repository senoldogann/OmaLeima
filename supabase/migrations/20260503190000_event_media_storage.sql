insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-media',
  'event-media',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.is_event_media_object_manager(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $is_event_media_object_manager$
  select case
    when (storage.foldername(object_name))[1] = 'clubs'
      and (storage.foldername(object_name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.is_club_staff_for(((storage.foldername(object_name))[2])::uuid)
    else false
  end;
$is_event_media_object_manager$;

drop policy if exists "public can read event media" on storage.objects;
drop policy if exists "club staff can upload event media" on storage.objects;
drop policy if exists "club staff can update event media" on storage.objects;
drop policy if exists "club staff can delete event media" on storage.objects;

create policy "public can read event media"
on storage.objects
for select
to public
using (bucket_id = 'event-media');

create policy "club staff can upload event media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-media'
  and public.is_event_media_object_manager(name)
  and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy "club staff can update event media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'event-media'
  and public.is_event_media_object_manager(name)
)
with check (
  bucket_id = 'event-media'
  and public.is_event_media_object_manager(name)
  and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy "club staff can delete event media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'event-media'
  and public.is_event_media_object_manager(name)
);
