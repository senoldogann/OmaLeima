create or replace function public.block_department_tag_atomic(
  p_tag_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $block_department_tag_atomic$
declare
  v_tag public.department_tags%rowtype;
  v_actor_user_id uuid;
  v_actor_role text;
  v_has_merged_dependents boolean;
begin
  v_actor_user_id := auth.uid();
  v_actor_role := auth.role();

  if v_actor_role is distinct from 'service_role' and v_actor_user_id is null then
    return jsonb_build_object('status', 'AUTH_REQUIRED');
  end if;

  if v_actor_role is distinct from 'service_role' and not public.is_platform_admin() then
    return jsonb_build_object('status', 'ADMIN_NOT_ALLOWED');
  end if;

  select *
  into v_tag
  from public.department_tags
  where id = p_tag_id
  for update;

  if not found then
    return jsonb_build_object('status', 'TAG_NOT_FOUND');
  end if;

  if v_tag.merged_into_tag_id is not null or v_tag.status = 'MERGED' then
    return jsonb_build_object(
      'status', 'TAG_ALREADY_MERGED',
      'mergedIntoTagId', v_tag.merged_into_tag_id
    );
  end if;

  if v_tag.status = 'BLOCKED' then
    return jsonb_build_object('status', 'TAG_ALREADY_BLOCKED');
  end if;

  if v_tag.status not in ('ACTIVE', 'PENDING_REVIEW') then
    return jsonb_build_object(
      'status', 'TAG_NOT_MODERATABLE',
      'tagStatus', v_tag.status
    );
  end if;

  select exists (
    select 1
    from public.department_tags merged_tag
    where merged_tag.merged_into_tag_id = p_tag_id
      and merged_tag.status = 'MERGED'
  )
  into v_has_merged_dependents;

  if v_has_merged_dependents then
    return jsonb_build_object('status', 'TAG_HAS_MERGED_DEPENDENTS');
  end if;

  update public.department_tags
  set
    status = 'BLOCKED',
    merged_into_tag_id = null
  where id = p_tag_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    v_actor_user_id,
    'DEPARTMENT_TAG_BLOCKED',
    'department_tags',
    p_tag_id,
    jsonb_build_object(
      'tagId', p_tag_id,
      'tagTitle', v_tag.title,
      'sourceRole', coalesce(v_actor_role, 'unknown')
    )
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'tagId', p_tag_id
  );
end;
$block_department_tag_atomic$;
