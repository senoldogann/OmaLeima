import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";

import {
  createAuthedClientAsync,
  getAccessTokenAsync,
  invokeScheduledFunctionAsync,
  invokeFunctionAsync,
  readSqlTextAsync,
  requireScheduledJobSecret,
  runSqlAsync,
  seededClubId,
  seededOrganizerProfileId,
  seededPassword,
  seededScannerProfileId,
  seededScannerEmail,
  seededStudentEmail,
  seededStudentProfileId,
} from "./_shared/function-smoke";

type LoadFixture = {
  anchorStudentId: string;
  businesses: Array<{
    businessId: string;
    slug: string;
    venueId: string;
    venueOrder: number;
  }>;
  eventId: string;
  suffix: string;
};

type ScheduledLeaderboardRefreshResponse = {
  candidateEvents?: number;
  dirtyEvents?: number;
  failedEventIds?: string[];
  failedEvents?: number;
  skippedAlreadyFresh?: number;
  skippedNoValidStamps?: number;
  status?: string;
  updatedEventIds?: string[];
  updatedEvents?: number;
};

const studentCount = 1000;
const venueCount = 5;
const stampCountPerStudent = venueCount;
const loadTimeoutMs = 30_000;

const createBusinessFixtures = (suffix: string) =>
  Array.from({ length: venueCount }, (_, index) => ({
    businessId: randomUUID(),
    slug: `leaderboard-load-${suffix.toLowerCase()}-venue-${index + 1}`,
    venueId: randomUUID(),
    venueOrder: index + 1,
  }));

const seedLoadFixtureAsync = async (suffix: string): Promise<LoadFixture> => {
  const anchorStudentId = seededStudentProfileId;
  const eventId = randomUUID();
  const businesses = createBusinessFixtures(suffix);
  const businessValueSql = businesses
    .map(
      ({ businessId, slug }) => `(
        '${businessId}',
        'Leaderboard Load Venue ${suffix} ${slug.slice(-1)}',
        '${slug}',
        '${slug}@example.test',
        'Load Street ${slug.slice(-1)}',
        'Helsinki',
        'Finland',
        'ACTIVE'
      )`
    )
    .join(",\n      ");
  const eventVenueValueSql = businesses
    .map(
      ({ businessId, venueId, venueOrder }) => `(
        '${venueId}',
        '${eventId}',
        '${businessId}',
        'JOINED',
        '${seededScannerProfileId}',
        now() - interval '2 hours',
        ${venueOrder},
        'Load Stamp ${venueOrder}'
      )`
    )
    .join(",\n      ");
  const sql = `
    begin;

    create temporary table temp_leaderboard_load_students on commit drop as
    select
      case
        when series_index = 1 then '${anchorStudentId}'::uuid
        else gen_random_uuid()
      end as student_id,
      series_index = 1 as is_seeded_student,
      series_index,
      case
        when series_index = 1 then '${seededStudentEmail}'
        else format('leaderboard-load-%s-%s@example.test', lower('${suffix}'), series_index)
      end as email,
      case
        when series_index = 1 then 'Seeded Student'
        else format('Leaderboard Load %s #%s', '${suffix}', series_index)
      end as display_name
    from generate_series(1, ${studentCount}) as series_index;

    create temporary table temp_leaderboard_load_businesses (
      business_id uuid,
      venue_id uuid,
      venue_order integer
    ) on commit drop;

    insert into temp_leaderboard_load_businesses (business_id, venue_id, venue_order)
    values
      ${businesses
      .map(
        ({ businessId, venueId, venueOrder }) =>
          `('${businessId}'::uuid, '${venueId}'::uuid, ${venueOrder})`
      )
      .join(",\n      ")};

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
    select
      '00000000-0000-0000-0000-000000000000',
      student_id,
      'authenticated',
      'authenticated',
      email,
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
      jsonb_build_object('display_name', display_name),
      now(),
      now()
    from temp_leaderboard_load_students
    where not is_seeded_student;

    insert into public.profiles (
      id,
      email,
      display_name,
      primary_role,
      status
    )
    select
      student_id,
      email,
      display_name,
      'STUDENT',
      'ACTIVE'
    from temp_leaderboard_load_students
    where not is_seeded_student
    on conflict (id) do update
    set
      email = excluded.email,
      display_name = excluded.display_name,
      primary_role = excluded.primary_role,
      status = excluded.status,
      updated_at = now();

    insert into public.businesses (
      id,
      name,
      slug,
      contact_email,
      address,
      city,
      country,
      status
    ) values
      ${businessValueSql};

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
      'Leaderboard Load Event ${suffix}',
      'leaderboard-load-event-${suffix.toLowerCase()}',
      'Fixture event for leaderboard load validation.',
      'Helsinki',
      now() - interval '2 hours',
      now() + interval '4 hours',
      now() - interval '3 hours',
      'ACTIVE',
      'PUBLIC',
      1,
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
    ) values
      ${eventVenueValueSql};

    insert into public.event_registrations (
      event_id,
      student_id,
      status
    )
    select
      '${eventId}'::uuid,
      student_id,
      'REGISTERED'
    from temp_leaderboard_load_students;

    insert into public.qr_token_uses (
      jti,
      event_id,
      student_id,
      business_id,
      scanner_user_id,
      used_at
    )
    select
      format('leaderboard-load-%s-%s-%s', lower('${suffix}'), students.series_index, businesses.venue_order),
      '${eventId}'::uuid,
      students.student_id,
      businesses.business_id,
      '${seededScannerProfileId}'::uuid,
      now() - interval '10 minutes' + ((students.series_index * businesses.venue_order) * interval '1 millisecond')
    from temp_leaderboard_load_students students
    cross join temp_leaderboard_load_businesses businesses;

    insert into public.stamps (
      event_id,
      student_id,
      business_id,
      event_venue_id,
      scanner_user_id,
      qr_jti,
      scanned_at,
      validation_status
    )
    select
      '${eventId}'::uuid,
      students.student_id,
      businesses.business_id,
      businesses.venue_id,
      '${seededScannerProfileId}'::uuid,
      format('leaderboard-load-%s-%s-%s', lower('${suffix}'), students.series_index, businesses.venue_order),
      now() - interval '5 minutes' + ((students.series_index * businesses.venue_order) * interval '1 millisecond'),
      'VALID'
    from temp_leaderboard_load_students students
    cross join temp_leaderboard_load_businesses businesses;

    commit;
  `;

  await runSqlAsync(sql);

  return {
    anchorStudentId,
    businesses,
    eventId,
    suffix,
  };
};

