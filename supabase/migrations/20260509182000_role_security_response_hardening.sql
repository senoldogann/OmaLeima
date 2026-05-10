do $$
declare
  function_record record;
  hardened_search_path text;
begin
  for function_record in
    select
      namespace.nspname as schema_name,
      procedure.proname as function_name,
      pg_get_function_identity_arguments(procedure.oid) as function_arguments,
      substring(config_item from '^search_path=(.*)$') as search_path
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    cross join lateral unnest(procedure.proconfig) as config_item
    where namespace.nspname = 'public'
      and procedure.prosecdef
      and config_item like 'search_path=%'
      and config_item not like '%pg_temp%'
  loop
    hardened_search_path := function_record.search_path || ', pg_temp';

    execute format(
      'alter function %I.%I(%s) set search_path to %s',
      function_record.schema_name,
      function_record.function_name,
      function_record.function_arguments,
      hardened_search_path
    );
  end loop;
end;
$$;

alter function public.leave_business_event_atomic(uuid, uuid, uuid)
  set search_path = public, pg_temp;

alter function public.join_business_event_atomic(uuid, uuid, uuid)
  set search_path = public, pg_temp;
