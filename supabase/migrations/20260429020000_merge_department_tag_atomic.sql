create or replace function public.merge_department_tag_atomic(
  p_source_tag_id uuid,
  p_target_tag_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $merge_department_tag_atomic$
declare
  v_source_tag public.department_tags%rowtype;
  v_target_tag public.department_tags%rowtype;
  v_actor_user_id uuid;
  v_actor_role text;
begin
  v_actor_user_id := auth.uid();
  v_actor_role := auth.role();

  if v_actor_role is distinct from 'service_role' and v_actor_user_id is null then
    return jsonb_build_object('status', 'AUTH_REQUIRED');
  end if;

  if v_actor_role is distinct from 'service_role' and not public.is_platform_admin() then
    return jsonb_build_object('status', 'ADMIN_NOT_ALLOWED');
  end if;

  if p_source_tag_id = p_target_tag_id then
    return jsonb_build_object('status', 'SOURCE_TARGET_SAME');
  end if;

  if p_source_tag_id::text < p_target_tag_id::text then
    perform 1
    from public.department_tags
    where id = p_source_tag_id
    for update;

    perform 1
    from public.department_tags
    where id = p_target_tag_id
    for update;
  else
    perform 1
    from public.department_tags
    where id = p_target_tag_id
    for update;

    perform 1
    from public.department_tags
    where id = p_source_tag_id
    for update;
  end if;

  select *
  into v_source_tag
  from public.department_tags
  where id = p_source_tag_id;

  if not found then
    return jsonb_build_object('status', 'SOURCE_TAG_NOT_FOUND');
  end if;

  select *
  into v_target_tag
  from public.department_tags
  where id = p_target_tag_id;

  if not found then
    return jsonb_build_object('status', 'TARGET_TAG_NOT_FOUND');
  end if;

  if v_source_tag.merged_into_tag_id is not null or v_source_tag.status = 'MERGED' then
    return jsonb_build_object(
      'status', 'SOURCE_TAG_ALREADY_MERGED',
      'mergedIntoTagId', v_source_tag.merged_into_tag_id
    );
  end if;

  if v_source_tag.status = 'BLOCKED' then
    return jsonb_build_object('status', 'SOURCE_TAG_ALREADY_BLOCKED');
  end if;

  if v_source_tag.status not in ('ACTIVE', 'PENDING_REVIEW') then
    return jsonb_build_object(
      'status', 'SOURCE_TAG_NOT_MODERATABLE',
      'sourceStatus', v_source_tag.status
    );
  end if;

  if v_target_tag.merged_into_tag_id is not null or v_target_tag.status = 'MERGED' then
    return jsonb_build_object(
      'status', 'TARGET_TAG_ALREADY_MERGED',
      'mergedIntoTagId', v_target_tag.merged_into_tag_id
    );
  end if;

  if v_target_tag.status <> 'ACTIVE' then
    return jsonb_build_object(
      'status', 'TARGET_TAG_NOT_ACTIVE',
      'targetStatus', v_target_tag.status
    );
  end if;

  update public.department_tags
  set
    status = 'MERGED',
    merged_into_tag_id = p_target_tag_id
  where id = p_source_tag_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    v_actor_user_id,
    'DEPARTMENT_TAG_MERGED',
    'department_tags',
    p_source_tag_id,
    jsonb_build_object(
      'sourceTagId', p_source_tag_id,
      'targetTagId', p_target_tag_id,
      'sourceTitle', v_source_tag.title,
      'targetTitle', v_target_tag.title,
      'sourceRole', coalesce(v_actor_role, 'unknown')
    )
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'sourceTagId', p_source_tag_id,
    'targetTagId', p_target_tag_id
  );
end;
$merge_department_tag_atomic$;
