alter table public.login_slides
  add column if not exists eyebrow_fi text,
  add column if not exists title_fi text,
  add column if not exists body_fi text,
  add column if not exists image_alt_fi text,
  add column if not exists eyebrow_en text,
  add column if not exists title_en text,
  add column if not exists body_en text,
  add column if not exists image_alt_en text;

update public.login_slides
set
  eyebrow_fi = coalesce(nullif(btrim(eyebrow_fi), ''), eyebrow),
  title_fi = coalesce(nullif(btrim(title_fi), ''), title),
  body_fi = coalesce(nullif(btrim(body_fi), ''), body),
  image_alt_fi = coalesce(image_alt_fi, image_alt),
  eyebrow_en = coalesce(nullif(btrim(eyebrow_en), ''), eyebrow),
  title_en = coalesce(nullif(btrim(title_en), ''), title),
  body_en = coalesce(nullif(btrim(body_en), ''), body),
  image_alt_en = coalesce(image_alt_en, image_alt);

alter table public.login_slides
  alter column eyebrow_fi set not null,
  alter column title_fi set not null,
  alter column body_fi set not null,
  alter column image_alt_fi set not null,
  alter column eyebrow_en set not null,
  alter column title_en set not null,
  alter column body_en set not null,
  alter column image_alt_en set not null,
  alter column eyebrow_fi set default 'OmaLeima',
  alter column eyebrow_en set default 'OmaLeima',
  alter column image_alt_fi set default '',
  alter column image_alt_en set default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'login_slides_eyebrow_fi_length'
      and conrelid = 'public.login_slides'::regclass
  ) then
    alter table public.login_slides
      add constraint login_slides_eyebrow_fi_length
      check (char_length(btrim(eyebrow_fi)) between 2 and 40);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'login_slides_eyebrow_en_length'
      and conrelid = 'public.login_slides'::regclass
  ) then
    alter table public.login_slides
      add constraint login_slides_eyebrow_en_length
      check (char_length(btrim(eyebrow_en)) between 2 and 40);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'login_slides_title_fi_length'
      and conrelid = 'public.login_slides'::regclass
  ) then
    alter table public.login_slides
      add constraint login_slides_title_fi_length
      check (char_length(btrim(title_fi)) between 2 and 90);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'login_slides_title_en_length'
      and conrelid = 'public.login_slides'::regclass
  ) then
    alter table public.login_slides
      add constraint login_slides_title_en_length
      check (char_length(btrim(title_en)) between 2 and 90);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'login_slides_body_fi_length'
      and conrelid = 'public.login_slides'::regclass
  ) then
    alter table public.login_slides
      add constraint login_slides_body_fi_length
      check (char_length(btrim(body_fi)) between 8 and 260);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'login_slides_body_en_length'
      and conrelid = 'public.login_slides'::regclass
  ) then
    alter table public.login_slides
      add constraint login_slides_body_en_length
      check (char_length(btrim(body_en)) between 8 and 260);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'login_slides_image_alt_fi_length'
      and conrelid = 'public.login_slides'::regclass
  ) then
    alter table public.login_slides
      add constraint login_slides_image_alt_fi_length
      check (char_length(btrim(image_alt_fi)) <= 140);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'login_slides_image_alt_en_length'
      and conrelid = 'public.login_slides'::regclass
  ) then
    alter table public.login_slides
      add constraint login_slides_image_alt_en_length
      check (char_length(btrim(image_alt_en)) <= 140);
  end if;
end $$;
