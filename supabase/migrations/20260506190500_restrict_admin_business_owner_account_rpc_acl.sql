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
