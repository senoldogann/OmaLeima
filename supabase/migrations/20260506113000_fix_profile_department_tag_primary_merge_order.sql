create or replace function public.sync_department_tag_profile_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $sync_department_tag_profile_links$
declare
  v_promote_profile_ids uuid[];
begin
  if new.merged_into_tag_id is not null then
    select coalesce(array_agg(source_link.profile_id), '{}'::uuid[])
    into v_promote_profile_ids
    from public.profile_department_tags source_link
    where source_link.department_tag_id = new.id
      and source_link.is_primary = true
      and exists (
        select 1
        from public.profile_department_tags target_link
        where target_link.department_tag_id = new.merged_into_tag_id
          and target_link.profile_id = source_link.profile_id
      );

    if coalesce(array_length(v_promote_profile_ids, 1), 0) > 0 then
      update public.profile_department_tags
      set is_primary = false
      where department_tag_id = new.id
        and profile_id = any(v_promote_profile_ids);

      update public.profile_department_tags
      set is_primary = true
      where department_tag_id = new.merged_into_tag_id
        and is_primary = false
        and profile_id = any(v_promote_profile_ids);
    end if;

    delete from public.profile_department_tags source_link
    using public.profile_department_tags target_link
    where source_link.department_tag_id = new.id
      and target_link.department_tag_id = new.merged_into_tag_id
      and target_link.profile_id = source_link.profile_id;

    update public.profile_department_tags
    set department_tag_id = new.merged_into_tag_id
    where department_tag_id = new.id;

    return new;
  end if;

  if new.status <> 'ACTIVE' then
    delete from public.profile_department_tags
    where department_tag_id = new.id;
  end if;

  return new;
end;
$sync_department_tag_profile_links$;
