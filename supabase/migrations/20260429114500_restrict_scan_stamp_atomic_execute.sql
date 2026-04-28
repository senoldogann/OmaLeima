do $$
begin
  revoke execute on function public.scan_stamp_atomic(
    uuid,
    uuid,
    text,
    uuid,
    uuid,
    text,
    numeric,
    numeric,
    inet,
    text
  ) from public, anon, authenticated;

  grant execute on function public.scan_stamp_atomic(
    uuid,
    uuid,
    text,
    uuid,
    uuid,
    text,
    numeric,
    numeric,
    inet,
    text
  ) to service_role;
end
$$;
