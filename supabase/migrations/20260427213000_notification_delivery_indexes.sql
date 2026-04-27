create index if not exists idx_device_tokens_user_enabled
on public.device_tokens(user_id, enabled);

create index if not exists idx_notifications_event_type_user
on public.notifications(event_id, type, user_id, created_at desc);
