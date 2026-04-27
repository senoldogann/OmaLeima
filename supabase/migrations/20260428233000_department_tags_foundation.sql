create table public.department_tags (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  university_name text,
  city text,
  source_type text not null default 'USER'
    check (source_type in ('USER', 'CLUB', 'ADMIN')),
  source_club_id uuid references public.clubs(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  status text not null default 'ACTIVE'
    check (status in ('PENDING_REVIEW', 'ACTIVE', 'MERGED', 'BLOCKED')),
  merged_into_tag_id uuid references public.department_tags(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (btrim(title) <> ''),
  check (btrim(slug) <> ''),
  check (merged_into_tag_id is null or merged_into_tag_id <> id)
);

create table public.profile_department_tags (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  department_tag_id uuid not null references public.department_tags(id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  is_primary boolean not null default false,
  source_type text not null default 'SELF_SELECTED'
    check (source_type in ('SELF_SELECTED', 'CLUB_ASSIGNED', 'ADMIN_ASSIGNED')),
  created_at timestamptz not null default now(),
  unique (profile_id, department_tag_id),
  unique (profile_id, slot)
);

create unique index idx_profile_department_tags_one_primary
on public.profile_department_tags(profile_id)
where is_primary = true;

create index idx_department_tags_active_title
on public.department_tags(title)
where status = 'ACTIVE';

create index idx_department_tags_source_club
on public.department_tags(source_club_id)
where source_club_id is not null;

create index idx_profile_department_tags_profile_created_at
on public.profile_department_tags(profile_id, created_at desc);

create or replace function public.normalize_department_tag()
returns trigger
language plpgsql
security definer
set search_path = public
as $normalize_department_tag$
declare
  v_target_status text;
begin
  new.title := regexp_replace(btrim(new.title), '\s+', ' ', 'g');
  new.slug := lower(regexp_replace(btrim(new.slug), '\s+', '-', 'g'));

  if new.title = '' then
    raise exception 'DEPARTMENT_TAG_TITLE_REQUIRED';
  end if;

  if new.slug = '' then
    raise exception 'DEPARTMENT_TAG_SLUG_REQUIRED';
  end if;

  if new.source_type = 'USER' and new.source_club_id is not null then
    raise exception 'DEPARTMENT_TAG_USER_SOURCE_CLUB_FORBIDDEN';
  end if;

  if new.source_type = 'CLUB' and new.source_club_id is null then
    raise exception 'DEPARTMENT_TAG_CLUB_SOURCE_REQUIRES_CLUB';
  end if;

  if new.source_type = 'ADMIN' and new.source_club_id is not null then
    raise exception 'DEPARTMENT_TAG_ADMIN_SOURCE_CLUB_FORBIDDEN';
  end if;

  if new.status = 'MERGED' and new.merged_into_tag_id is null then
    raise exception 'DEPARTMENT_TAG_MERGED_TARGET_REQUIRED';
  end if;

  if new.status <> 'MERGED' and new.merged_into_tag_id is not null then
    raise exception 'DEPARTMENT_TAG_MERGED_TARGET_FORBIDDEN';
  end if;

  if new.merged_into_tag_id is not null then
    select status
    into v_target_status
    from public.department_tags
    where id = new.merged_into_tag_id;

    if not found then
      raise exception 'DEPARTMENT_TAG_MERGE_TARGET_NOT_FOUND';
    end if;

    if v_target_status <> 'ACTIVE' then
      raise exception 'DEPARTMENT_TAG_MERGE_TARGET_NOT_ACTIVE';
    end if;
  end if;

  return new;
end;
$normalize_department_tag$;

create or replace function public.validate_profile_department_tag()
returns trigger
language plpgsql
security definer
set search_path = public
as $validate_profile_department_tag$
declare
  v_profile_role text;
  v_profile_status text;
  v_tag_status text;
  v_tag_merged_into_tag_id uuid;
  v_assigned_slot smallint;
begin
  select primary_role, status
  into v_profile_role, v_profile_status
  from public.profiles
  where id = new.profile_id;

  if not found then
    raise exception 'PROFILE_DEPARTMENT_TAG_PROFILE_NOT_FOUND';
  end if;

  if v_profile_role <> 'STUDENT' then
    raise exception 'PROFILE_DEPARTMENT_TAG_ROLE_NOT_ALLOWED';
  end if;

  if v_profile_status <> 'ACTIVE' then
    raise exception 'PROFILE_DEPARTMENT_TAG_PROFILE_NOT_ACTIVE';
  end if;

  select status, merged_into_tag_id
  into v_tag_status, v_tag_merged_into_tag_id
  from public.department_tags
  where id = new.department_tag_id;

  if not found then
    raise exception 'PROFILE_DEPARTMENT_TAG_TAG_NOT_FOUND';
  end if;

  if v_tag_merged_into_tag_id is not null then
    raise exception 'PROFILE_DEPARTMENT_TAG_TAG_MERGED';
  end if;

  if v_tag_status <> 'ACTIVE' then
    raise exception 'PROFILE_DEPARTMENT_TAG_TAG_NOT_ACTIVE';
  end if;

  if tg_op = 'UPDATE' and new.profile_id = old.profile_id then
    new.slot := old.slot;
  else
    select candidate.slot
    into v_assigned_slot
    from generate_series(1, 3) as candidate(slot)
    where not exists (
      select 1
      from public.profile_department_tags existing_link
      where existing_link.profile_id = new.profile_id
        and existing_link.slot = candidate.slot
        and (tg_op = 'INSERT' or existing_link.id <> old.id)
    )
    order by candidate.slot
    limit 1;

    if v_assigned_slot is null then
      raise exception 'PROFILE_DEPARTMENT_TAG_LIMIT_REACHED';
    end if;

    new.slot := v_assigned_slot;
  end if;

  return new;
end;
$validate_profile_department_tag$;

create or replace function public.sync_department_tag_profile_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $sync_department_tag_profile_links$
begin
  if new.merged_into_tag_id is not null then
    update public.profile_department_tags target_link
    set is_primary = true
    where target_link.department_tag_id = new.merged_into_tag_id
      and target_link.is_primary = false
      and exists (
        select 1
        from public.profile_department_tags source_link
        where source_link.department_tag_id = new.id
          and source_link.profile_id = target_link.profile_id
          and source_link.is_primary = true
      );

    delete from public.profile_department_tags source_link
    using public.profile_department_tags target_link
    where source_link.department_tag_id = new.id
      and target_link.department_tag_id = new.merged_into_tag_id
      and target_link.profile_id = source_link.profile_id;

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

create or replace function public.sync_profile_department_tags_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $sync_profile_department_tags_for_profile$
begin
  if new.primary_role <> 'STUDENT' or new.status <> 'ACTIVE' then
    delete from public.profile_department_tags
    where profile_id = new.id;
  end if;

  return new;
end;
$sync_profile_department_tags_for_profile$;

create trigger set_department_tags_updated_at
before update on public.department_tags
for each row execute function public.set_updated_at();

create trigger normalize_department_tags_before_write
before insert or update on public.department_tags
for each row execute function public.normalize_department_tag();

create trigger validate_profile_department_tags_before_write
before insert or update on public.profile_department_tags
for each row execute function public.validate_profile_department_tag();

create trigger sync_department_tag_profile_links_after_update
after update on public.department_tags
for each row
when (
  old.status is distinct from new.status
  or old.merged_into_tag_id is distinct from new.merged_into_tag_id
)
execute function public.sync_department_tag_profile_links();

create trigger sync_profile_department_tags_after_profile_update
after update on public.profiles
for each row
when (
  old.primary_role is distinct from new.primary_role
  or old.status is distinct from new.status
)
execute function public.sync_profile_department_tags_for_profile();

alter table public.department_tags enable row level security;
alter table public.profile_department_tags enable row level security;

create policy "public can read active department tags"
on public.department_tags
for select
using (status = 'ACTIVE' or public.is_platform_admin());

create policy "authenticated users can create custom department tags"
on public.department_tags
for insert
to authenticated
with check (
  auth.uid() is not null
  and created_by = auth.uid()
  and source_type = 'USER'
  and source_club_id is null
  and status = 'ACTIVE'
  and merged_into_tag_id is null
);

create policy "club staff can create official department tags"
on public.department_tags
for insert
to authenticated
with check (
  auth.uid() is not null
  and created_by = auth.uid()
  and source_type = 'CLUB'
  and source_club_id is not null
  and public.is_club_staff_for(source_club_id)
  and status = 'ACTIVE'
  and merged_into_tag_id is null
);

create policy "platform admins can manage department tags"
on public.department_tags
for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "users can read own profile department tags"
on public.profile_department_tags
for select
using (profile_id = auth.uid() or public.is_platform_admin());

create policy "users can insert own self selected profile department tags"
on public.profile_department_tags
for insert
to authenticated
with check (
  profile_id = auth.uid()
  and source_type = 'SELF_SELECTED'
);

create policy "users can update own self selected profile department tags"
on public.profile_department_tags
for update
to authenticated
using (
  profile_id = auth.uid()
  and source_type = 'SELF_SELECTED'
)
with check (
  profile_id = auth.uid()
  and source_type = 'SELF_SELECTED'
);

create policy "users can delete own self selected profile department tags"
on public.profile_department_tags
for delete
to authenticated
using (
  profile_id = auth.uid()
  and source_type = 'SELF_SELECTED'
);

create policy "platform admins can manage profile department tags"
on public.profile_department_tags
for all
using (public.is_platform_admin())
with check (public.is_platform_admin());
