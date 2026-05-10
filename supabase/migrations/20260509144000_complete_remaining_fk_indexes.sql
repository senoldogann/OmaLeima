create index if not exists idx_business_scanner_devices_scanner_user_all
on public.business_scanner_devices(scanner_user_id);

create index if not exists idx_department_tags_source_club_all
on public.department_tags(source_club_id);
