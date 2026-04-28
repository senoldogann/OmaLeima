import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile?.(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const appBaseUrl = process.env.ADMIN_APP_BASE_URL ?? "http://localhost:3001";
const dockerBinary = process.env.DOCKER_BINARY ?? "/usr/local/bin/docker";
const localDatabaseContainer = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_omaleima";
const seededClubId = "10000000-0000-0000-0000-000000000001";

if (typeof supabaseUrl !== "string" || supabaseUrl.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL for club events smoke script.");
}

if (typeof publishableKey !== "string" || publishableKey.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for club events smoke script.");
}

type ClubEventRow = {
  club_id: string;
  end_at: string;
  id: string;
  join_deadline_at: string;
  name: string;
  slug: string;
  start_at: string;
  status: "ACTIVE" | "CANCELLED" | "COMPLETED" | "DRAFT" | "PUBLISHED";
};

type ClubEventMutationResponse = {
  message?: string;
  status?: string;
};

type AuthedClient = {
  email: string;
  supabase: ReturnType<typeof createStatelessClient>;
};

type CookieBackedClient = {
  email: string;
  supabase: ReturnType<typeof createBrowserClient>;
  toCookieHeader: () => string;
};

type ClubEventPayload = {
  city: string;
  clubId: string;
  country: string;
  coverImageUrl: string;
  description: string;
  endAt: string;
  joinDeadlineAt: string;
  maxParticipants: string;
  minimumStampsRequired: string;
  name: string;
  rulesJson: string;
  startAt: string;
  visibility: "PRIVATE" | "PUBLIC" | "UNLISTED";
};

type ClubStaffFixture = {
  email: string;
  profileId: string;
};

const createStatelessClient = () =>
  createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

const createAuthedClientAsync = async (email: string, password: string): Promise<AuthedClient> => {
  const supabase = createStatelessClient();
  const signInResult = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInResult.error !== null) {
    throw new Error(`Failed to sign in ${email} for club events smoke: ${signInResult.error.message}`);
  }

  return {
    email,
    supabase,
  };
};

const createCookieBackedClientAsync = async (email: string, password: string): Promise<CookieBackedClient> => {
  const cookieJar = new Map<string, string>();
  const supabase = createBrowserClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return Array.from(cookieJar.entries()).map(([name, value]) => ({
          name,
          value,
        }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          cookieJar.set(name, value);
        });
      },
    },
  });
  const signInResult = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInResult.error !== null) {
    throw new Error(`Failed to sign in ${email} for club event route smoke: ${signInResult.error.message}`);
  }

  return {
    email,
    supabase,
    toCookieHeader: () =>
      Array.from(cookieJar.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; "),
  };
};

const createValidPayload = (name: string, offsetMinutes: number): ClubEventPayload => {
  const startAt = new Date(Date.now() + offsetMinutes * 60_000);
  const endAt = new Date(startAt.getTime() + 3 * 60 * 60_000);
  const joinDeadlineAt = new Date(startAt.getTime() - 60 * 60_000);

  return {
    city: "Helsinki",
    clubId: seededClubId,
    country: "Finland",
    coverImageUrl: "",
    description: "Club event smoke route validation.",
    endAt: endAt.toISOString(),
    joinDeadlineAt: joinDeadlineAt.toISOString(),
    maxParticipants: "120",
    minimumStampsRequired: "4",
    name,
    rulesJson: '{"dressCode":"overalls","ageLimit":18}',
    startAt: startAt.toISOString(),
    visibility: "PUBLIC",
  };
};

const runSqlAsync = async (sql: string): Promise<void> => {
  execFileSync(
    dockerBinary,
    [
      "exec",
      localDatabaseContainer,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ],
    {
      stdio: "pipe",
    }
  );
};

