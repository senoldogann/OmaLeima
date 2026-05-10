import { randomUUID } from "node:crypto";

import {
  createAuthedClientAsync,
  getAccessTokenAsync,
  invokeFunctionAsync,
  readSqlTextAsync,
  runSqlAsync,
  seededBusinessId,
  seededClubId,
  seededOrganizerProfileId,
  seededPassword,
  seededScannerEmail,
  seededScannerProfileId,
  seededStudentEmail,
  seededStudentProfileId,
} from "./_shared/function-smoke";

type RaceFixture = {
  eventId: string;
  eventVenueId: string;
  scannerEmail: string;
  scannerProfileId: string;
  scannerDeviceIdA: string;
  scannerDeviceIdB: string;
};

const seedRaceFixtureAsync = async (suffix: string): Promise<RaceFixture> => {
  const eventId = randomUUID();
  const eventVenueId = randomUUID();
  const scannerProfileId = randomUUID();
  const scannerDeviceIdA = randomUUID();
  const scannerDeviceIdB = randomUUID();
  const scannerEmail = `scan-race-${suffix.toLowerCase()}@example.test`;
  const eventSlug = `scan-race-event-${suffix.toLowerCase()}`;
  const sql = `
    begin;

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
    ) values (
      '00000000-0000-0000-0000-000000000000',
      '${scannerProfileId}',
      'authenticated',
      'authenticated',
      '${scannerEmail}',
      crypt('${seededPassword}', gen_salt('bf')),
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
      '{"display_name":"Scan Race Staff ${suffix}"}'::jsonb,
      now(),
      now()
    );

    insert into public.profiles (
      id,
      email,
      display_name,
      primary_role,
      status
    ) values (
      '${scannerProfileId}',
      '${scannerEmail}',
      'Scan Race Staff ${suffix}',
      'BUSINESS_STAFF',
      'ACTIVE'
    )
    on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        primary_role = excluded.primary_role,
        status = excluded.status;

    insert into public.business_staff (
      id,
      business_id,
      user_id,
      role,
      status
    ) values (
      '${randomUUID()}',
      '${seededBusinessId}',
      '${scannerProfileId}',
      'SCANNER',
      'ACTIVE'
    );

    insert into public.business_scanner_devices (
      id,
      business_id,
      installation_id,
      label,
      platform,
      status,
      created_by
    ) values (
      '${scannerDeviceIdA}',
      '${seededBusinessId}',
      'inst-a-${suffix}',
      'Race Test Scanner A',
      'WEB',
      'ACTIVE',
      '${seededScannerProfileId}'
    ), (
      '${scannerDeviceIdB}',
      '${seededBusinessId}',
      'inst-b-${suffix}',
      'Race Test Scanner B',
      'WEB',
      'ACTIVE',
      '${scannerProfileId}'
    );

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
    ) values (
      '${eventId}',
      '${seededClubId}',
      'Scan Race Event ${suffix}',
      '${eventSlug}',
      'Fixture event for duplicate scan race testing.',
      'Helsinki',
      now() - interval '15 minutes',
      now() + interval '2 hours',
      now() - interval '75 minutes',
      'ACTIVE',
      'PUBLIC',
      '1',
      '${seededOrganizerProfileId}'
    );

    insert into public.event_venues (
      id,
      event_id,
      business_id,
      status,
      joined_by,
      joined_at,
      venue_order,
      stamp_label
    ) values (
      '${eventVenueId}',
      '${eventId}',
      '${seededBusinessId}',
      'JOINED',
      '${seededScannerProfileId}',
      now() - interval '45 minutes',
      1,
      'Race Smoke Stamp'
    );

    insert into public.event_registrations (
      event_id,
      student_id
    ) values (
      '${eventId}',
      '${seededStudentProfileId}'
    );

    commit;
  `;

  await runSqlAsync(sql);

  return {
    eventId,
    eventVenueId,
    scannerEmail,
    scannerProfileId,
    scannerDeviceIdA,
    scannerDeviceIdB,
  };
};

const cleanupRaceFixtureAsync = async (fixture: RaceFixture): Promise<void> => {
  const sql = `
    begin;

    delete from public.audit_logs
    where action = 'STAMP_CREATED'
      and metadata->>'eventId' = '${fixture.eventId}';

    delete from public.stamps
    where event_id = '${fixture.eventId}'::uuid;

    delete from public.qr_token_uses
    where event_id = '${fixture.eventId}'::uuid;

    delete from public.event_registrations
    where event_id = '${fixture.eventId}'::uuid;

    delete from public.event_venues
    where event_id = '${fixture.eventId}'::uuid;

    delete from public.events
    where id = '${fixture.eventId}'::uuid;

    delete from public.business_scanner_devices
    where id in ('${fixture.scannerDeviceIdA}'::uuid, '${fixture.scannerDeviceIdB}'::uuid);

    delete from public.business_staff
    where user_id = '${fixture.scannerProfileId}'::uuid;

    delete from public.profiles
    where id = '${fixture.scannerProfileId}'::uuid;

    delete from auth.users
    where id = '${fixture.scannerProfileId}'::uuid;

    commit;
  `;

  await runSqlAsync(sql);
};

