create or replace function public.is_public_storage_media_url(p_url text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $is_public_storage_media_url$
  select coalesce(p_url, '') ~* '/storage/v1/object/public/(event-media|announcement-media|business-media|login-slider-media)/';
$is_public_storage_media_url$;

create or replace function public.is_private_media_staging_path(p_path text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $is_private_media_staging_path$
  select coalesce(p_path, '') ~* '^users/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.+\.(jpg|jpeg|png|webp)$';
$is_private_media_staging_path$;

create or replace function public.media_staging_path_owner_id(p_path text)
returns uuid
language sql
immutable
set search_path = public, pg_temp
as $media_staging_path_owner_id$
  select substring(
    coalesce(p_path, '')
    from '^users/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/'
  )::uuid;
$media_staging_path_owner_id$;

revoke all on function public.media_staging_path_owner_id(text) from public;
revoke all on function public.media_staging_path_owner_id(text) from anon;
revoke all on function public.media_staging_path_owner_id(text) from authenticated;
