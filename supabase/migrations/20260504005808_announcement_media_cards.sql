alter table public.announcements
  add column if not exists image_url text;

alter table public.announcements
  drop constraint if exists announcements_image_url_length_check;

alter table public.announcements
  add constraint announcements_image_url_length_check
  check (image_url is null or char_length(btrim(image_url)) between 8 and 500);