const run = async (): Promise<void> => {
  const outputs: string[] = [];
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const seededScannerClient = await createAuthedClientAsync(seededScannerEmail, seededPassword);
  const studentClient = await createAuthedClientAsync(seededStudentEmail, seededPassword);
  let fixture: RaceFixture | null = null;
  let secondScannerClient: Awaited<ReturnType<typeof createAuthedClientAsync>> | null = null;
  let runError: Error | null = null;

  try {
    fixture = await seedRaceFixtureAsync(suffix);
    secondScannerClient = await createAuthedClientAsync(fixture.scannerEmail, seededPassword);

    const studentAccessToken = await getAccessTokenAsync(studentClient);
    const seededScannerAccessToken = await getAccessTokenAsync(seededScannerClient);
    const secondScannerAccessToken = await getAccessTokenAsync(secondScannerClient);

    const generateResult = await invokeFunctionAsync("generate-qr-token", studentAccessToken, {
      eventId: fixture.eventId,
    });
    const qrToken = generateResult.responseBody.qrPayload?.token;

    if (generateResult.status !== 200 || typeof qrToken !== "string") {
      throw new Error(
        `Expected race fixture generate-qr-token to return 200, got ${generateResult.status} ${generateResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push("generate-valid:ok");

    const [scanA, scanB] = await Promise.all([
      invokeFunctionAsync("scan-qr", seededScannerAccessToken, {
        businessId: seededBusinessId,
        eventId: fixture.eventId,
        eventVenueId: fixture.eventVenueId,
        qrToken,
        scannerDeviceId: fixture.scannerDeviceIdA,
      }),
      invokeFunctionAsync("scan-qr", secondScannerAccessToken, {
        businessId: seededBusinessId,
        eventId: fixture.eventId,
        eventVenueId: fixture.eventVenueId,
        qrToken,
        scannerDeviceId: fixture.scannerDeviceIdB,
      }),
    ]);

    const statuses = [scanA.responseBody.status, scanB.responseBody.status].sort();

    if (scanA.status !== 200 || scanB.status !== 200) {
      throw new Error(
        `Expected concurrent scan responses to both return 200, got ${scanA.status} and ${scanB.status}: ${JSON.stringify([scanA.responseBody, scanB.responseBody])}.`
      );
    }

    if (
      statuses[1] !== "SUCCESS" ||
      (statuses[0] !== "QR_ALREADY_USED_OR_REPLAYED" && statuses[0] !== "ALREADY_STAMPED")
    ) {
      throw new Error(
        `Expected concurrent scan statuses to be SUCCESS and a safe duplicate rejection, got ${statuses.join(",")}.`
      );
    }

    outputs.push(`race-statuses:${statuses.join(",")}`);

    const stampCount = await readSqlTextAsync(`
      select count(*)
      from public.stamps
      where event_id = '${fixture.eventId}'::uuid;
    `);
    const qrUseCount = await readSqlTextAsync(`
      select count(*)
      from public.qr_token_uses
      where event_id = '${fixture.eventId}'::uuid;
    `);
    const auditCount = await readSqlTextAsync(`
      select count(*)
      from public.audit_logs
      where action = 'STAMP_CREATED'
        and metadata->>'eventId' = '${fixture.eventId}';
    `);

    if (stampCount !== "1") {
      throw new Error(`Expected concurrent scan race to create exactly 1 stamp row, got ${stampCount}.`);
    }

    if (qrUseCount !== "1") {
      throw new Error(`Expected concurrent scan race to create exactly 1 qr_token_uses row, got ${qrUseCount}.`);
    }

    if (auditCount !== "1") {
      throw new Error(`Expected concurrent scan race to create exactly 1 audit log row, got ${auditCount}.`);
    }

    outputs.push("stamp-count:1");
    outputs.push("qr-use-count:1");
    outputs.push("audit-count:1");

    console.log(outputs.join("|"));
  } catch (error) {
    runError = error instanceof Error ? error : new Error("Unknown scan race smoke error.");
    throw runError;
  } finally {
    const signOutTargets = [seededScannerClient, studentClient, secondScannerClient].filter((client) => client !== null);
    const signOutResults = await Promise.all(signOutTargets.map((client) => client.supabase.auth.signOut()));

    if (fixture !== null) {
      try {
        await cleanupRaceFixtureAsync(fixture);
      } catch (cleanupError) {
        if (runError === null) {
          throw cleanupError;
        }

        console.error(cleanupError);
      }
    }

    signOutResults.forEach((signOutResult, index) => {
      if (signOutResult.error !== null) {
        const clientLabel = [seededScannerEmail, seededStudentEmail, fixture?.scannerEmail ?? "fixture-scanner"][index];

        if (runError === null) {
          throw new Error(`Failed to sign out ${clientLabel} after scan race smoke: ${signOutResult.error.message}`);
        }

        console.error(new Error(`Failed to sign out ${clientLabel} after scan race smoke: ${signOutResult.error.message}`));
      }
    });
  }
};

void run();
