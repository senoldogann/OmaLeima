alter function public.set_business_scanner_device_pin(uuid, text)
  set search_path = public, extensions;

alter function public.scan_stamp_atomic(
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  text,
  text,
  numeric,
  numeric,
  inet,
  text
)
  set search_path = public, extensions;
