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

    delete from public.profile_department_tags source_link
    using public.profile_department_tags target_link
    where source_link.department_tag_id = new.id
      and target_link.department_tag_id = new.merged_into_tag_id
      and target_link.profile_id = source_link.profile_id;

    if coalesce(array_length(v_promote_profile_ids, 1), 0) > 0 then
      update public.profile_department_tags
      set is_primary = true
      where department_tag_id = new.merged_into_tag_id
        and is_primary = false
        and profile_id = any(v_promote_profile_ids);
    end if;

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

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

create or replace function public.admin_create_business_owner_account_atomic(
  p_admin_user_id uuid,
  p_owner_user_id uuid,
  p_business_name text,
  p_owner_name text,
  p_owner_email text,
  p_contact_email text,
  p_phone text,
  p_address text,
  p_city text,
  p_country text,
  p_website_url text,
  p_instagram_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $admin_create_business_owner_account_atomic$
declare
  v_application_id uuid;
  v_business_id uuid;
  v_slug_base text;
  v_slug_candidate text;
  v_slug_suffix integer := 2;
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = p_admin_user_id
      and p.primary_role = 'PLATFORM_ADMIN'
      and p.status = 'ACTIVE'
  ) then
    return jsonb_build_object('status', 'ADMIN_NOT_ALLOWED');
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_owner_user_id
      and lower(p.email) = lower(p_owner_email)
  ) then
    return jsonb_build_object('status', 'OWNER_PROFILE_NOT_FOUND');
  end if;

  v_slug_base := regexp_replace(
    translate(lower(coalesce(p_business_name, '')), 'åäö', 'aao'),
    '[^a-z0-9]+',
    '-',
    'g'
  );
  v_slug_base := regexp_replace(v_slug_base, '(^-+|-+$)', '', 'g');

  if v_slug_base = '' then
    v_slug_base := 'business';
  end if;

  v_slug_candidate := v_slug_base;

  while exists (
    select 1
    from public.businesses
    where slug = v_slug_candidate
  ) loop
    v_slug_candidate := v_slug_base || '-' || v_slug_suffix::text;
    v_slug_suffix := v_slug_suffix + 1;
  end loop;

  insert into public.business_applications (
    business_name,
    contact_name,
    contact_email,
    phone,
    address,
    city,
    country,
    website_url,
    instagram_url,
    message,
    status,
    reviewed_by,
    reviewed_at
  )
  values (
    p_business_name,
    p_owner_name,
    p_contact_email,
    nullif(p_phone, ''),
    p_address,
    p_city,
    p_country,
    nullif(p_website_url, ''),
    nullif(p_instagram_url, ''),
    'Created directly by platform admin.',
    'APPROVED',
    p_admin_user_id,
    now()
  )
  returning id into v_application_id;

  insert into public.businesses (
    name,
    slug,
    contact_email,
    phone,
    address,
    city,
    country,
    website_url,
    instagram_url,
    application_id
  )
  values (
    p_business_name,
    v_slug_candidate,
    p_contact_email,
    nullif(p_phone, ''),
    p_address,
    p_city,
    p_country,
    nullif(p_website_url, ''),
    nullif(p_instagram_url, ''),
    v_application_id
  )
  returning id into v_business_id;

  update public.profiles
  set
    display_name = nullif(p_owner_name, ''),
    primary_role = 'BUSINESS_OWNER',
    status = 'ACTIVE',
    updated_at = now()
  where id = p_owner_user_id;

  insert into public.business_staff (
    business_id,
    user_id,
    role,
    status,
    invited_by
  )
  values (
    v_business_id,
    p_owner_user_id,
    'OWNER',
    'ACTIVE',
    p_admin_user_id
  )
  on conflict (business_id, user_id) do update
  set
    role = 'OWNER',
    status = 'ACTIVE',
    invited_by = excluded.invited_by;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_admin_user_id,
    'BUSINESS_OWNER_ACCOUNT_CREATED',
    'businesses',
    v_business_id,
    jsonb_build_object(
      'applicationId', v_application_id,
      'ownerUserId', p_owner_user_id,
      'ownerEmail', p_owner_email,
      'businessSlug', v_slug_candidate
    )
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'applicationId', v_application_id,
    'businessId', v_business_id,
    'businessSlug', v_slug_candidate,
    'ownerUserId', p_owner_user_id
  );
exception
  when unique_violation then
    return jsonb_build_object('status', 'BUSINESS_ACCOUNT_CONFLICT');
end;
$admin_create_business_owner_account_atomic$;

revoke all on function public.admin_create_business_owner_account_atomic(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public;

revoke all on function public.admin_create_business_owner_account_atomic(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from anon;

revoke all on function public.admin_create_business_owner_account_atomic(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from authenticated;

grant execute on function public.admin_create_business_owner_account_atomic(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;
