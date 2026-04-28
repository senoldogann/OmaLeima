create or replace function public.create_club_department_tag_atomic(
  p_club_id uuid,
  p_title text,
  p_created_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $create_club_department_tag_atomic$
declare
  v_actor_user_id uuid;
  v_actor_role text;
  v_profile public.profiles%rowtype;
  v_club public.clubs%rowtype;
  v_membership public.club_members%rowtype;
  v_existing_tag_id uuid;
  v_normalized_title text;
  v_slug_base text;
  v_slug_candidate text;
  v_slug_attempt integer := 0;
  v_department_tag_id uuid;
begin
  v_actor_user_id := auth.uid();
  v_actor_role := auth.role();

  if v_actor_role is distinct from 'service_role' and v_actor_user_id is null then
    return jsonb_build_object('status', 'AUTH_REQUIRED');
  end if;

  if v_actor_role is distinct from 'service_role' and v_actor_user_id <> p_created_by then
    return jsonb_build_object('status', 'ACTOR_NOT_ALLOWED');
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_created_by
  for update;

  if not found then
    return jsonb_build_object('status', 'PROFILE_NOT_FOUND');
  end if;

  if v_profile.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'PROFILE_NOT_ACTIVE');
  end if;

  select *
  into v_club
  from public.clubs
  where id = p_club_id
  for update;

  if not found or v_club.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'CLUB_NOT_ACTIVE');
  end if;

  select *
  into v_membership
  from public.club_members
  where club_id = p_club_id
    and user_id = p_created_by
  for update;

  if not found or v_membership.status <> 'ACTIVE' then
    return jsonb_build_object('status', 'CLUB_MEMBERSHIP_NOT_ALLOWED');
  end if;

  if v_membership.role not in ('OWNER', 'ORGANIZER') then
    return jsonb_build_object('status', 'CLUB_TAG_CREATOR_NOT_ALLOWED');
  end if;

  v_normalized_title := regexp_replace(btrim(p_title), '\s+', ' ', 'g');

  if v_normalized_title = '' then
    return jsonb_build_object('status', 'DEPARTMENT_TAG_TITLE_REQUIRED');
  end if;

  select id
  into v_existing_tag_id
  from public.department_tags
  where source_type = 'CLUB'
    and source_club_id = p_club_id
    and status = 'ACTIVE'
    and merged_into_tag_id is null
    and lower(title) = lower(v_normalized_title)
  for update;

  if found then
    return jsonb_build_object(
      'status', 'DEPARTMENT_TAG_ALREADY_EXISTS',
      'departmentTagId', v_existing_tag_id
    );
  end if;

  v_slug_base := regexp_replace(
    translate(lower(v_normalized_title), 'åäö', 'aao'),
    '[^a-z0-9]+',
    '-',
    'g'
  );
  v_slug_base := regexp_replace(v_slug_base, '(^-+|-+$)', '', 'g');

  if v_slug_base = '' then
    v_slug_base := 'department-tag';
  end if;

  v_slug_base := v_slug_base || '-' || v_club.slug;

  loop
    if v_slug_attempt = 0 then
      v_slug_candidate := v_slug_base;
    else
      v_slug_candidate := v_slug_base || '-' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8);
    end if;

    begin
      insert into public.department_tags (
        title,
        slug,
        university_name,
        city,
        source_type,
        source_club_id,
        created_by,
        status
      )
      values (
        v_normalized_title,
        v_slug_candidate,
        v_club.university_name,
        v_club.city,
        'CLUB',
        p_club_id,
        p_created_by,
        'ACTIVE'
      )
      returning id into v_department_tag_id;

      exit;
    exception
      when unique_violation then
        v_slug_attempt := v_slug_attempt + 1;

        if v_slug_attempt >= 5 then
          return jsonb_build_object('status', 'DEPARTMENT_TAG_SLUG_CONFLICT');
        end if;
    end;
  end loop;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_created_by,
    'CLUB_DEPARTMENT_TAG_CREATED',
    'department_tags',
    v_department_tag_id,
    jsonb_build_object(
      'clubId', p_club_id,
      'clubSlug', v_club.slug,
      'tagSlug', v_slug_candidate,
      'sourceRole', coalesce(v_actor_role, 'unknown')
    )
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'departmentTagId', v_department_tag_id,
    'tagSlug', v_slug_candidate
  );
exception
  when unique_violation then
    return jsonb_build_object('status', 'DEPARTMENT_TAG_SLUG_CONFLICT');
end;
$create_club_department_tag_atomic$;
