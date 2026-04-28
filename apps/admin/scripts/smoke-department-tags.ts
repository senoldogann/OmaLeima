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

if (typeof supabaseUrl !== "string" || supabaseUrl.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL for department-tag smoke script.");
}

if (typeof publishableKey !== "string" || publishableKey.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for department-tag smoke script.");
}

type DepartmentTagStatus = "ACTIVE" | "BLOCKED" | "MERGED" | "PENDING_REVIEW";

type DepartmentTagRow = {
  id: string;
  merged_into_tag_id: string | null;
  status: DepartmentTagStatus;
};

type ProfileDepartmentTagRow = {
  department_tag_id: string;
  is_primary: boolean;
  profile_id: string;
  slot: number;
};

type ModerationMutationResponse = {
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

type SeededFixtureSet = {
  blockStudentProfileId: string;
  blockTagId: string;
  blockTagTitle: string;
  mergeSourceTagId: string;
  mergeSourceTagTitle: string;
  mergeStudentProfileId: string;
  pendingTagId: string;
  pendingTagTitle: string;
  targetTagId: string;
  targetTagTitle: string;
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
    throw new Error(`Failed to sign in ${email} for department-tag smoke: ${signInResult.error.message}`);
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
    throw new Error(`Failed to sign in ${email} for department-tag route smoke: ${signInResult.error.message}`);
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

const seedDepartmentTagFixtures = (suffix: string): SeededFixtureSet => {
  const mergeStudentProfileId = randomUUID();
  const blockStudentProfileId = randomUUID();
  const targetTagId = randomUUID();
  const mergeSourceTagId = randomUUID();
  const blockTagId = randomUUID();
  const pendingTagId = randomUUID();
  const mergeLinkId = randomUUID();
  const blockLinkId = randomUUID();
  const targetTagTitle = `Smoke Canonical Tag ${suffix}`;
  const mergeSourceTagTitle = `Smoke Duplicate Tag ${suffix}`;
  const blockTagTitle = `Smoke Block Tag ${suffix}`;
  const pendingTagTitle = `Smoke Pending Tag ${suffix}`;
  const targetTagSlug = `smoke-canonical-tag-${suffix.toLowerCase()}`;
  const mergeSourceTagSlug = `smoke-duplicate-tag-${suffix.toLowerCase()}`;
  const blockTagSlug = `smoke-block-tag-${suffix.toLowerCase()}`;
  const pendingTagSlug = `smoke-pending-tag-${suffix.toLowerCase()}`;
  const mergeStudentEmail = `merge-smoke-${suffix.toLowerCase()}@example.test`;
  const blockStudentEmail = `block-smoke-${suffix.toLowerCase()}@example.test`;
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
    ) values
      (
        '00000000-0000-0000-0000-000000000000',
        '${mergeStudentProfileId}',
        'authenticated',
        'authenticated',
        '${mergeStudentEmail}',
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
        '{"display_name":"Merge Smoke Student ${suffix}"}'::jsonb,
        now(),
        now()
      ),
      (
        '00000000-0000-0000-0000-000000000000',
        '${blockStudentProfileId}',
        'authenticated',
        'authenticated',
        '${blockStudentEmail}',
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
        '{"display_name":"Block Smoke Student ${suffix}"}'::jsonb,
        now(),
        now()
      );

    insert into public.profiles (
      id,
      email,
      display_name,
      primary_role,
      status
    ) values
      (
        '${mergeStudentProfileId}',
        '${mergeStudentEmail}',
        'Merge Smoke Student ${suffix}',
        'STUDENT',
        'ACTIVE'
      ),
      (
        '${blockStudentProfileId}',
        '${blockStudentEmail}',
        'Block Smoke Student ${suffix}',
        'STUDENT',
        'ACTIVE'
      );

    insert into public.department_tags (
      id,
      title,
      slug,
      university_name,
      city,
      source_type,
      source_club_id,
      created_by,
      status
    ) values
      (
        '${targetTagId}',
        '${targetTagTitle}',
        '${targetTagSlug}',
        'Aalto University',
        'Helsinki',
        'CLUB',
        '10000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        'ACTIVE'
      ),
      (
        '${mergeSourceTagId}',
        '${mergeSourceTagTitle}',
        '${mergeSourceTagSlug}',
        'Aalto University',
        'Helsinki',
        'USER',
        null,
        '00000000-0000-0000-0000-000000000004',
        'ACTIVE'
      ),
      (
        '${blockTagId}',
        '${blockTagTitle}',
        '${blockTagSlug}',
        'Aalto University',
        'Espoo',
        'USER',
        null,
        '00000000-0000-0000-0000-000000000004',
        'ACTIVE'
      ),
      (
        '${pendingTagId}',
        '${pendingTagTitle}',
        '${pendingTagSlug}',
        'Aalto University',
        'Helsinki',
        'USER',
        null,
        '00000000-0000-0000-0000-000000000004',
        'PENDING_REVIEW'
      );

    insert into public.profile_department_tags (
      id,
      profile_id,
      department_tag_id,
      slot,
      is_primary,
      source_type
    ) values
      (
        '${mergeLinkId}',
        '${mergeStudentProfileId}',
        '${mergeSourceTagId}',
        1,
        true,
        'SELF_SELECTED'
      ),
      (
        '${blockLinkId}',
        '${blockStudentProfileId}',
        '${blockTagId}',
        1,
        false,
        'SELF_SELECTED'
      );

    commit;
  `;

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

  return {
    blockStudentProfileId,
    blockTagId,
    blockTagTitle,
    mergeSourceTagId,
    mergeSourceTagTitle,
    mergeStudentProfileId,
    pendingTagId,
    pendingTagTitle,
    targetTagId,
    targetTagTitle,
  };
};

const assertAdminVisibleTagAsync = async (client: AuthedClient, tagId: string): Promise<void> => {
  const { data, error } = await client.supabase
    .from("department_tags")
    .select("id,status,merged_into_tag_id")
    .eq("id", tagId)
    .returns<DepartmentTagRow[]>();

  if (error !== null) {
    throw new Error(`Admin department tag read failed for ${client.email}: ${error.message}`);
  }

  if (data.length !== 1) {
    throw new Error(`Expected admin to see 1 department tag row for ${tagId}, got ${data.length}.`);
  }
};

const assertRowsHiddenAsync = async (client: AuthedClient, tagIds: string[]): Promise<void> => {
  const { data, error } = await client.supabase
    .from("department_tags")
    .select("id")
    .in("id", tagIds);

  if (error !== null) {
    throw new Error(`Non-admin department tag read returned an unexpected error for ${client.email}: ${error.message}`);
  }

  if (data.length !== 0) {
    throw new Error(`Expected ${client.email} to see 0 moderated department tags, got ${data.length}.`);
  }
};

const assertModerationPageContainsAsync = async (
  client: CookieBackedClient,
  expectedSnippets: string[]
): Promise<void> => {
  const response = await fetch(`${appBaseUrl}/admin/department-tags`, {
    headers: {
      Cookie: client.toCookieHeader(),
    },
    method: "GET",
  });
  const html = await response.text();

  if (!response.ok) {
    throw new Error(`Expected admin department tags page to return 200, got ${response.status}.`);
  }

  expectedSnippets.forEach((snippet) => {
    if (!html.includes(snippet)) {
      throw new Error(`Expected department tags page to contain ${snippet}.`);
    }
  });
};

const assertOrganizerModerationRedirectAsync = async (client: CookieBackedClient): Promise<void> => {
  const response = await fetch(`${appBaseUrl}/admin/department-tags`, {
    headers: {
      Cookie: client.toCookieHeader(),
    },
    method: "GET",
    redirect: "manual",
  });

  if (response.status !== 307) {
    throw new Error(`Expected organizer department tag route to return 307, got ${response.status}.`);
  }

  const location = response.headers.get("location");

  if (location !== "/club") {
    throw new Error(`Expected organizer department tag redirect to /club, got ${location}.`);
  }
};

const invokeModerationRouteAsync = async (
  client: CookieBackedClient,
  path: "/api/admin/department-tags/block" | "/api/admin/department-tags/merge",
  body: Record<string, string>
): Promise<{ responseBody: ModerationMutationResponse; status: number }> => {
  const response = await fetch(`${appBaseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: {
      Cookie: client.toCookieHeader(),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json()) as ModerationMutationResponse;

  return {
    responseBody,
    status: response.status,
  };
};

const assertMergedStateAsync = async (
  client: AuthedClient,
  sourceTagId: string,
  targetTagId: string,
  profileId: string
): Promise<void> => {
  const { data: sourceRows, error: sourceError } = await client.supabase
    .from("department_tags")
    .select("id,status,merged_into_tag_id")
    .eq("id", sourceTagId)
    .returns<DepartmentTagRow[]>();

  if (sourceError !== null) {
    throw new Error(`Failed to read merged source tag ${sourceTagId}: ${sourceError.message}`);
  }

  if (
    sourceRows.length !== 1 ||
    sourceRows[0]?.status !== "MERGED" ||
    sourceRows[0]?.merged_into_tag_id !== targetTagId
  ) {
    throw new Error(`Expected source tag ${sourceTagId} to be merged into ${targetTagId}.`);
  }

  const { data: linkRows, error: linkError } = await client.supabase
    .from("profile_department_tags")
    .select("profile_id,department_tag_id,slot,is_primary")
    .eq("profile_id", profileId)
    .returns<ProfileDepartmentTagRow[]>();

  if (linkError !== null) {
    throw new Error(`Failed to verify merge profile links for ${profileId}: ${linkError.message}`);
  }

  if (linkRows.length !== 1) {
    throw new Error(`Expected 1 profile link after merge for ${profileId}, got ${linkRows.length}.`);
  }

  if (
    linkRows[0]?.department_tag_id !== targetTagId ||
    linkRows[0]?.slot !== 1 ||
    linkRows[0]?.is_primary !== true
  ) {
    throw new Error(`Expected merged profile link to move to ${targetTagId} and stay primary.`);
  }
};

const assertBlockedStateAsync = async (
  client: AuthedClient,
  tagId: string,
  profileId: string
): Promise<void> => {
  const { data: tagRows, error: tagError } = await client.supabase
    .from("department_tags")
    .select("id,status,merged_into_tag_id")
    .eq("id", tagId)
    .returns<DepartmentTagRow[]>();

  if (tagError !== null) {
    throw new Error(`Failed to read blocked tag ${tagId}: ${tagError.message}`);
  }

  if (tagRows.length !== 1 || tagRows[0]?.status !== "BLOCKED") {
    throw new Error(`Expected tag ${tagId} to be blocked.`);
  }

  const { data: linkRows, error: linkError } = await client.supabase
    .from("profile_department_tags")
    .select("profile_id,department_tag_id,slot,is_primary")
    .eq("profile_id", profileId)
    .returns<ProfileDepartmentTagRow[]>();

  if (linkError !== null) {
    throw new Error(`Failed to verify blocked profile links for ${profileId}: ${linkError.message}`);
  }

  if (linkRows.length !== 0) {
    throw new Error(`Expected 0 profile links after block for ${profileId}, got ${linkRows.length}.`);
  }
};

const signOutAsync = async (client: AuthedClient | CookieBackedClient): Promise<void> => {
  const signOutResult = await client.supabase.auth.signOut();

  if (signOutResult.error !== null) {
    throw new Error(`Failed to sign out ${client.email}: ${signOutResult.error.message}`);
  }
};

const run = async (): Promise<void> => {
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const adminDataClient = await createAuthedClientAsync("admin@omaleima.test", "password123");
  const organizerDataClient = await createAuthedClientAsync("organizer@omaleima.test", "password123");
  const studentDataClient = await createAuthedClientAsync("student@omaleima.test", "password123");
  const adminRouteClient = await createCookieBackedClientAsync("admin@omaleima.test", "password123");
  const organizerRouteClient = await createCookieBackedClientAsync("organizer@omaleima.test", "password123");
  const fixtureSet = seedDepartmentTagFixtures(suffix);
  const outputs: string[] = [];

  await assertAdminVisibleTagAsync(adminDataClient, fixtureSet.pendingTagId);
  outputs.push("admin-pending-read:1");

  await assertRowsHiddenAsync(organizerDataClient, [fixtureSet.pendingTagId]);
  outputs.push("organizer-pending-read:0");

  await assertRowsHiddenAsync(studentDataClient, [fixtureSet.pendingTagId]);
  outputs.push("student-pending-read:0");

  await assertModerationPageContainsAsync(adminRouteClient, [
    "Department tags",
    fixtureSet.pendingTagTitle,
    fixtureSet.mergeSourceTagTitle,
    fixtureSet.blockTagTitle,
    fixtureSet.targetTagTitle,
  ]);
  outputs.push("admin-route-content:ok");

  const mergeResult = await invokeModerationRouteAsync(adminRouteClient, "/api/admin/department-tags/merge", {
    sourceTagId: fixtureSet.mergeSourceTagId,
    targetTagId: fixtureSet.targetTagId,
  });

  if (mergeResult.status !== 200 || mergeResult.responseBody.status !== "SUCCESS") {
    throw new Error(
      `Expected merge route to return 200 SUCCESS, got ${mergeResult.status} ${mergeResult.responseBody.status}.`
    );
  }

  outputs.push(`merge:${mergeResult.responseBody.status}`);

  const invalidMergeResult = await invokeModerationRouteAsync(
    adminRouteClient,
    "/api/admin/department-tags/merge",
    {
      sourceTagId: "not-a-uuid",
      targetTagId: fixtureSet.targetTagId,
    }
  );

  if (invalidMergeResult.status !== 400 || invalidMergeResult.responseBody.status !== "VALIDATION_ERROR") {
    throw new Error(
      `Expected invalid merge route to return 400 VALIDATION_ERROR, got ${invalidMergeResult.status} ${invalidMergeResult.responseBody.status}.`
    );
  }

  outputs.push(`invalid-merge:${invalidMergeResult.responseBody.status}`);

  const duplicateMergeResult = await invokeModerationRouteAsync(
    adminRouteClient,
    "/api/admin/department-tags/merge",
    {
      sourceTagId: fixtureSet.mergeSourceTagId,
      targetTagId: fixtureSet.targetTagId,
    }
  );

  if (duplicateMergeResult.status !== 200 || duplicateMergeResult.responseBody.status !== "SOURCE_TAG_ALREADY_MERGED") {
    throw new Error(
      `Expected duplicate merge route to return 200 SOURCE_TAG_ALREADY_MERGED, got ${duplicateMergeResult.status} ${duplicateMergeResult.responseBody.status}.`
    );
  }

  outputs.push(`duplicate-merge:${duplicateMergeResult.responseBody.status}`);

  const sameTargetMergeResult = await invokeModerationRouteAsync(
    adminRouteClient,
    "/api/admin/department-tags/merge",
    {
      sourceTagId: fixtureSet.pendingTagId,
      targetTagId: fixtureSet.pendingTagId,
    }
  );

  if (sameTargetMergeResult.status !== 400 || sameTargetMergeResult.responseBody.status !== "VALIDATION_ERROR") {
    throw new Error(
      `Expected same-target merge route to return 400 VALIDATION_ERROR, got ${sameTargetMergeResult.status} ${sameTargetMergeResult.responseBody.status}.`
    );
  }

  outputs.push(`same-target-merge:${sameTargetMergeResult.responseBody.status}`);

  const organizerMergeResult = await invokeModerationRouteAsync(
    organizerRouteClient,
    "/api/admin/department-tags/merge",
    {
      sourceTagId: fixtureSet.pendingTagId,
      targetTagId: fixtureSet.targetTagId,
    }
  );

  if (organizerMergeResult.status !== 403 || organizerMergeResult.responseBody.status !== "ADMIN_NOT_ALLOWED") {
    throw new Error(
      `Expected organizer merge route to return 403 ADMIN_NOT_ALLOWED, got ${organizerMergeResult.status} ${organizerMergeResult.responseBody.status}.`
    );
  }

  outputs.push(`organizer-merge:${organizerMergeResult.responseBody.status}`);

  await assertMergedStateAsync(
    adminDataClient,
    fixtureSet.mergeSourceTagId,
    fixtureSet.targetTagId,
    fixtureSet.mergeStudentProfileId
  );
  outputs.push("merge-repair:ok");

  const blockResult = await invokeModerationRouteAsync(adminRouteClient, "/api/admin/department-tags/block", {
    tagId: fixtureSet.blockTagId,
  });

  if (blockResult.status !== 200 || blockResult.responseBody.status !== "SUCCESS") {
    throw new Error(
      `Expected block route to return 200 SUCCESS, got ${blockResult.status} ${blockResult.responseBody.status}.`
    );
  }

  outputs.push(`block:${blockResult.responseBody.status}`);

  const invalidBlockResult = await invokeModerationRouteAsync(
    adminRouteClient,
    "/api/admin/department-tags/block",
    {
      tagId: "not-a-uuid",
    }
  );

  if (invalidBlockResult.status !== 400 || invalidBlockResult.responseBody.status !== "VALIDATION_ERROR") {
    throw new Error(
      `Expected invalid block route to return 400 VALIDATION_ERROR, got ${invalidBlockResult.status} ${invalidBlockResult.responseBody.status}.`
    );
  }

  outputs.push(`invalid-block:${invalidBlockResult.responseBody.status}`);

  const duplicateBlockResult = await invokeModerationRouteAsync(
    adminRouteClient,
    "/api/admin/department-tags/block",
    {
      tagId: fixtureSet.blockTagId,
    }
  );

  if (duplicateBlockResult.status !== 200 || duplicateBlockResult.responseBody.status !== "TAG_ALREADY_BLOCKED") {
    throw new Error(
      `Expected duplicate block route to return 200 TAG_ALREADY_BLOCKED, got ${duplicateBlockResult.status} ${duplicateBlockResult.responseBody.status}.`
    );
  }

  outputs.push(`duplicate-block:${duplicateBlockResult.responseBody.status}`);

  await assertBlockedStateAsync(adminDataClient, fixtureSet.blockTagId, fixtureSet.blockStudentProfileId);
  outputs.push("block-repair:ok");

  await assertModerationPageContainsAsync(adminRouteClient, [
    fixtureSet.pendingTagTitle,
    fixtureSet.mergeSourceTagTitle,
    fixtureSet.blockTagTitle,
  ]);
  outputs.push("admin-route-post-actions:ok");

  await assertOrganizerModerationRedirectAsync(organizerRouteClient);
  outputs.push("organizer-route-redirect:/club");

  await signOutAsync(adminDataClient);
  await signOutAsync(organizerDataClient);
  await signOutAsync(studentDataClient);
  await signOutAsync(adminRouteClient);
  await signOutAsync(organizerRouteClient);

  console.log(outputs.join("|"));
};

void run();
