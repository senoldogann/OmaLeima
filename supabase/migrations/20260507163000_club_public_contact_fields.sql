alter table public.clubs
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists website_url text,
  add column if not exists instagram_url text;