const addDirtyStampAsync = async (
  fixture: LoadFixture,
  scannerAccessToken: string,
  studentAccessToken: string,
): Promise<void> => {
  const extraBusinessId = randomUUID();
  const extraVenueId = randomUUID();
  const extraSlug = `leaderboard-load-${fixture.suffix.toLowerCase()}-venue-6`;
  const sql = `
    begin;

    insert into public.businesses (
      id,
      name,
      slug,
      contact_email,
      address,
      city,
      country,
      status
    ) values (
      '${extraBusinessId}',
      'Leaderboard Load Venue ${fixture.suffix} 6',
      '${extraSlug}',
      '${extraSlug}@example.test',
      'Load Street 6',
      'Helsinki',
      'Finland',
      'ACTIVE'
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
      '${extraVenueId}',
      '${fixture.eventId}',
      '${extraBusinessId}',
      'JOINED',
      '${seededScannerProfileId}',
      now() - interval '4 hours',
      6,
      'Load Stamp 6'
    );

    insert into public.business_staff (
      id,
      business_id,
      user_id,
      role,
      status
    ) values (
      '${randomUUID()}',
      '${extraBusinessId}',
      '${seededScannerProfileId}',
      'SCANNER',
      'ACTIVE'
    );

    commit;
  `;

  fixture.businesses.push({
    businessId: extraBusinessId,
    slug: extraSlug,
    venueId: extraVenueId,
    venueOrder: 6,
  });

  await runSqlAsync(sql);

  const generateResult = await invokeFunctionAsync("generate-qr-token", studentAccessToken, {
    eventId: fixture.eventId,
  });
  const qrToken = generateResult.responseBody.qrPayload?.token;

  if (generateResult.status !== 200 || typeof qrToken !== "string") {
    throw new Error(
      `Expected dirty stamp QR generation to return 200 with a token, got ${generateResult.status} ${generateResult.responseBody.status ?? "null"}.`
    );
  }

  const scanResult = await invokeFunctionAsync("scan-qr", scannerAccessToken, {
    businessId: extraBusinessId,
    eventId: fixture.eventId,
    eventVenueId: extraVenueId,
    qrToken,
    scannerDeviceId: null,
  });

  if (scanResult.status !== 200 || scanResult.responseBody.status !== "SUCCESS") {
    throw new Error(
      `Expected dirty stamp scan to return 200 SUCCESS, got ${scanResult.status} ${scanResult.responseBody.status ?? "null"}.`
    );
  }
};

