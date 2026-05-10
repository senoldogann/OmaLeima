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
const seededOrganizerId = "00000000-0000-0000-0000-000000000002";
const seededStudentId = "00000000-0000-0000-0000-000000000004";

if (typeof supabaseUrl !== "string" || supabaseUrl.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL for club department-tag smoke script.");
}

if (typeof publishableKey !== "string" || publishableKey.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for club department-tag smoke script.");
}

type DepartmentTagRow = {
  city: string | null;
  created_by: string | null;
  id: string;
  slug: string;
  source_club_id: string | null;
  source_type: "ADMIN" | "CLUB" | "USER";
  status: "ACTIVE" | "BLOCKED" | "MERGED" | "PENDING_REVIEW";
  title: string;
  university_name: string | null;
};

type DepartmentTagMutationResponse = {
  message?: string;
  status?: string;
};

type AuthedClient = {
  email: string;
  supabase: ReturnType<typeof createStatelessClient>;
};

type CookieBackedClient = {
  email: string;
  readCsrfToken: () => string;
  supabase: ReturnType<typeof createBrowserClient>;
  syncCookiesFromResponse: (response: Response) => void;
  toCookieHeader: () => string;
};

type ClubStaffFixture = {
  email: string;
  profileId: string;
};

type DepartmentTagSmokeArtifacts = {
  createdDepartmentTagIds: string[];
  secondClubId: string | null;
  secondClubName: string | null;
  staffFixture: ClubStaffFixture | null;
  studentCustomTagIds: string[];
};

type ClubDepartmentTagCreatePayload = {
  clubId: string;
  title: string;
};

type ClubDepartmentTagUpdatePayload = {
  departmentTagId: string;
  title: string;
};

type ClubDepartmentTagDeletePayload = {
  departmentTagId: string;
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
    throw new Error(`Failed to sign in ${email} for club department-tag smoke: ${signInResult.error.message}`);
  }

  return {
    email,
    supabase,
  };
};

