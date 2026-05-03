create or replace function public.is_event_media_object_manager(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $is_event_media_object_manager$
  select case
    when (storage.foldername(object_name))[1] = 'clubs'
      and (storage.foldername(object_name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.is_club_event_editor_for(((storage.foldername(object_name))[2])::uuid) or public.is_platform_admin()
    else false
  end;
$is_event_media_object_manager$;

drop policy if exists "club staff can manage own clubs" on public.clubs;
drop policy if exists "club organizers can update own club profiles" on public.clubs;

create policy "club organizers can update own club profiles"
on public.clubs
for update
using (public.is_club_event_editor_for(id) or public.is_platform_admin())
with check (public.is_club_event_editor_for(id) or public.is_platform_admin());

drop policy if exists "public can read event media" on storage.objects;
drop policy if exists "club staff can upload event media" on storage.objects;
drop policy if exists "club staff can update event media" on storage.objects;
drop policy if exists "club staff can delete event media" on storage.objects;
drop policy if exists "club organizers can upload event media" on storage.objects;
drop policy if exists "club organizers can update event media" on storage.objects;
drop policy if exists "club organizers can delete event media" on storage.objects;

create policy "public can read event media"
on storage.objects
for select
to public
using (bucket_id = 'event-media');

create policy "club organizers can upload event media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-media'
  and public.is_event_media_object_manager(name)
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy "club organizers can update event media"
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
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy "club organizers can delete event media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'event-media'
  and public.is_event_media_object_manager(name)
);
