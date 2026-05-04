with zero_byte_event_media as (
  select
    name as object_name
  from storage.objects
  where bucket_id = 'event-media'
    and coalesce((metadata ->> 'size')::bigint, (metadata ->> 'contentLength')::bigint, 0) <= 0
)
update public.events event
set
  cover_image_url = null,
  updated_at = now()
from zero_byte_event_media media
where event.cover_image_url like '%/storage/v1/object/public/event-media/' || media.object_name;

with zero_byte_event_media as (
  select
    name as object_name
  from storage.objects
  where bucket_id = 'event-media'
    and coalesce((metadata ->> 'size')::bigint, (metadata ->> 'contentLength')::bigint, 0) <= 0
)
update public.clubs club
set
  cover_image_url = case when club.cover_image_url like '%/storage/v1/object/public/event-media/' || media.object_name then null else club.cover_image_url end,
  logo_url = case when club.logo_url like '%/storage/v1/object/public/event-media/' || media.object_name then null else club.logo_url end,
  updated_at = now()
from zero_byte_event_media media
where club.cover_image_url like '%/storage/v1/object/public/event-media/' || media.object_name
  or club.logo_url like '%/storage/v1/object/public/event-media/' || media.object_name;

with zero_byte_business_media as (
  select
    name as object_name
  from storage.objects
  where bucket_id = 'business-media'
    and coalesce((metadata ->> 'size')::bigint, (metadata ->> 'contentLength')::bigint, 0) <= 0
)
update public.businesses business
set
  cover_image_url = case when business.cover_image_url like '%/storage/v1/object/public/business-media/' || media.object_name then null else business.cover_image_url end,
  logo_url = case when business.logo_url like '%/storage/v1/object/public/business-media/' || media.object_name then null else business.logo_url end,
  updated_at = now()
from zero_byte_business_media media
where business.cover_image_url like '%/storage/v1/object/public/business-media/' || media.object_name
  or business.logo_url like '%/storage/v1/object/public/business-media/' || media.object_name;
