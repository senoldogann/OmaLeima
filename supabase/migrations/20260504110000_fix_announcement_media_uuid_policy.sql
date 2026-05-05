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
      and (storage.foldername(object_name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.is_club_event_editor_for(((storage.foldername(object_name))[2])::uuid) or public.is_platform_admin()
    else false
  end;
$is_announcement_media_object_manager$;