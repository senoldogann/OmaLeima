-- Halka açık iletişim formu için tablo ve dosya yükleme bucket'ı.
-- Anonim kullanıcılar yalnızca INSERT yapabilir; okuma/güncelleme/silme yetkisi yoktur.

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

-- Anonim INSERT politikası (yalnızca yeni kayıt ekleyebilir)
drop policy if exists "Anyone can submit a contact form" on public.public_contact_submissions;
create policy "Anyone can submit a contact form"
  on public.public_contact_submissions
  for insert
  to anon, authenticated
  with check (status = 'new');

-- Service_role tam erişimli (Edge Function ve scheduled job senaryoları için)
drop policy if exists "Service role can read submissions" on public.public_contact_submissions;
create policy "Service role can read submissions"
  on public.public_contact_submissions
  for select
  to service_role
  using (true);

-- Platform admin tüm kayıtları okuyabilir
drop policy if exists "Platform admins can read submissions" on public.public_contact_submissions;
create policy "Platform admins can read submissions"
  on public.public_contact_submissions
  for select
  to authenticated
  using (public.is_platform_admin());

-- Platform admin status alanını güncelleyebilir (in_review/closed/spam)
drop policy if exists "Platform admins can update submissions" on public.public_contact_submissions;
create policy "Platform admins can update submissions"
  on public.public_contact_submissions
  for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Storage bucket: contact-attachments
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

-- Anonim kullanıcılar contact-attachments bucket'ına dosya yükleyebilir
drop policy if exists "Anyone can upload contact attachments" on storage.objects;
create policy "Anyone can upload contact attachments"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'contact-attachments');

-- Sadece service_role indirme yapabilir
drop policy if exists "Service role can read contact attachments" on storage.objects;
create policy "Service role can read contact attachments"
  on storage.objects
  for select
  to service_role
  using (bucket_id = 'contact-attachments');

-- Platform admin contact-attachments bucket'ındaki dosyaları okuyabilir (signed URL için)
drop policy if exists "Platform admins can read contact attachments" on storage.objects;
create policy "Platform admins can read contact attachments"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'contact-attachments' and public.is_platform_admin());
