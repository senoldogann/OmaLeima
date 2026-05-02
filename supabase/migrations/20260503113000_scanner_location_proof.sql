create or replace function public.create_scanner_distance_fraud_signal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_latitude numeric;
  v_business_longitude numeric;
  v_distance_meters numeric;
  v_severity text;
begin
  if NEW.scanner_latitude is null or NEW.scanner_longitude is null then
    return NEW;
  end if;

  select latitude, longitude
  into v_business_latitude, v_business_longitude
  from public.businesses
  where id = NEW.business_id;

  if v_business_latitude is null or v_business_longitude is null then
    return NEW;
  end if;

  v_distance_meters :=
    6371000 * 2 * asin(
      sqrt(
        power(sin(radians((NEW.scanner_latitude - v_business_latitude) / 2)), 2) +
        cos(radians(v_business_latitude)) *
        cos(radians(NEW.scanner_latitude)) *
        power(sin(radians((NEW.scanner_longitude - v_business_longitude) / 2)), 2)
      )
    );

  if v_distance_meters <= 300 then
    return NEW;
  end if;

  v_severity := case
    when v_distance_meters >= 1500 then 'HIGH'
    when v_distance_meters >= 750 then 'MEDIUM'
    else 'LOW'
  end;

  insert into public.fraud_signals (
    event_id,
    student_id,
    business_id,
    scanner_user_id,
    type,
    severity,
    description,
    metadata
  )
  values (
    NEW.event_id,
    NEW.student_id,
    NEW.business_id,
    NEW.scanner_user_id,
    'SCANNER_DISTANCE_ANOMALY',
    v_severity,
    'Scanner location was far from the venue coordinates during a successful leima scan.',
    jsonb_build_object(
      'stampId', NEW.id,
      'qrJti', NEW.qr_jti,
      'distanceMeters', round(v_distance_meters),
      'scannerLatitude', NEW.scanner_latitude,
      'scannerLongitude', NEW.scanner_longitude,
      'businessLatitude', v_business_latitude,
      'businessLongitude', v_business_longitude,
      'thresholdMeters', 300
    )
  );

  return NEW;
end;
$$;

drop trigger if exists create_scanner_distance_fraud_signal_on_stamp on public.stamps;

create trigger create_scanner_distance_fraud_signal_on_stamp
after insert on public.stamps
for each row
execute function public.create_scanner_distance_fraud_signal();
