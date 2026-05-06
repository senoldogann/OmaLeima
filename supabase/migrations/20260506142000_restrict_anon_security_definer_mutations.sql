revoke execute on function public.approve_business_application_atomic(uuid, uuid) from public, anon;
revoke execute on function public.block_department_tag_atomic(uuid) from public, anon;
revoke execute on function public.cancel_event_registration_atomic(uuid, uuid) from public, anon;
revoke execute on function public.claim_reward_atomic(uuid, uuid, uuid, uuid, text) from public, anon;
revoke execute on function public.clear_business_scanner_device_pin(uuid) from public, anon;
revoke execute on function public.create_business_owner_access_atomic(uuid, uuid, uuid) from public, anon;
revoke execute on function public.create_club_department_tag_atomic(uuid, text, uuid) from public, anon;
revoke execute on function public.create_club_event_atomic(
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamp with time zone,
  timestamp with time zone,
  timestamp with time zone,
  text,
  integer,
  integer,
  jsonb,
  uuid
) from public, anon;
revoke execute on function public.create_reward_tier_atomic(uuid, text, text, integer, text, integer, text, uuid) from public, anon;
revoke execute on function public.create_scanner_distance_fraud_signal() from public, anon;
revoke execute on function public.handle_new_auth_user() from public, anon;
revoke execute on function public.is_active_profile(uuid) from public, anon;
revoke execute on function public.join_business_event_atomic(uuid, uuid, uuid) from public, anon;
revoke execute on function public.leave_business_event_atomic(uuid, uuid, uuid) from public, anon;
revoke execute on function public.merge_department_tag_atomic(uuid, uuid) from public, anon;
revoke execute on function public.normalize_department_tag() from public, anon;
revoke execute on function public.protect_profile_sensitive_fields() from public, anon;
revoke execute on function public.provision_business_scanner_device_atomic(text, uuid, uuid, text, text, text, text, uuid) from public, anon;
revoke execute on function public.record_announcement_impressions(uuid[]) from public, anon;
revoke execute on function public.register_business_scanner_device(uuid, text, text, text, text) from public, anon;
revoke execute on function public.register_event_atomic(uuid, uuid) from public, anon;
revoke execute on function public.reject_business_application_atomic(uuid, uuid, text) from public, anon;
revoke execute on function public.rename_business_scanner_device(uuid, text) from public, anon;
revoke execute on function public.revoke_business_scanner_device(uuid) from public, anon;
revoke execute on function public.rls_auto_enable() from public, anon;
revoke execute on function public.set_business_scanner_device_pin(uuid, text) from public, anon;
revoke execute on function public.sync_department_tag_profile_links() from public, anon;
revoke execute on function public.sync_profile_department_tags_for_profile() from public, anon;
revoke execute on function public.update_event_leaderboard(uuid) from public, anon;
revoke execute on function public.update_reward_tier_atomic(uuid, text, text, integer, text, integer, text, text, uuid) from public, anon;
revoke execute on function public.validate_profile_department_tag() from public, anon;

grant execute on function public.approve_business_application_atomic(uuid, uuid) to authenticated, service_role;
grant execute on function public.block_department_tag_atomic(uuid) to authenticated, service_role;
grant execute on function public.cancel_event_registration_atomic(uuid, uuid) to authenticated, service_role;
grant execute on function public.claim_reward_atomic(uuid, uuid, uuid, uuid, text) to authenticated, service_role;
grant execute on function public.clear_business_scanner_device_pin(uuid) to authenticated, service_role;
grant execute on function public.create_business_owner_access_atomic(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.create_club_department_tag_atomic(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.create_club_event_atomic(
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamp with time zone,
  timestamp with time zone,
  timestamp with time zone,
  text,
  integer,
  integer,
  jsonb,
  uuid
) to authenticated, service_role;
grant execute on function public.create_reward_tier_atomic(uuid, text, text, integer, text, integer, text, uuid) to authenticated, service_role;
grant execute on function public.create_scanner_distance_fraud_signal() to authenticated, service_role;
grant execute on function public.handle_new_auth_user() to authenticated, service_role;
grant execute on function public.is_active_profile(uuid) to authenticated, service_role;
grant execute on function public.join_business_event_atomic(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.leave_business_event_atomic(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.merge_department_tag_atomic(uuid, uuid) to authenticated, service_role;
grant execute on function public.normalize_department_tag() to authenticated, service_role;
grant execute on function public.protect_profile_sensitive_fields() to authenticated, service_role;
grant execute on function public.provision_business_scanner_device_atomic(text, uuid, uuid, text, text, text, text, uuid) to authenticated, service_role;
grant execute on function public.record_announcement_impressions(uuid[]) to authenticated, service_role;
grant execute on function public.register_business_scanner_device(uuid, text, text, text, text) to authenticated, service_role;
grant execute on function public.register_event_atomic(uuid, uuid) to authenticated, service_role;
grant execute on function public.reject_business_application_atomic(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.rename_business_scanner_device(uuid, text) to authenticated, service_role;
grant execute on function public.revoke_business_scanner_device(uuid) to authenticated, service_role;
grant execute on function public.rls_auto_enable() to authenticated, service_role;
grant execute on function public.set_business_scanner_device_pin(uuid, text) to authenticated, service_role;
grant execute on function public.sync_department_tag_profile_links() to authenticated, service_role;
grant execute on function public.sync_profile_department_tags_for_profile() to authenticated, service_role;
grant execute on function public.update_event_leaderboard(uuid) to authenticated, service_role;
grant execute on function public.update_reward_tier_atomic(uuid, text, text, integer, text, integer, text, text, uuid) to authenticated, service_role;
grant execute on function public.validate_profile_department_tag() to authenticated, service_role;

alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public grant execute on functions to authenticated, service_role;