const cleanupLoadFixtureAsync = async (fixture: LoadFixture): Promise<void> => {
  const businessIdSql = fixture.businesses.map(({ businessId }) => `'${businessId}'::uuid`).join(", ");
  const sql = `
    begin;

    delete from public.audit_logs
    where action = 'STAMP_CREATED'
      and metadata->>'eventId' = '${fixture.eventId}';

    delete from public.leaderboard_scores
    where scope_type = 'EVENT'
      and scope_key = '${fixture.eventId}';

    delete from public.leaderboard_updates
    where event_id = '${fixture.eventId}'::uuid;

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

    delete from public.business_staff
    where business_id in (${businessIdSql});

    delete from public.businesses
    where id in (${businessIdSql});

    delete from public.profiles
    where email like 'leaderboard-load-${fixture.suffix.toLowerCase()}-%@example.test';

    delete from auth.users
    where email like 'leaderboard-load-${fixture.suffix.toLowerCase()}-%@example.test';

    commit;
  `;

  await runSqlAsync(sql);
};

const parseLeaderboardJson = async (fixture: LoadFixture): Promise<{
  currentUser: { rank: number; stamp_count: number } | null;
  top10: Array<{ rank: number; stamp_count: number; student_id: string }>;
}> => {
  const result = await readSqlTextAsync(`
    select public.get_event_leaderboard(
      '${fixture.eventId}'::uuid,
      '${fixture.anchorStudentId}'::uuid
    )::text;
  `);

  return JSON.parse(result) as {
    currentUser: { rank: number; stamp_count: number } | null;
    top10: Array<{ rank: number; stamp_count: number; student_id: string }>;
  };
};

