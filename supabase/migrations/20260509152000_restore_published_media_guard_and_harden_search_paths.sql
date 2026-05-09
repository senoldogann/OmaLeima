create or replace function public.is_existing_public_storage_object_url(
  p_url text,
  p_bucket_id text
)
returns boolean
language sql
stable
security definer
set search_path = public, storage, pg_temp
as $is_existing_public_storage_object_url$
  select exists (
    select 1
    from storage.objects media_object
    where media_object.bucket_id = p_bucket_id
      and media_object.name = substring(
        coalesce(p_url, '')
        from '/storage/v1/object/public/' || p_bucket_id || '/([^?#]+)'
      )
  );
$is_existing_public_storage_object_url$;

revoke all on function public.is_existing_public_storage_object_url(text, text) from public;
revoke all on function public.is_existing_public_storage_object_url(text, text) from anon;
revoke all on function public.is_existing_public_storage_object_url(text, text) from authenticated;

create or replace function public.reject_unowned_published_event_media()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $reject_unowned_published_event_media$
begin
  if
    new.status <> 'DRAFT'
    and nullif(btrim(coalesce(new.cover_image_url, '')), '') is not null
    and not public.is_existing_public_storage_object_url(new.cover_image_url, 'event-media')
  then
    raise exception 'PUBLISHED_MEDIA_URL_NOT_ALLOWED: published event cover must reference an existing event-media object'
      using errcode = '23514';
  end if;

  return new;
end;
$reject_unowned_published_event_media$;

create or replace function public.reject_unowned_published_announcement_media()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $reject_unowned_published_announcement_media$
begin
  if
    new.status <> 'DRAFT'
    and nullif(btrim(coalesce(new.image_url, '')), '') is not null
    and not public.is_existing_public_storage_object_url(new.image_url, 'announcement-media')
  then
    raise exception 'PUBLISHED_MEDIA_URL_NOT_ALLOWED: published announcement image must reference an existing announcement-media object'
      using errcode = '23514';
  end if;

  return new;
end;
$reject_unowned_published_announcement_media$;

drop trigger if exists reject_unowned_published_event_media_before_write on public.events;
create trigger reject_unowned_published_event_media_before_write
before insert or update of status, cover_image_url on public.events
for each row
execute function public.reject_unowned_published_event_media();

drop trigger if exists reject_unowned_published_announcement_media_before_write on public.announcements;
create trigger reject_unowned_published_announcement_media_before_write
before insert or update of status, image_url on public.announcements
for each row
execute function public.reject_unowned_published_announcement_media();

revoke execute on function public.normalize_city_key(text) from public, anon;
grant execute on function public.normalize_city_key(text) to authenticated, service_role;

do $$
declare
  function_record record;
  hardened_search_path text;
begin
  for function_record in
    select
      namespace.nspname as schema_name,
      procedure.proname as function_name,
      pg_get_function_identity_arguments(procedure.oid) as function_arguments,
      substring(config_item from '^search_path=(.*)$') as search_path
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    cross join lateral unnest(procedure.proconfig) as config_item
    where namespace.nspname = 'public'
      and procedure.prosecdef
      and config_item like 'search_path=%'
      and config_item not like '%pg_temp%'
  loop
    hardened_search_path := function_record.search_path || ', pg_temp';

    execute format(
      'alter function %I.%I(%s) set search_path to %s',
      function_record.schema_name,
      function_record.function_name,
      function_record.function_arguments,
      hardened_search_path
    );
  end loop;
end;
$$;
