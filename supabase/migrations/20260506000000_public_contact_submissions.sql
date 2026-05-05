-- Public contact form submissions and private attachment storage.
-- Public clients cannot write directly; the Next.js route validates abuse controls and writes with service_role.

create table if not exists public.public_contact_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  subject text not null check (subject in ('business_signup', 'collaboration', 'pilot', 'press', 'other')),
  name text not null check (length(name) between 2 and 120),
  email text not null check (length(email) between 5 and 200),
  organization text check (organization is null or length(organization) <= 200),
  message text not null check (length(message) between 10 and 5000),
  attachment_path text,
  source_locale text not null default 'fi' check (source_locale in ('fi', 'en')),
  ip_hash text,
  user_agent text,
  status text not null default 'new' check (status in ('new', 'in_review', 'closed', 'spam'))
);

create index if not exists public_contact_submissions_created_at_idx
  on public.public_contact_submissions (created_at desc);

create index if not exists public_contact_submissions_status_idx
  on public.public_contact_submissions (status);

alter table public.public_contact_submissions enable row level security;

drop policy if exists "Anyone can submit a contact form" on public.public_contact_submissions;
drop policy if exists "Service role can submit contact forms" on public.public_contact_submissions;
create policy "Service role can submit contact forms"
  on public.public_contact_submissions
  for insert
  to service_role
  with check (status = 'new');

drop policy if exists "Service role can read submissions" on public.public_contact_submissions;
create policy "Service role can read submissions"
  on public.public_contact_submissions
  for select
  to service_role
  using (true);

drop policy if exists "Platform admins can read submissions" on public.public_contact_submissions;
create policy "Platform admins can read submissions"
  on public.public_contact_submissions
  for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "Platform admins can update submissions" on public.public_contact_submissions;
create policy "Platform admins can update submissions"
  on public.public_contact_submissions
  for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contact-attachments',
  'contact-attachments',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can upload contact attachments" on storage.objects;
drop policy if exists "Service role can upload contact attachments" on storage.objects;
create policy "Service role can upload contact attachments"
  on storage.objects
  for insert
  to service_role
  with check (bucket_id = 'contact-attachments');

drop policy if exists "Service role can read contact attachments" on storage.objects;
create policy "Service role can read contact attachments"
  on storage.objects
  for select
  to service_role
  using (bucket_id = 'contact-attachments');

drop policy if exists "Platform admins can read contact attachments" on storage.objects;
create policy "Platform admins can read contact attachments"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'contact-attachments' and public.is_platform_admin());
