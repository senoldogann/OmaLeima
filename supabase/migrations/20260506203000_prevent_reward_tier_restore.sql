create or replace function public.prevent_deleted_reward_tier_restore()
returns trigger
language plpgsql
security invoker
set search_path = public
as $prevent_deleted_reward_tier_restore$
begin
  if old.status = 'DELETED' and new.status is distinct from 'DELETED' then
    raise exception using
      errcode = 'P0001',
      message = 'REWARD_TIER_DELETED';
  end if;

  return new;
end;
$prevent_deleted_reward_tier_restore$;

drop trigger if exists prevent_deleted_reward_tier_restore on public.reward_tiers;

create trigger prevent_deleted_reward_tier_restore
before update on public.reward_tiers
for each row
execute function public.prevent_deleted_reward_tier_restore();
