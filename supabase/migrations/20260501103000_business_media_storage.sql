insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-media',
  'business-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.is_business_media_object_manager(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $is_business_media_object_manager$
  select case
    when (storage.foldername(object_name))[1] = 'businesses'
      and (storage.foldername(object_name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.is_business_manager_for(((storage.foldername(object_name))[2])::uuid)
    else false
  end;
$is_business_media_object_manager$;

drop policy if exists "public can read business media" on storage.objects;
drop policy if exists "business managers can upload business media" on storage.objects;
drop policy if exists "business managers can update business media" on storage.objects;
drop policy if exists "business managers can delete business media" on storage.objects;

create policy "public can read business media"
on storage.objects
for select
to public
using (bucket_id = 'business-media');

create policy "business managers can upload business media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'business-media'
  and public.is_business_media_object_manager(name)
  and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy "business managers can update business media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'business-media'
  and public.is_business_media_object_manager(name)
)
with check (
  bucket_id = 'business-media'
  and public.is_business_media_object_manager(name)
  and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy "business managers can delete business media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'business-media'
  and public.is_business_media_object_manager(name)
);
