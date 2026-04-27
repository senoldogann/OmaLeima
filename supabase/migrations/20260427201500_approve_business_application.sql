create or replace function public.approve_business_application_atomic(
  p_application_id uuid,
  p_reviewed_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $approve_business_application_atomic$
declare
  v_application public.business_applications%rowtype;
  v_business_id uuid;
  v_slug_base text;
  v_slug_candidate text;
  v_slug_suffix integer := 2;
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_reviewed_by
      and primary_role = 'PLATFORM_ADMIN'
      and status = 'ACTIVE'
  ) then
    return jsonb_build_object('status', 'ADMIN_NOT_ALLOWED');
  end if;

  select * into v_application
  from public.business_applications
  where id = p_application_id
  for update;

  if not found then
    return jsonb_build_object('status', 'APPLICATION_NOT_FOUND');
  end if;

  if v_application.status <> 'PENDING' then
    return jsonb_build_object(
      'status', 'APPLICATION_NOT_PENDING',
      'applicationStatus', v_application.status
    );
  end if;

  if exists (
    select 1
    from public.businesses
    where application_id = p_application_id
  ) then
    return jsonb_build_object('status', 'BUSINESS_ALREADY_CREATED');
  end if;

  v_slug_base := regexp_replace(
    translate(lower(coalesce(v_application.business_name, '')), 'åäö', 'aao'),
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

  insert into public.businesses (
    name,
    slug,
    contact_email,
    phone,
    address,
    city,
    country,
    latitude,
    longitude,
    website_url,
    instagram_url,
    application_id
  )
  values (
    v_application.business_name,
    v_slug_candidate,
    v_application.contact_email,
    v_application.phone,
    v_application.address,
    v_application.city,
    v_application.country,
    v_application.latitude,
    v_application.longitude,
    v_application.website_url,
    v_application.instagram_url,
    v_application.id
  )
  returning id into v_business_id;

  update public.business_applications
  set
    status = 'APPROVED',
    reviewed_by = p_reviewed_by,
    reviewed_at = now(),
    rejection_reason = null
  where id = p_application_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_reviewed_by,
    'BUSINESS_APPLICATION_APPROVED',
    'business_applications',
    p_application_id,
    jsonb_build_object(
      'businessId', v_business_id,
      'businessSlug', v_slug_candidate
    )
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'applicationId', p_application_id,
    'businessId', v_business_id,
    'businessSlug', v_slug_candidate
  );
exception
  when unique_violation then
    return jsonb_build_object('status', 'BUSINESS_SLUG_CONFLICT');
end;
$approve_business_application_atomic$;
