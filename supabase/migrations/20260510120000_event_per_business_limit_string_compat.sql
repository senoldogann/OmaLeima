create or replace function public.get_event_per_business_stamp_limit(p_rules jsonb)
returns integer
language sql
immutable
set search_path = public
as $get_event_per_business_stamp_limit$
  select least(
    greatest(
      coalesce(
        case
          when jsonb_typeof(p_rules #> '{stampPolicy,perBusinessLimit}') = 'number'
            then (p_rules #>> '{stampPolicy,perBusinessLimit}')::integer
          when (trim(p_rules #>> '{stampPolicy,perBusinessLimit}') ~ '^\s*[0-9]+\s*$')
            then trim(p_rules #>> '{stampPolicy,perBusinessLimit}')::integer
          else 1
        end,
        1
      ),
      1
    ),
    5
  );
$get_event_per_business_stamp_limit$;
