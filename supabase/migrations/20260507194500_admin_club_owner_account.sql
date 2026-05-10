drop function if exists public.admin_create_club_owner_account_atomic(
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
  text,
  text,
  text,
  text,
  text
);

create or replace function public.admin_create_club_owner_account_atomic(
  p_admin_user_id uuid,
  p_owner_user_id uuid,
  p_club_name text,
  p_owner_name text,
  p_owner_email text,
  p_contact_email text,
  p_university_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_country text,
  p_website_url text,
  p_instagram_url text,
  p_logo_url text,
  p_cover_image_url text,
  p_announcement text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_owner_profile public.profiles%rowtype;
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

  select *
  into v_owner_profile
  from public.profiles p
  where p.id = p_owner_user_id
    and lower(p.email) = lower(p_owner_email)
  for update;

  if not found then
    return jsonb_build_object('status', 'OWNER_PROFILE_NOT_FOUND');
  end if;

  if v_owner_profile.primary_role <> 'STUDENT'
    or exists (
      select 1
      from public.business_staff bs
      where bs.user_id = p_owner_user_id
    )
    or exists (
      select 1
      from public.club_members cm
      where cm.user_id = p_owner_user_id
    )
  then
    return jsonb_build_object('status', 'OWNER_PROFILE_NOT_ELIGIBLE');
  end if;

  v_slug_base := regexp_replace(
    translate(lower(coalesce(p_club_name, '')), 'åäö', 'aao'),
    '[^a-z0-9]+',
    '-',
    'g'
  );
  v_slug_base := regexp_replace(v_slug_base, '(^-+|-+$)', '', 'g');

  if v_slug_base = '' then
    v_slug_base := 'organization';
  end if;

  v_slug_candidate := v_slug_base;

  while exists (
    select 1
    from public.clubs
    where slug = v_slug_candidate
  ) loop
    v_slug_candidate := v_slug_base || '-' || v_slug_suffix::text;
    v_slug_suffix := v_slug_suffix + 1;
  end loop;

  insert into public.clubs (
    name,
    slug,
    university_name,
    city,
    country,
    logo_url,
    cover_image_url,
    contact_email,
    phone,
    address,
    website_url,
    instagram_url,
    announcement,
    status
  )
  values (
    p_club_name,
    v_slug_candidate,
    nullif(p_university_name, ''),
    nullif(p_city, ''),
    p_country,
    nullif(p_logo_url, ''),
    nullif(p_cover_image_url, ''),
    p_contact_email,
    nullif(p_phone, ''),
    nullif(p_address, ''),
    nullif(p_website_url, ''),
    nullif(p_instagram_url, ''),
    nullif(p_announcement, ''),
    'ACTIVE'
  )
  returning id into v_club_id;

  update public.profiles
  set
    display_name = nullif(p_owner_name, ''),
    primary_role = 'CLUB_ORGANIZER',
    status = 'ACTIVE',
    updated_at = now()
  where id = p_owner_user_id;

  insert into public.club_members (
    club_id,
    user_id,
    role,
    status
  )
  values (
    v_club_id,
    p_owner_user_id,
    'OWNER',
    'ACTIVE'
  );

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_admin_user_id,
    'CLUB_OWNER_ACCOUNT_CREATED',
    'clubs',
    v_club_id,
    jsonb_build_object(
      'ownerUserId', p_owner_user_id,
      'ownerEmail', p_owner_email,
      'clubSlug', v_slug_candidate,
      'contactEmail', p_contact_email
    )
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'clubId', v_club_id,
    'clubSlug', v_slug_candidate,
    'ownerUserId', p_owner_user_id
  );
exception
  when unique_violation then
    return jsonb_build_object('status', 'CLUB_ACCOUNT_CONFLICT');
end;
$$;

revoke all on function public.admin_create_club_owner_account_atomic(
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
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.admin_create_club_owner_account_atomic(
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
  text,
  text,
  text,
  text,
  text
) to service_role;
