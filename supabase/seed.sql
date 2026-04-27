insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone_change,
  phone_change_token,
  email_change_token_current,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'admin@omaleima.test',
    crypt('password123', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Platform Admin"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'organizer@omaleima.test',
    crypt('password123', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Guild Organizer"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'scanner@omaleima.test',
    crypt('password123', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Venue Scanner"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    'student@omaleima.test',
    crypt('password123', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Student Tester"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do update
set
  instance_id = excluded.instance_id,
  aud = excluded.aud,
  role = excluded.role,
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  confirmation_token = excluded.confirmation_token,
  recovery_token = excluded.recovery_token,
  email_change_token_new = excluded.email_change_token_new,
  email_change = excluded.email_change,
  phone_change = excluded.phone_change,
  phone_change_token = excluded.phone_change_token,
  email_change_token_current = excluded.email_change_token_current,
  reauthentication_token = excluded.reauthentication_token,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = excluded.updated_at;

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    '01000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@omaleima.test"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '01000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '{"sub":"00000000-0000-0000-0000-000000000002","email":"organizer@omaleima.test"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '01000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    '{"sub":"00000000-0000-0000-0000-000000000003","email":"scanner@omaleima.test"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '01000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000004',
    '{"sub":"00000000-0000-0000-0000-000000000004","email":"student@omaleima.test"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  )
on conflict (provider, provider_id) do update
set
  user_id = excluded.user_id,
  identity_data = excluded.identity_data,
  last_sign_in_at = excluded.last_sign_in_at,
  updated_at = excluded.updated_at;

insert into public.profiles (id, email, display_name, primary_role)
values
  ('00000000-0000-0000-0000-000000000001', 'admin@omaleima.test', 'Platform Admin', 'PLATFORM_ADMIN'),
  ('00000000-0000-0000-0000-000000000002', 'organizer@omaleima.test', 'Guild Organizer', 'CLUB_ORGANIZER'),
  ('00000000-0000-0000-0000-000000000003', 'scanner@omaleima.test', 'Venue Scanner', 'BUSINESS_STAFF'),
  ('00000000-0000-0000-0000-000000000004', 'student@omaleima.test', 'Student Tester', 'STUDENT')
on conflict (id) do nothing;

insert into public.clubs (
  id,
  name,
  slug,
  university_name,
  city,
  contact_email
)
values (
  '10000000-0000-0000-0000-000000000001',
  'OmaLeima Test Guild',
  'omaleima-test-guild',
  'Aalto University',
  'Helsinki',
  'organizer@omaleima.test'
)
on conflict (id) do nothing;

insert into public.club_members (club_id, user_id, role)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'OWNER'
)
on conflict (club_id, user_id) do nothing;

insert into public.businesses (
  id,
  name,
  slug,
  contact_email,
  address,
  city
)
values (
  '20000000-0000-0000-0000-000000000001',
  'OmaLeima Test Bar',
  'omaleima-test-bar',
  'scanner@omaleima.test',
  'Testikatu 1',
  'Helsinki'
)
on conflict (id) do nothing;

insert into public.business_staff (business_id, user_id, role)
values (
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  'SCANNER'
)
on conflict (business_id, user_id) do nothing;

insert into public.events (
  id,
  club_id,
  name,
  slug,
  description,
  city,
  start_at,
  end_at,
  join_deadline_at,
  status,
  visibility,
  minimum_stamps_required,
  created_by
)
values (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'OmaLeima Test Appro',
  'omaleima-test-appro',
  'Seed event for local Supabase smoke testing.',
  'Helsinki',
  now() - interval '1 hour',
  now() + interval '5 hours',
  now() - interval '2 hours',
  'ACTIVE',
  'PUBLIC',
  1,
  '00000000-0000-0000-0000-000000000002'
)
on conflict (id) do nothing;

insert into public.event_venues (
  event_id,
  business_id,
  status,
  joined_by,
  joined_at,
  venue_order,
  stamp_label
)
values (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'JOINED',
  '00000000-0000-0000-0000-000000000003',
  now() - interval '3 hours',
  1,
  'Test Leima'
)
on conflict (event_id, business_id) do nothing;

insert into public.event_registrations (event_id, student_id)
values (
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000004'
)
on conflict (event_id, student_id) do nothing;

insert into public.reward_tiers (
  id,
  event_id,
  title,
  description,
  required_stamp_count,
  reward_type,
  inventory_total
)
values (
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'Test Haalarimerkki',
  'Seed reward for claim flow testing.',
  1,
  'HAALARIMERKKI',
  100
)
on conflict (id) do nothing;