const seedClubStaffFixtureAsync = async (suffix: string): Promise<ClubStaffFixture> => {
  const profileId = randomUUID();
  const email = `club-staff-smoke-${suffix.toLowerCase()}@example.test`;
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
      '${profileId}',
      'authenticated',
      'authenticated',
      '${email}',
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
      '{"display_name":"Club Staff Smoke ${suffix}"}'::jsonb,
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
      '${profileId}',
      '${email}',
      'Club Staff Smoke ${suffix}',
      'CLUB_STAFF',
      'ACTIVE'
    );

    insert into public.club_members (
      id,
      club_id,
      user_id,
      role,
      status
    ) values (
      '${randomUUID()}',
      '${seededClubId}',
      '${profileId}',
      'STAFF',
      'ACTIVE'
    );

    commit;
  `;

  await runSqlAsync(sql);

  return {
    email,
    profileId,
  };
};

const invokeCreateRouteAsync = async (
  client: CookieBackedClient,
  body: Partial<ClubEventPayload>
): Promise<{ responseBody: ClubEventMutationResponse; status: number }> => {
  const response = await fetch(`${appBaseUrl}/api/club/events/create`, {
    body: JSON.stringify(body),
    headers: {
      Cookie: client.toCookieHeader(),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json()) as ClubEventMutationResponse;

  return {
    responseBody,
    status: response.status,
  };
};

const fetchEventsByNameAsync = async (
  client: AuthedClient,
  name: string
): Promise<ClubEventRow[]> => {
  const { data, error } = await client.supabase
    .from("events")
    .select("id,club_id,name,slug,status,start_at,end_at,join_deadline_at")
    .eq("name", name)
    .order("created_at", {
      ascending: false,
    })
    .returns<ClubEventRow[]>();

  if (error !== null) {
    throw new Error(`Failed to read organizer events for ${name}: ${error.message}`);
  }

  return data;
};

const cleanupSmokeArtifactsAsync = async (
  eventIds: string[],
  staffFixture: ClubStaffFixture
): Promise<void> => {
  const eventIdList = eventIds.map((id) => `'${id}'::uuid`).join(", ");
  const deleteEventSql =
    eventIds.length === 0
      ? ""
      : `
        delete from public.audit_logs
        where action = 'CLUB_EVENT_CREATED'
          and resource_id in (${eventIdList});

        delete from public.events
        where id in (${eventIdList});
      `;
  const sql = `
    begin;
    ${deleteEventSql}

    delete from public.club_members
    where user_id = '${staffFixture.profileId}'::uuid;

    delete from public.profiles
    where id = '${staffFixture.profileId}'::uuid;

    delete from auth.users
    where id = '${staffFixture.profileId}'::uuid;

    commit;
  `;

  await runSqlAsync(sql);
};

const assertStudentDirectInsertBlockedAsync = async (client: AuthedClient): Promise<void> => {
  const createdByResult = await client.supabase.auth.getUser();

  if (createdByResult.error !== null || createdByResult.data.user === null) {
    throw new Error(`Failed to resolve student auth user for direct insert smoke: ${createdByResult.error?.message ?? "missing user"}`);
  }

  const payload = createValidPayload(`Student Direct Insert ${randomUUID().slice(0, 8)}`, 300);
  const { error } = await client.supabase.from("events").insert({
    city: payload.city,
    club_id: payload.clubId,
    country: payload.country,
    created_by: createdByResult.data.user.id,
    description: payload.description,
    end_at: payload.endAt,
    join_deadline_at: payload.joinDeadlineAt,
    minimum_stamps_required: Number.parseInt(payload.minimumStampsRequired, 10),
    name: payload.name,
    rules: JSON.parse(payload.rulesJson) as Record<string, unknown>,
    slug: `student-direct-${randomUUID().slice(0, 8)}`,
    start_at: payload.startAt,
    status: "DRAFT",
    visibility: payload.visibility,
  });

  if (error === null) {
    throw new Error("Expected student direct event insert to be blocked by RLS.");
  }
};

const assertRouteContainsAsync = async (
  client: CookieBackedClient,
  expectedSnippet: string
): Promise<void> => {
  const response = await fetch(`${appBaseUrl}/club/events`, {
    headers: {
      Cookie: client.toCookieHeader(),
    },
    method: "GET",
    redirect: "manual",
  });
  const html = await response.text();

  if (!response.ok) {
    throw new Error(`Expected /club/events to return 200, got ${response.status}.`);
  }

  if (!html.includes(expectedSnippet)) {
    throw new Error(`Expected /club/events to contain ${expectedSnippet}.`);
  }
};

const assertStudentRouteBlockedAsync = async (
  client: CookieBackedClient,
  payload: ClubEventPayload
): Promise<void> => {
  const result = await invokeCreateRouteAsync(client, payload);

  if (result.status !== 403) {
    throw new Error(`Expected student club event route request to return 403, got ${result.status}.`);
  }

  if (result.responseBody.status !== "CLUB_NOT_ALLOWED") {
    throw new Error(
      `Expected student club event route request to return CLUB_NOT_ALLOWED, got ${result.responseBody.status ?? "null"}.`
    );
  }
};

const assertClubStaffBlockedAsync = async (
  staffClient: AuthedClient,
  staffRouteClient: CookieBackedClient,
  suffix: string
): Promise<void> => {
  const createdByResult = await staffClient.supabase.auth.getUser();

  if (createdByResult.error !== null || createdByResult.data.user === null) {
    throw new Error(`Failed to resolve club staff auth user for direct insert smoke: ${createdByResult.error?.message ?? "missing user"}`);
  }

  const payload = createValidPayload(`Staff Direct Insert ${suffix}`, 330);
  const { error } = await staffClient.supabase.from("events").insert({
    city: payload.city,
    club_id: payload.clubId,
    country: payload.country,
    created_by: createdByResult.data.user.id,
    description: payload.description,
    end_at: payload.endAt,
    join_deadline_at: payload.joinDeadlineAt,
    minimum_stamps_required: Number.parseInt(payload.minimumStampsRequired, 10),
    name: payload.name,
    rules: JSON.parse(payload.rulesJson) as Record<string, unknown>,
    slug: `staff-direct-${randomUUID().slice(0, 8)}`,
    start_at: payload.startAt,
    status: "DRAFT",
    visibility: payload.visibility,
  });

  if (error === null) {
    throw new Error("Expected club staff direct event insert to be blocked by RLS.");
  }

  const routeResult = await invokeCreateRouteAsync(staffRouteClient, createValidPayload(`Staff Route Blocked ${suffix}`, 690));

  if (routeResult.status !== 200 || routeResult.responseBody.status !== "CLUB_EVENT_CREATOR_NOT_ALLOWED") {
    throw new Error(
      `Expected club staff route create to return 200 CLUB_EVENT_CREATOR_NOT_ALLOWED, got ${routeResult.status} ${routeResult.responseBody.status ?? "null"}.`
    );
  }
};

const run = async (): Promise<void> => {
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const outputs: string[] = [];
  const staffFixture = await seedClubStaffFixtureAsync(suffix);
  const organizerClient = await createAuthedClientAsync("organizer@omaleima.test", "password123");
  const organizerRouteClient = await createCookieBackedClientAsync("organizer@omaleima.test", "password123");
  const studentClient = await createAuthedClientAsync("student@omaleima.test", "password123");
  const studentRouteClient = await createCookieBackedClientAsync("student@omaleima.test", "password123");
  const staffClient = await createAuthedClientAsync(staffFixture.email, "password123");
  const staffRouteClient = await createCookieBackedClientAsync(staffFixture.email, "password123");
  const createdEventIds = new Set<string>();
  let runError: Error | null = null;

  try {
    await assertStudentDirectInsertBlockedAsync(studentClient);
    outputs.push("student-direct-insert:rls-blocked");
    await assertClubStaffBlockedAsync(staffClient, staffRouteClient, suffix);
    outputs.push("staff-direct-insert:rls-blocked");
    outputs.push("staff-route:CLUB_EVENT_CREATOR_NOT_ALLOWED");

    const routeEventName = `Club Smoke Event ${suffix}`;
    const routePayload = createValidPayload(routeEventName, 360);
    const routeResult = await invokeCreateRouteAsync(organizerRouteClient, routePayload);

    if (routeResult.status !== 200 || routeResult.responseBody.status !== "SUCCESS") {
      throw new Error(
        `Expected organizer club event route create to succeed, got ${routeResult.status} ${routeResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push(`create-route:${routeResult.responseBody.status}`);

    const createdRows = await fetchEventsByNameAsync(organizerClient, routeEventName);

    if (createdRows.length !== 1) {
      throw new Error(`Expected organizer to read 1 created event for ${routeEventName}, got ${createdRows.length}.`);
    }

    if (createdRows[0]?.club_id !== seededClubId || createdRows[0]?.status !== "DRAFT") {
      throw new Error(`Created event row for ${routeEventName} has unexpected club or status.`);
    }

    if (
      Date.parse(createdRows[0].start_at) !== Date.parse(routePayload.startAt) ||
      Date.parse(createdRows[0].end_at) !== Date.parse(routePayload.endAt) ||
      Date.parse(createdRows[0].join_deadline_at) !== Date.parse(routePayload.joinDeadlineAt)
    ) {
      throw new Error(`Created event row for ${routeEventName} stored unexpected timestamps.`);
    }

    createdEventIds.add(createdRows[0].id);
    outputs.push(`created-row:${createdRows[0].slug}`);
    outputs.push("stored-times:ok");

    await assertRouteContainsAsync(organizerRouteClient, routeEventName);
    outputs.push("club-events-route:ok");

    const invalidClubIdResult = await invokeCreateRouteAsync(organizerRouteClient, {
      ...createValidPayload(`Invalid Club ${suffix}`, 420),
      clubId: "not-a-uuid",
    });

    if (invalidClubIdResult.status !== 400 || invalidClubIdResult.responseBody.status !== "VALIDATION_ERROR") {
      throw new Error(
        `Expected invalid clubId request to return 400 VALIDATION_ERROR, got ${invalidClubIdResult.status} ${invalidClubIdResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push(`invalid-club-id:${invalidClubIdResult.responseBody.status}`);

    const fractionalCapacityResult = await invokeCreateRouteAsync(organizerRouteClient, {
      ...createValidPayload(`Fractional Capacity ${suffix}`, 480),
      maxParticipants: "12.5",
    });

    if (fractionalCapacityResult.status !== 400 || fractionalCapacityResult.responseBody.status !== "VALIDATION_ERROR") {
      throw new Error(
        `Expected fractional maxParticipants request to return 400 VALIDATION_ERROR, got ${fractionalCapacityResult.status} ${fractionalCapacityResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push(`fractional-capacity:${fractionalCapacityResult.responseBody.status}`);

    const invalidRulesResult = await invokeCreateRouteAsync(organizerRouteClient, {
      ...createValidPayload(`Invalid Rules ${suffix}`, 540),
      rulesJson: "{bad json",
    });

    if (invalidRulesResult.status !== 400 || invalidRulesResult.responseBody.status !== "VALIDATION_ERROR") {
      throw new Error(
        `Expected invalid rules request to return 400 VALIDATION_ERROR, got ${invalidRulesResult.status} ${invalidRulesResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push(`invalid-rules:${invalidRulesResult.responseBody.status}`);

    const deadlinePayload = createValidPayload(`Deadline Invalid ${suffix}`, 600);
    deadlinePayload.joinDeadlineAt = deadlinePayload.endAt;
    const deadlineResult = await invokeCreateRouteAsync(organizerRouteClient, deadlinePayload);

    if (deadlineResult.status !== 200 || deadlineResult.responseBody.status !== "EVENT_JOIN_DEADLINE_INVALID") {
      throw new Error(
        `Expected join deadline validation to return EVENT_JOIN_DEADLINE_INVALID, got ${deadlineResult.status} ${deadlineResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push(`deadline-order:${deadlineResult.responseBody.status}`);

    await assertStudentRouteBlockedAsync(studentRouteClient, createValidPayload(`Student Blocked ${suffix}`, 660));
    outputs.push("student-route:CLUB_NOT_ALLOWED");

    const concurrentName = `Concurrent Club Event ${suffix}`;
    const concurrentPayload = createValidPayload(concurrentName, 720);
    const [concurrentResultA, concurrentResultB] = await Promise.all([
      invokeCreateRouteAsync(organizerRouteClient, concurrentPayload),
      invokeCreateRouteAsync(organizerRouteClient, concurrentPayload),
    ]);

    if (concurrentResultA.status !== 200 || concurrentResultA.responseBody.status !== "SUCCESS") {
      throw new Error(
        `Expected concurrent club event route A to succeed, got ${concurrentResultA.status} ${concurrentResultA.responseBody.status ?? "null"}.`
      );
    }

    if (concurrentResultB.status !== 200 || concurrentResultB.responseBody.status !== "SUCCESS") {
      throw new Error(
        `Expected concurrent club event route B to succeed, got ${concurrentResultB.status} ${concurrentResultB.responseBody.status ?? "null"}.`
      );
    }

    const concurrentRows = await fetchEventsByNameAsync(organizerClient, concurrentName);

    if (concurrentRows.length !== 2) {
      throw new Error(`Expected concurrent club event create to produce 2 rows, got ${concurrentRows.length}.`);
    }

    concurrentRows.forEach((row) => {
      createdEventIds.add(row.id);
    });

    const uniqueSlugs = new Set(concurrentRows.map((row) => row.slug));

    if (uniqueSlugs.size !== 2) {
      throw new Error("Expected concurrent club event create to produce unique slugs.");
    }

    outputs.push("concurrent-create:SUCCESS,SUCCESS");
    outputs.push("concurrent-slugs:unique");

    console.log(outputs.join("|"));
  } catch (error) {
    runError = error instanceof Error ? error : new Error("Unknown club events smoke error.");
    throw runError;
  } finally {
    try {
      await cleanupSmokeArtifactsAsync(Array.from(createdEventIds), staffFixture);
    } catch (cleanupError) {
      if (runError === null) {
        throw cleanupError;
      }

      console.error(cleanupError);
    }
  }
};

void run();
