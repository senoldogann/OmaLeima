alter function public.can_profile_stage_media_for_club(uuid, uuid)
set search_path = public, pg_temp;

alter function public.is_profile_platform_admin(uuid)
set search_path = public, pg_temp;

alter function public.reject_draft_event_public_media()
set search_path = public, pg_temp;

alter function public.reject_draft_announcement_public_media()
set search_path = public, pg_temp;

drop index if exists public.idx_business_scanner_devices_scanner_user;
drop index if exists public.idx_department_tags_source_club;
