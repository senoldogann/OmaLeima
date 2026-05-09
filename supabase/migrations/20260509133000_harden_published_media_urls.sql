create or replace function public.is_existing_public_storage_object_url(
  p_url text,
  p_bucket_id text
)
returns boolean
language sql
stable
security definer
set search_path = public, storage
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
set search_path = public
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
set search_path = public
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