const createCookieBackedClientAsync = async (email: string, password: string): Promise<CookieBackedClient> => {
  const cookieJar = new Map<string, string>();
  const syncCookiesFromResponse = (response: Response): void => {
    const headersWithSetCookie = response.headers as Headers & {
      getSetCookie?: () => string[];
    };
    const setCookieHeaders = headersWithSetCookie.getSetCookie?.() ?? [];

    setCookieHeaders.forEach((setCookieHeader) => {
      const cookiePair = setCookieHeader.split(";", 1)[0];
      const separatorIndex = cookiePair.indexOf("=");

      if (separatorIndex <= 0) {
        return;
      }

      const name = cookiePair.slice(0, separatorIndex);
      const value = cookiePair.slice(separatorIndex + 1);

      if (value.length === 0) {
        cookieJar.delete(name);
        return;
      }

      cookieJar.set(name, value);
    });
  };
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
    throw new Error(`Failed to sign in ${email} for club department-tag route smoke: ${signInResult.error.message}`);
  }

  const seedCsrfResponse = await fetch(`${appBaseUrl}/club/department-tags`, {
    headers: {
      Cookie: Array.from(cookieJar.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; "),
    },
    method: "GET",
    redirect: "manual",
  });
  syncCookiesFromResponse(seedCsrfResponse);

  if (!cookieJar.has("omaleima_dashboard_csrf")) {
    cookieJar.set("omaleima_dashboard_csrf", randomUUID());
  }

  return {
    email,
    readCsrfToken: () => cookieJar.get("omaleima_dashboard_csrf") ?? "",
    supabase,
    syncCookiesFromResponse,
    toCookieHeader: () =>
      Array.from(cookieJar.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; "),
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

const seedClubFixturesAsync = async (
  suffix: string,
  artifacts: DepartmentTagSmokeArtifacts
): Promise<void> => {
  const secondClubId = randomUUID();
  const secondClubName = `Smoke Tags Club ${suffix}`;
  const secondClubSlug = `smoke-tags-club-${suffix.toLowerCase()}`;
  const staffProfileId = randomUUID();
  const staffEmail = `club-tag-staff-${suffix.toLowerCase()}@example.test`;
  artifacts.secondClubId = secondClubId;
  artifacts.secondClubName = secondClubName;
  artifacts.staffFixture = {
    email: staffEmail,
    profileId: staffProfileId,
  };
  const sql = `
    begin;

    insert into public.clubs (
      id,
      name,
      slug,
      university_name,
      city,
      contact_email,
      status
    ) values (
      '${secondClubId}',
      '${secondClubName}',
      '${secondClubSlug}',
      'Aalto University',
      'Espoo',
      'organizer@omaleima.test',
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
      '${secondClubId}',
      '${seededOrganizerId}',
      'ORGANIZER',
      'ACTIVE'
    );

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
      '${staffProfileId}',
      'authenticated',
      'authenticated',
      '${staffEmail}',
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
      '{"display_name":"Club Tag Staff ${suffix}"}'::jsonb,
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
      '${staffProfileId}',
      '${staffEmail}',
      'Club Tag Staff ${suffix}',
      'CLUB_STAFF',
      'ACTIVE'
    )
    on conflict (id) do update
    set
      email = excluded.email,
      display_name = excluded.display_name,
      primary_role = excluded.primary_role,
      status = excluded.status,
      updated_at = now();

    insert into public.club_members (
      id,
      club_id,
      user_id,
      role,
      status
    ) values (
      '${randomUUID()}',
      '${seededClubId}',
      '${staffProfileId}',
      'STAFF',
      'ACTIVE'
    );

    commit;
  `;

  await runSqlAsync(sql);
};

const assertOrganizerDirectInsertBlockedAsync = async (client: AuthedClient, suffix: string): Promise<void> => {
  const { error } = await client.supabase.from("department_tags").insert({
    created_by: seededOrganizerId,
    slug: `organizer-direct-club-tag-${suffix.toLowerCase()}`,
    source_club_id: seededClubId,
    source_type: "CLUB",
    status: "ACTIVE",
    title: `Organizer Direct Club Tag ${suffix}`,
  });

  if (error === null) {
    throw new Error("Expected organizer direct official department tag insert to be blocked by RLS.");
  }
};

const assertStaffDirectInsertBlockedAsync = async (
  client: AuthedClient,
  profileId: string,
  suffix: string
): Promise<void> => {
  const { error } = await client.supabase.from("department_tags").insert({
    created_by: profileId,
    slug: `staff-direct-club-tag-${suffix.toLowerCase()}`,
    source_club_id: seededClubId,
    source_type: "CLUB",
    status: "ACTIVE",
    title: `Staff Direct Club Tag ${suffix}`,
  });

  if (error === null) {
    throw new Error("Expected staff direct official department tag insert to be blocked by RLS.");
  }
};

const createStudentCustomTagAsync = async (
  client: AuthedClient,
  artifacts: DepartmentTagSmokeArtifacts,
  suffix: string
): Promise<void> => {
  const { data, error } = await client.supabase
    .from("department_tags")
    .insert({
      created_by: seededStudentId,
      slug: `student-custom-tag-${suffix.toLowerCase()}`,
      source_club_id: null,
      source_type: "USER",
      status: "ACTIVE",
      title: `Student Custom Tag ${suffix}`,
    })
    .select("id")
    .single<{ id: string }>();

  if (error !== null) {
    throw new Error(`Expected student custom department tag create to succeed, got ${error.message}.`);
  }

  artifacts.studentCustomTagIds.push(data.id);
};

const assertDepartmentTagsPageContainsAsync = async (
  client: CookieBackedClient,
  snippets: string[]
): Promise<void> => {
  const response = await fetch(`${appBaseUrl}/club/department-tags`, {
    headers: {
      Cookie: client.toCookieHeader(),
    },
    method: "GET",
  });
  client.syncCookiesFromResponse(response);
  const html = await response.text();

  if (!response.ok) {
    throw new Error(`Expected /club/department-tags to return 200, got ${response.status}.`);
  }

  snippets.forEach((snippet) => {
    if (!html.includes(snippet)) {
      throw new Error(`Expected /club/department-tags to contain ${snippet}.`);
    }
  });
};

const assertDepartmentTagsRouteRedirectAsync = async (
  client: CookieBackedClient,
  expectedLocation: string
): Promise<void> => {
  const response = await fetch(`${appBaseUrl}/club/department-tags`, {
    headers: {
      Cookie: client.toCookieHeader(),
    },
    method: "GET",
    redirect: "manual",
  });
  client.syncCookiesFromResponse(response);

  if (response.status !== 307) {
    throw new Error(`Expected /club/department-tags to redirect, got ${response.status}.`);
  }

  const location = response.headers.get("location");

  if (location !== expectedLocation) {
    throw new Error(`Expected /club/department-tags redirect to ${expectedLocation}, got ${location}.`);
  }
};

const invokeCreateRouteAsync = async (
  client: CookieBackedClient,
  body: Partial<ClubDepartmentTagCreatePayload>
): Promise<{ responseBody: DepartmentTagMutationResponse; status: number }> => {
  const response = await fetch(`${appBaseUrl}/api/club/department-tags/create`, {
    body: JSON.stringify(body),
    headers: {
      Cookie: client.toCookieHeader(),
      "Content-Type": "application/json",
      Origin: appBaseUrl,
      "x-omaleima-csrf": client.readCsrfToken(),
    },
    method: "POST",
  });
  client.syncCookiesFromResponse(response);
  const responseBody = (await response.json()) as DepartmentTagMutationResponse;

  return {
    responseBody,
    status: response.status,
  };
};

const invokeUpdateRouteAsync = async (
  client: CookieBackedClient,
  body: Partial<ClubDepartmentTagUpdatePayload>
): Promise<{ responseBody: DepartmentTagMutationResponse; status: number }> => {
  const response = await fetch(`${appBaseUrl}/api/club/department-tags/update`, {
    body: JSON.stringify(body),
    headers: {
      Cookie: client.toCookieHeader(),
      "Content-Type": "application/json",
      Origin: appBaseUrl,
      "x-omaleima-csrf": client.readCsrfToken(),
    },
    method: "POST",
  });
  client.syncCookiesFromResponse(response);
  const responseBody = (await response.json()) as DepartmentTagMutationResponse;

  return {
    responseBody,
    status: response.status,
  };
};

const invokeDeleteRouteAsync = async (
  client: CookieBackedClient,
  body: Partial<ClubDepartmentTagDeletePayload>
): Promise<{ responseBody: DepartmentTagMutationResponse; status: number }> => {
  const response = await fetch(`${appBaseUrl}/api/club/department-tags/delete`, {
    body: JSON.stringify(body),
    headers: {
      Cookie: client.toCookieHeader(),
      "Content-Type": "application/json",
      Origin: appBaseUrl,
      "x-omaleima-csrf": client.readCsrfToken(),
    },
    method: "POST",
  });
  client.syncCookiesFromResponse(response);
  const responseBody = (await response.json()) as DepartmentTagMutationResponse;

  return {
    responseBody,
    status: response.status,
  };
};

const fetchDepartmentTagsByTitleAsync = async (
  client: AuthedClient,
  title: string
): Promise<DepartmentTagRow[]> => {
  const { data, error } = await client.supabase
    .from("department_tags")
    .select("id,title,slug,university_name,city,source_type,source_club_id,created_by,status")
    .eq("title", title)
    .returns<DepartmentTagRow[]>();

  if (error !== null) {
    throw new Error(`Failed to read department tags for ${title}: ${error.message}`);
  }

  return data;
};

const fetchDepartmentTagByIdAsync = async (
  client: AuthedClient,
  departmentTagId: string
): Promise<DepartmentTagRow | null> => {
  const { data, error } = await client.supabase
    .from("department_tags")
    .select("id,title,slug,university_name,city,source_type,source_club_id,created_by,status")
    .eq("id", departmentTagId)
    .maybeSingle<DepartmentTagRow>();

  if (error !== null) {
    throw new Error(`Failed to read department tag ${departmentTagId}: ${error.message}`);
  }

  return data;
};

const assertOrganizerDirectUpdateBlockedAsync = async (
  client: AuthedClient,
  departmentTagId: string,
  expectedTitle: string
): Promise<void> => {
  const { error } = await client.supabase
    .from("department_tags")
    .update({
      title: "Organizer Direct Update Should Fail",
    })
    .eq("id", departmentTagId);

  if (error !== null) {
    return;
  }

  const row = await fetchDepartmentTagByIdAsync(client, departmentTagId);

  if (row === null || row.title !== expectedTitle) {
    throw new Error("Expected organizer direct official department tag update to be blocked by RLS.");
  }
};

const assertOrganizerDirectDeleteBlockedAsync = async (
  client: AuthedClient,
  departmentTagId: string
): Promise<void> => {
  const { error } = await client.supabase
    .from("department_tags")
    .delete()
    .eq("id", departmentTagId);

  if (error !== null) {
    return;
  }

  const row = await fetchDepartmentTagByIdAsync(client, departmentTagId);

  if (row === null) {
    throw new Error("Expected organizer direct official department tag delete to be blocked by RLS.");
  }
};

const cleanupSmokeArtifactsAsync = async (artifacts: DepartmentTagSmokeArtifacts): Promise<void> => {
  const createdDepartmentTagIds = Array.from(
    new Set([...artifacts.createdDepartmentTagIds, ...artifacts.studentCustomTagIds])
  );
  const departmentTagIdList = createdDepartmentTagIds.map((id) => `'${id}'::uuid`).join(", ");
  const deleteDepartmentTagsSql =
    createdDepartmentTagIds.length === 0
      ? ""
      : `
        delete from public.audit_logs
        where resource_type = 'department_tags'
          and resource_id in (${departmentTagIdList});

        delete from public.department_tags
        where id in (${departmentTagIdList});
      `;
  const deleteSecondClubSql =
    artifacts.secondClubId === null
      ? ""
      : `
        delete from public.club_members
        where club_id = '${artifacts.secondClubId}'::uuid;

        delete from public.clubs
        where id = '${artifacts.secondClubId}'::uuid;
      `;
  const deleteStaffSql =
    artifacts.staffFixture === null
      ? ""
      : `
        delete from public.club_members
        where user_id = '${artifacts.staffFixture.profileId}'::uuid;

        delete from public.profiles
        where id = '${artifacts.staffFixture.profileId}'::uuid;

        delete from auth.users
        where id = '${artifacts.staffFixture.profileId}'::uuid;
      `;
  const sql = `
    begin;
    ${deleteDepartmentTagsSql}
    ${deleteSecondClubSql}
    ${deleteStaffSql}
    commit;
  `;

  await runSqlAsync(sql);
};

const signOutAsync = async (client: AuthedClient | CookieBackedClient | null): Promise<void> => {
  if (client === null) {
    return;
  }

  const signOutResult = await client.supabase.auth.signOut();

  if (signOutResult.error !== null) {
    throw new Error(`Failed to sign out ${client.email}: ${signOutResult.error.message}`);
  }
};

const run = async (): Promise<void> => {
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const sharedTitle = `Official Study Label ${suffix}`;
  const outputs: string[] = [];
  const artifacts: DepartmentTagSmokeArtifacts = {
    createdDepartmentTagIds: [],
    secondClubId: null,
    secondClubName: null,
    staffFixture: null,
    studentCustomTagIds: [],
  };
  let organizerClient: AuthedClient | null = null;
  let organizerRouteClient: CookieBackedClient | null = null;
  let studentClient: AuthedClient | null = null;
  let studentRouteClient: CookieBackedClient | null = null;
  let staffClient: AuthedClient | null = null;
  let staffRouteClient: CookieBackedClient | null = null;
  let runError: Error | null = null;

  try {
    await seedClubFixturesAsync(suffix, artifacts);
    const staffFixture = artifacts.staffFixture;

    if (staffFixture === null || artifacts.secondClubId === null || artifacts.secondClubName === null) {
      throw new Error("Expected club department-tag smoke fixtures to be seeded.");
    }

    organizerClient = await createAuthedClientAsync("organizer@omaleima.test", "password123");
    organizerRouteClient = await createCookieBackedClientAsync("organizer@omaleima.test", "password123");
    studentClient = await createAuthedClientAsync("student@omaleima.test", "password123");
    studentRouteClient = await createCookieBackedClientAsync("student@omaleima.test", "password123");
    staffClient = await createAuthedClientAsync(staffFixture.email, "password123");
    staffRouteClient = await createCookieBackedClientAsync(staffFixture.email, "password123");

    await assertOrganizerDirectInsertBlockedAsync(organizerClient, suffix);
    outputs.push("organizer-direct-insert:rls-blocked");

    await assertStaffDirectInsertBlockedAsync(staffClient, staffFixture.profileId, suffix);
    outputs.push("staff-direct-insert:rls-blocked");

    await createStudentCustomTagAsync(studentClient, artifacts, suffix);
    outputs.push("student-custom-insert:ok");

    await assertDepartmentTagsPageContainsAsync(organizerRouteClient, [
      artifacts.secondClubName,
    ]);
    outputs.push("organizer-route:ok");

    await assertDepartmentTagsRouteRedirectAsync(staffRouteClient, "/forbidden");
    outputs.push("staff-route-redirect:/forbidden");

    await assertDepartmentTagsRouteRedirectAsync(studentRouteClient, "/forbidden");
    outputs.push("student-route-redirect:/forbidden");

    const staffRouteResult = await invokeCreateRouteAsync(staffRouteClient, {
      clubId: seededClubId,
      title: `Staff Blocked Tag ${suffix}`,
    });

    if (staffRouteResult.status !== 403 || staffRouteResult.responseBody.status !== "CLUB_NOT_ALLOWED") {
      throw new Error(
        `Expected staff department tag route create to return 403 CLUB_NOT_ALLOWED, got ${staffRouteResult.status} ${staffRouteResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push("staff-route:CLUB_NOT_ALLOWED");

    const createPrimaryClubResult = await invokeCreateRouteAsync(organizerRouteClient, {
      clubId: seededClubId,
      title: sharedTitle,
    });

    if (createPrimaryClubResult.status !== 200 || createPrimaryClubResult.responseBody.status !== "SUCCESS") {
      throw new Error(
        `Expected organizer department tag create to succeed, got ${createPrimaryClubResult.status} ${createPrimaryClubResult.responseBody.status ?? "null"}. Message: ${createPrimaryClubResult.responseBody.message ?? "none"}`
      );
    }

    outputs.push(`create-route:${createPrimaryClubResult.responseBody.status}`);

    const primaryClubRows = await fetchDepartmentTagsByTitleAsync(organizerClient, sharedTitle);
    const createdPrimaryRow = primaryClubRows.find((row) => row.source_club_id === seededClubId) ?? null;

    if (createdPrimaryRow === null) {
      throw new Error("Expected organizer-created official tag for the seeded club to be readable.");
    }

    if (
      createdPrimaryRow.source_type !== "CLUB" ||
      createdPrimaryRow.created_by !== seededOrganizerId ||
      createdPrimaryRow.status !== "ACTIVE" ||
      createdPrimaryRow.city !== "Helsinki" ||
      createdPrimaryRow.university_name !== "Aalto University"
    ) {
      throw new Error("Organizer-created official tag row did not keep the expected club metadata.");
    }

    artifacts.createdDepartmentTagIds.push(createdPrimaryRow.id);
    outputs.push(`created-row:${createdPrimaryRow.slug}`);

    const createSecondClubResult = await invokeCreateRouteAsync(organizerRouteClient, {
      clubId: artifacts.secondClubId,
      title: sharedTitle,
    });

    if (createSecondClubResult.status !== 200 || createSecondClubResult.responseBody.status !== "SUCCESS") {
      throw new Error(
        `Expected second-club department tag create to succeed, got ${createSecondClubResult.status} ${createSecondClubResult.responseBody.status ?? "null"}.`
      );
    }

    const secondClubRows = await fetchDepartmentTagsByTitleAsync(organizerClient, sharedTitle);
    const createdSecondRow = secondClubRows.find((row) => row.source_club_id === artifacts.secondClubId) ?? null;

    if (createdSecondRow === null) {
      throw new Error("Expected organizer-created official tag for the second club to be readable.");
    }

    artifacts.createdDepartmentTagIds.push(createdSecondRow.id);
    outputs.push("cross-club-duplicate-title:SUCCESS");

    const duplicateResult = await invokeCreateRouteAsync(organizerRouteClient, {
      clubId: seededClubId,
      title: sharedTitle,
    });

    if (duplicateResult.status !== 200 || duplicateResult.responseBody.status !== "DEPARTMENT_TAG_ALREADY_EXISTS") {
      throw new Error(
        `Expected duplicate department tag create to return DEPARTMENT_TAG_ALREADY_EXISTS, got ${duplicateResult.status} ${duplicateResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push(`duplicate-route:${duplicateResult.responseBody.status}`);

    await assertOrganizerDirectUpdateBlockedAsync(organizerClient, createdPrimaryRow.id, sharedTitle);
    outputs.push("organizer-direct-update:rls-blocked");

    await assertOrganizerDirectDeleteBlockedAsync(organizerClient, createdSecondRow.id);
    outputs.push("organizer-direct-delete:rls-blocked");

    const updatedTitle = `Updated Official Study Label ${suffix}`;
    const updateResult = await invokeUpdateRouteAsync(organizerRouteClient, {
      departmentTagId: createdPrimaryRow.id,
      title: updatedTitle,
    });

    if (updateResult.status !== 200 || updateResult.responseBody.status !== "SUCCESS") {
      throw new Error(
        `Expected organizer department tag update to succeed, got ${updateResult.status} ${updateResult.responseBody.status ?? "null"}.`
      );
    }

    const updatedPrimaryRow = await fetchDepartmentTagByIdAsync(organizerClient, createdPrimaryRow.id);

    if (updatedPrimaryRow === null || updatedPrimaryRow.title !== updatedTitle || updatedPrimaryRow.status !== "ACTIVE") {
      throw new Error("Expected organizer department tag update route to persist the edited title.");
    }

    outputs.push(`update-route:${updateResult.responseBody.status}`);

    const duplicateUpdateSeedResult = await invokeCreateRouteAsync(organizerRouteClient, {
      clubId: seededClubId,
      title: `Duplicate Update Seed ${suffix}`,
    });

    if (duplicateUpdateSeedResult.status !== 200 || duplicateUpdateSeedResult.responseBody.status !== "SUCCESS") {
      throw new Error(
        `Expected duplicate-update seed tag create to succeed, got ${duplicateUpdateSeedResult.status} ${duplicateUpdateSeedResult.responseBody.status ?? "null"}.`
      );
    }

    const duplicateUpdateSeedRows = await fetchDepartmentTagsByTitleAsync(
      organizerClient,
      `Duplicate Update Seed ${suffix}`
    );
    const duplicateUpdateSeedRow =
      duplicateUpdateSeedRows.find((row) => row.source_club_id === seededClubId) ?? null;

    if (duplicateUpdateSeedRow === null) {
      throw new Error("Expected duplicate-update seed official tag for the seeded club to be readable.");
    }

    artifacts.createdDepartmentTagIds.push(duplicateUpdateSeedRow.id);

    const duplicateUpdateResult = await invokeUpdateRouteAsync(organizerRouteClient, {
      departmentTagId: duplicateUpdateSeedRow.id,
      title: updatedTitle,
    });

    if (
      duplicateUpdateResult.status !== 200 ||
      duplicateUpdateResult.responseBody.status !== "DEPARTMENT_TAG_ALREADY_EXISTS"
    ) {
      throw new Error(
        `Expected duplicate department tag update to return DEPARTMENT_TAG_ALREADY_EXISTS, got ${duplicateUpdateResult.status} ${duplicateUpdateResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push(`duplicate-update:${duplicateUpdateResult.responseBody.status}`);

    const deleteResult = await invokeDeleteRouteAsync(organizerRouteClient, {
      departmentTagId: createdPrimaryRow.id,
    });

    if (deleteResult.status !== 200 || deleteResult.responseBody.status !== "SUCCESS") {
      throw new Error(
        `Expected organizer department tag delete to succeed, got ${deleteResult.status} ${deleteResult.responseBody.status ?? "null"}.`
      );
    }

    const deletedPrimaryRow = await fetchDepartmentTagByIdAsync(organizerClient, createdPrimaryRow.id);

    if (deletedPrimaryRow !== null) {
      throw new Error("Expected organizer department tag delete route to remove the official tag.");
    }

    outputs.push(`delete-route:${deleteResult.responseBody.status}`);

    const invalidClubResult = await invokeCreateRouteAsync(organizerRouteClient, {
      clubId: "not-a-uuid",
      title: `Invalid Club ${suffix}`,
    });

    if (invalidClubResult.status !== 400 || invalidClubResult.responseBody.status !== "VALIDATION_ERROR") {
      throw new Error(
        `Expected invalid club create to return 400 VALIDATION_ERROR, got ${invalidClubResult.status} ${invalidClubResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push(`invalid-club:${invalidClubResult.responseBody.status}`);

    const studentRouteResult = await invokeCreateRouteAsync(studentRouteClient, {
      clubId: seededClubId,
      title: `Student Blocked Tag ${suffix}`,
    });

    if (studentRouteResult.status !== 403 || studentRouteResult.responseBody.status !== "CLUB_NOT_ALLOWED") {
      throw new Error(
        `Expected student department tag route create to return 403 CLUB_NOT_ALLOWED, got ${studentRouteResult.status} ${studentRouteResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push("student-route:CLUB_NOT_ALLOWED");

    console.log(outputs.join("|"));
  } catch (error) {
    runError = error instanceof Error ? error : new Error("Unknown club department-tag smoke error.");
    throw runError;
  } finally {
    try {
      await cleanupSmokeArtifactsAsync(artifacts);
    } catch (cleanupError) {
      if (runError === null) {
        throw cleanupError;
      }

      console.error(cleanupError);
    } finally {
      await signOutAsync(organizerClient);
      await signOutAsync(organizerRouteClient);
      await signOutAsync(studentClient);
      await signOutAsync(studentRouteClient);
      await signOutAsync(staffClient);
      await signOutAsync(staffRouteClient);
    }
  }
};

void run();
