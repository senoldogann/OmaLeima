create or replace function public.apply_business_default_logo()
returns trigger
language plpgsql
set search_path = public
as $apply_business_default_logo$
begin
  if nullif(btrim(new.logo_url), '') is null then
    new.logo_url := 'https://omaleima.fi/images/omaleima-logo-512.png';
  end if;

  return new;
end;
$apply_business_default_logo$;

drop trigger if exists apply_business_default_logo_before_write on public.businesses;
create trigger apply_business_default_logo_before_write
before insert or update of logo_url on public.businesses
for each row execute function public.apply_business_default_logo();

update public.businesses
set logo_url = 'https://omaleima.fi/images/omaleima-logo-512.png'
where nullif(btrim(logo_url), '') is null;

revoke execute on function public.apply_business_default_logo() from public, anon, authenticated;
