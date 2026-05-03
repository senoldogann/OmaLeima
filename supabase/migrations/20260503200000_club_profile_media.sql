alter table public.clubs
  add column if not exists cover_image_url text,
  add column if not exists announcement text;