const run = async (): Promise<void> => {
  const outputs: string[] = [];
  const scheduledJobSecret = requireScheduledJobSecret();
  const scannerClient = await createAuthedClientAsync(seededScannerEmail, seededPassword);
  const scannerAccessToken = await getAccessTokenAsync(scannerClient);
  const fixture = await seedLoadFixtureAsync(randomUUID().slice(0, 8).toUpperCase());
  let runError: Error | null = null;

  try {
    const firstRunStartedAt = performance.now();
    const firstRun = await invokeScheduledFunctionAsync(
      "scheduled-leaderboard-refresh",
      scheduledJobSecret,
      {},
      AbortSignal.timeout(loadTimeoutMs),
    );
    const firstRunDurationMs = Math.round(performance.now() - firstRunStartedAt);
    const firstRunBody = firstRun.responseBody as ScheduledLeaderboardRefreshResponse;

    if (firstRun.status !== 200 || firstRunBody.status !== "SUCCESS" || firstRunBody.updatedEvents !== 1) {
      throw new Error(
        `Expected first scheduled leaderboard refresh to return 200 SUCCESS with 1 updated event, got ${firstRun.status} ${firstRunBody.status ?? "null"} ${firstRunBody.updatedEvents ?? "null"}.`
      );
    }

    outputs.push(`first-refresh-ms:${firstRunDurationMs}`);
    outputs.push("first-refresh:SUCCESS");

    const leaderboardScoreCount = await readSqlTextAsync(`
      select count(*)
      from public.leaderboard_scores
      where scope_type = 'EVENT'
        and scope_key = '${fixture.eventId}';
    `);
    const leaderboardVersion = await readSqlTextAsync(`
      select version
      from public.leaderboard_updates
      where event_id = '${fixture.eventId}'::uuid;
    `);

    if (leaderboardScoreCount !== `${studentCount}`) {
      throw new Error(`Expected leaderboard_scores count to be ${studentCount}, got ${leaderboardScoreCount}.`);
    }

    if (leaderboardVersion !== "1") {
      throw new Error(`Expected first leaderboard version to be 1, got ${leaderboardVersion}.`);
    }

    outputs.push(`score-count:${leaderboardScoreCount}`);
    outputs.push(`leaderboard-version:${leaderboardVersion}`);

    const firstLeaderboard = await parseLeaderboardJson(fixture);

    if (firstLeaderboard.top10.length !== 10) {
      throw new Error(`Expected top10 length to be 10, got ${firstLeaderboard.top10.length}.`);
    }

    if (firstLeaderboard.currentUser === null || firstLeaderboard.currentUser.stamp_count !== stampCountPerStudent) {
      throw new Error(
        `Expected anchor current user to have ${stampCountPerStudent} stamps after first refresh, got ${firstLeaderboard.currentUser?.stamp_count ?? "null"}.`
      );
    }

    outputs.push("leaderboard-read:ok");

    const secondRun = await invokeScheduledFunctionAsync(
      "scheduled-leaderboard-refresh",
      scheduledJobSecret,
      {},
      AbortSignal.timeout(loadTimeoutMs),
    );
    const secondRunBody = secondRun.responseBody as ScheduledLeaderboardRefreshResponse;

    if (secondRun.status !== 200 || secondRunBody.status !== "SUCCESS" || secondRunBody.skippedAlreadyFresh !== 1) {
      throw new Error(
        `Expected second scheduled leaderboard refresh to skip the already fresh event, got ${secondRun.status} ${secondRunBody.status ?? "null"} ${secondRunBody.skippedAlreadyFresh ?? "null"}.`
      );
    }

    outputs.push("second-refresh:already-fresh");

    const dirtyStampStudentClient = await createAuthedClientAsync(seededStudentEmail, seededPassword);
    const dirtyStampStudentAccessToken = await getAccessTokenAsync(dirtyStampStudentClient);

    try {
      await addDirtyStampAsync(fixture, scannerAccessToken, dirtyStampStudentAccessToken);
    } finally {
      await dirtyStampStudentClient.supabase.auth.signOut();
    }

    const latestValidStampAt = await readSqlTextAsync(`
      select max(scanned_at)::text
      from public.stamps
      where event_id = '${fixture.eventId}'::uuid
        and validation_status = 'VALID';
    `);
    const latestLeaderboardUpdatedAt = await readSqlTextAsync(`
      select updated_at::text
      from public.leaderboard_updates
      where event_id = '${fixture.eventId}'::uuid;
    `);

    outputs.push("dirty-stamp-scan:SUCCESS");

    if (latestValidStampAt > latestLeaderboardUpdatedAt) {
      const thirdRun = await invokeScheduledFunctionAsync(
        "scheduled-leaderboard-refresh",
        scheduledJobSecret,
        {},
        AbortSignal.timeout(loadTimeoutMs),
      );
      const thirdRunBody = thirdRun.responseBody as ScheduledLeaderboardRefreshResponse;

      if (thirdRun.status !== 200 || thirdRunBody.status !== "SUCCESS" || thirdRunBody.updatedEvents !== 1) {
        throw new Error(
          `Expected third scheduled leaderboard refresh to update the now-dirty event, got ${thirdRun.status} ${thirdRunBody.status ?? "null"} ${thirdRunBody.updatedEvents ?? "null"} with skippedAlreadyFresh ${thirdRunBody.skippedAlreadyFresh ?? "null"}, sqlLatestStamp ${latestValidStampAt}, sqlUpdatedAt ${latestLeaderboardUpdatedAt}.`
        );
      }

      outputs.push("third-refresh:SUCCESS");
    } else {
      outputs.push("dirty-refresh:already-current");
    }

    const updatedLeaderboardVersion = await readSqlTextAsync(`
      select version
      from public.leaderboard_updates
      where event_id = '${fixture.eventId}'::uuid;
    `);
    const refreshedLeaderboard = await parseLeaderboardJson(fixture);

    if (updatedLeaderboardVersion !== "2") {
      throw new Error(`Expected leaderboard version to bump to 2 after new stamps, got ${updatedLeaderboardVersion}.`);
    }

    if (refreshedLeaderboard.currentUser === null || refreshedLeaderboard.currentUser.stamp_count !== 6) {
      throw new Error(
        `Expected anchor current user to have 6 stamps after dirty refresh, got ${refreshedLeaderboard.currentUser?.stamp_count ?? "null"}.`
      );
    }

    outputs.push(`updated-version:${updatedLeaderboardVersion}`);
    outputs.push("anchor-stamp-count:6");

    console.log(outputs.join("|"));
  } catch (error) {
    runError = error instanceof Error ? error : new Error("Unknown leaderboard load smoke error.");
    throw runError;
  } finally {
    try {
      await cleanupLoadFixtureAsync(fixture);
    } catch (cleanupError) {
      if (runError === null) {
        throw cleanupError;
      }

      console.error(cleanupError);
    }
  }
};

void run();
