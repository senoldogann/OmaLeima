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
const seededEventId = "30000000-0000-0000-0000-000000000001";
const seededClubId = "10000000-0000-0000-0000-000000000001";
const seededOrganizerId = "00000000-0000-0000-0000-000000000002";
const seededStudentId = "00000000-0000-0000-0000-000000000004";

if (typeof supabaseUrl !== "string" || supabaseUrl.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL for club rewards smoke script.");
}

if (typeof publishableKey !== "string" || publishableKey.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for club rewards smoke script.");
}

type RewardTierRow = {
  claim_instructions: string | null;
  id: string;
  inventory_claimed: number;
  inventory_total: number | null;
  required_stamp_count: number;
  reward_type: string;
  status: string;
  title: string;
};

type RewardTierMutationResponse = {
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

type ClubStaffFixture = {
  email: string;
  profileId: string;
};

type ClaimedRewardFixture = {
  rewardTierId: string;
  title: string;
};

type RewardSmokeArtifacts = {
  claimedFixture: ClaimedRewardFixture | null;
  createdRewardTierIds: string[];
  staffFixture: ClubStaffFixture | null;
};

type RewardTierCreatePayload = {
  claimInstructions: string;
  description: string;
  eventId: string;
  inventoryTotal: string;
  requiredStampCount: string;
  rewardType: "COUPON" | "ENTRY" | "HAALARIMERKKI" | "OTHER" | "PATCH" | "PRODUCT";
  title: string;
};

type RewardTierUpdatePayload = {
  claimInstructions: string;
  description: string;
  inventoryTotal: string;
  requiredStampCount: string;
  rewardTierId: string;
  rewardType: "COUPON" | "ENTRY" | "HAALARIMERKKI" | "OTHER" | "PATCH" | "PRODUCT";
  status: "ACTIVE" | "DISABLED";
  title: string;
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
    throw new Error(`Failed to sign in ${email} for club rewards smoke: ${signInResult.error.message}`);
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
    throw new Error(`Failed to sign in ${email} for club reward route smoke: ${signInResult.error.message}`);
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
  const email = `club-reward-staff-${suffix.toLowerCase()}@example.test`;
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
      '{"display_name":"Club Reward Staff ${suffix}"}'::jsonb,
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
      'Club Reward Staff ${suffix}',
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

const seedClaimedRewardFixtureAsync = async (suffix: string): Promise<ClaimedRewardFixture> => {
  const rewardTierId = randomUUID();
  const rewardClaimId = randomUUID();
  const title = `Claimed Reward ${suffix}`;
  const sql = `
    begin;

    insert into public.reward_tiers (
      id,
      event_id,
      title,
      description,
      required_stamp_count,
      reward_type,
      inventory_total,
      inventory_claimed,
      claim_instructions,
      status
    ) values (
      '${rewardTierId}',
      '${seededEventId}',
      '${title}',
      'Claimed reward fixture',
      2,
      'PATCH',
      1,
      1,
      'Fixture instructions',
      'ACTIVE'
    );

    insert into public.reward_claims (
      id,
      event_id,
      student_id,
      reward_tier_id,
      status,
      claimed_by,
      notes
    ) values (
      '${rewardClaimId}',
      '${seededEventId}',
      '${seededStudentId}',
      '${rewardTierId}',
      'CLAIMED',
      '${seededOrganizerId}',
      'Reward tier smoke fixture'
    );

    commit;
  `;

  await runSqlAsync(sql);

  return {
    rewardTierId,
    title,
  };
};

const createRewardPayload = (title: string): RewardTierCreatePayload => ({
  claimInstructions: "Pick up at the organizer desk.",
  description: "Reward tier smoke route validation.",
  eventId: seededEventId,
  inventoryTotal: "25",
  requiredStampCount: "5",
  rewardType: "PATCH",
  title,
});

const invokeCreateRouteAsync = async (
  client: CookieBackedClient,
  body: Partial<RewardTierCreatePayload>
): Promise<{ responseBody: RewardTierMutationResponse; status: number }> => {
  const response = await fetch(`${appBaseUrl}/api/club/reward-tiers/create`, {
    body: JSON.stringify(body),
    headers: {
      Cookie: client.toCookieHeader(),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json()) as RewardTierMutationResponse;

  return {
    responseBody,
    status: response.status,
  };
};

const invokeUpdateRouteAsync = async (
  client: CookieBackedClient,
  body: Partial<RewardTierUpdatePayload>
): Promise<{ responseBody: RewardTierMutationResponse; status: number }> => {
  const response = await fetch(`${appBaseUrl}/api/club/reward-tiers/update`, {
    body: JSON.stringify(body),
    headers: {
      Cookie: client.toCookieHeader(),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json()) as RewardTierMutationResponse;

  return {
    responseBody,
    status: response.status,
  };
};

const fetchRewardTierByTitleAsync = async (
  client: AuthedClient,
  title: string
): Promise<RewardTierRow[]> => {
  const { data, error } = await client.supabase
    .from("reward_tiers")
    .select("id,title,required_stamp_count,reward_type,inventory_total,inventory_claimed,claim_instructions,status")
    .eq("title", title)
    .returns<RewardTierRow[]>();

  if (error !== null) {
    throw new Error(`Failed to read reward tiers for ${title}: ${error.message}`);
  }

  return data;
};

const assertStudentDirectInsertBlockedAsync = async (client: AuthedClient, suffix: string): Promise<void> => {
  const { error } = await client.supabase.from("reward_tiers").insert({
    claim_instructions: "Student direct insert",
    event_id: seededEventId,
    inventory_total: 2,
    required_stamp_count: 1,
    reward_type: "PATCH",
    title: `Student Reward Insert ${suffix}`,
  });

  if (error === null) {
    throw new Error("Expected student direct reward tier insert to be blocked by RLS.");
  }
};

const assertStaffDirectInsertBlockedAsync = async (client: AuthedClient, suffix: string): Promise<void> => {
  const { error } = await client.supabase.from("reward_tiers").insert({
    claim_instructions: "Staff direct insert",
    event_id: seededEventId,
    inventory_total: 2,
    required_stamp_count: 1,
    reward_type: "PATCH",
    title: `Staff Reward Insert ${suffix}`,
  });

  if (error === null) {
    throw new Error("Expected staff direct reward tier insert to be blocked by RLS.");
  }
};

const assertRewardsPageContainsAsync = async (
  client: CookieBackedClient,
  snippet: string
): Promise<void> => {
  const response = await fetch(`${appBaseUrl}/club/rewards`, {
    headers: {
      Cookie: client.toCookieHeader(),
    },
    method: "GET",
  });
  const html = await response.text();

  if (!response.ok) {
    throw new Error(`Expected /club/rewards to return 200, got ${response.status}.`);
  }

  if (!html.includes(snippet)) {
    throw new Error(`Expected /club/rewards to contain ${snippet}.`);
  }
};

const assertRewardsRouteRedirectAsync = async (
  client: CookieBackedClient,
  expectedLocation: string
): Promise<void> => {
  const response = await fetch(`${appBaseUrl}/club/rewards`, {
    headers: {
      Cookie: client.toCookieHeader(),
    },
    method: "GET",
    redirect: "manual",
  });

  if (response.status !== 307) {
    throw new Error(`Expected /club/rewards to redirect, got ${response.status}.`);
  }

  const location = response.headers.get("location");

  if (location !== expectedLocation) {
    throw new Error(`Expected /club/rewards redirect to ${expectedLocation}, got ${location}.`);
  }
};

const cleanupSmokeArtifactsAsync = async (
  artifacts: RewardSmokeArtifacts
): Promise<void> => {
  const rewardTierIds = Array.from(
    new Set([
      ...artifacts.createdRewardTierIds,
      ...(artifacts.claimedFixture === null ? [] : [artifacts.claimedFixture.rewardTierId]),
    ])
  );
  const rewardTierIdList = rewardTierIds.map((id) => `'${id}'::uuid`).join(", ");
  const deleteRewardSql =
    rewardTierIds.length === 0
      ? ""
      : `
        delete from public.reward_claims
        where reward_tier_id in (${rewardTierIdList});

        delete from public.audit_logs
        where resource_type = 'reward_tiers'
          and resource_id in (${rewardTierIdList});

        delete from public.reward_tiers
        where id in (${rewardTierIdList});
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
    ${deleteRewardSql}
    ${deleteStaffSql}

    commit;
  `;

  await runSqlAsync(sql);
};

const run = async (): Promise<void> => {
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const outputs: string[] = [];
  const artifacts: RewardSmokeArtifacts = {
    claimedFixture: null,
    createdRewardTierIds: [],
    staffFixture: null,
  };
  let organizerClient: AuthedClient | null = null;
  let organizerRouteClient: CookieBackedClient | null = null;
  let studentClient: AuthedClient | null = null;
  let studentRouteClient: CookieBackedClient | null = null;
  let staffClient: AuthedClient | null = null;
  let staffRouteClient: CookieBackedClient | null = null;
  let runError: Error | null = null;

  try {
    artifacts.staffFixture = await seedClubStaffFixtureAsync(suffix);
    artifacts.claimedFixture = await seedClaimedRewardFixtureAsync(suffix);
    const staffFixture = artifacts.staffFixture;
    const claimedFixture = artifacts.claimedFixture;
    organizerClient = await createAuthedClientAsync("organizer@omaleima.test", "password123");
    organizerRouteClient = await createCookieBackedClientAsync("organizer@omaleima.test", "password123");
    studentClient = await createAuthedClientAsync("student@omaleima.test", "password123");
    studentRouteClient = await createCookieBackedClientAsync("student@omaleima.test", "password123");
    staffClient = await createAuthedClientAsync(staffFixture.email, "password123");
    staffRouteClient = await createCookieBackedClientAsync(staffFixture.email, "password123");

    await assertStudentDirectInsertBlockedAsync(studentClient, suffix);
    outputs.push("student-direct-insert:rls-blocked");

    await assertStaffDirectInsertBlockedAsync(staffClient, suffix);
    outputs.push("staff-direct-insert:rls-blocked");

    await assertRewardsRouteRedirectAsync(staffRouteClient, "/forbidden");
    outputs.push("staff-route-redirect:/forbidden");

    const staffRouteResult = await invokeCreateRouteAsync(
      staffRouteClient,
      createRewardPayload(`Staff Route Blocked ${suffix}`)
    );

    if (staffRouteResult.status !== 403 || staffRouteResult.responseBody.status !== "CLUB_NOT_ALLOWED") {
      throw new Error(
        `Expected staff reward tier route create to return 403 CLUB_NOT_ALLOWED, got ${staffRouteResult.status} ${staffRouteResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push("staff-route:CLUB_NOT_ALLOWED");

    const rewardTitle = `Reward Smoke ${suffix}`;
    const createResult = await invokeCreateRouteAsync(organizerRouteClient, createRewardPayload(rewardTitle));

    if (createResult.status !== 200 || createResult.responseBody.status !== "SUCCESS") {
      throw new Error(
        `Expected organizer reward tier route create to succeed, got ${createResult.status} ${createResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push(`create-route:${createResult.responseBody.status}`);

    const createdRows = await fetchRewardTierByTitleAsync(organizerClient, rewardTitle);

    if (createdRows.length !== 1) {
      throw new Error(`Expected organizer to read 1 created reward tier for ${rewardTitle}, got ${createdRows.length}.`);
    }

    artifacts.createdRewardTierIds.push(createdRows[0].id);
    outputs.push(`created-tier:${createdRows[0].id}`);

    await assertRewardsPageContainsAsync(organizerRouteClient, rewardTitle);
    outputs.push("club-rewards-route:ok");

    const invalidTypeResult = await invokeCreateRouteAsync(organizerRouteClient, {
      ...createRewardPayload(`Invalid Reward Type ${suffix}`),
      rewardType: "INVALID" as never,
    });

    if (invalidTypeResult.status !== 400 || invalidTypeResult.responseBody.status !== "VALIDATION_ERROR") {
      throw new Error(
        `Expected invalid reward type request to return 400 VALIDATION_ERROR, got ${invalidTypeResult.status} ${invalidTypeResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push(`invalid-type:${invalidTypeResult.responseBody.status}`);

    const updateResult = await invokeUpdateRouteAsync(organizerRouteClient, {
      claimInstructions: "Collect from the main organizer table.",
      description: "Updated reward tier description.",
      inventoryTotal: "12",
      requiredStampCount: "6",
      rewardTierId: createdRows[0].id,
      rewardType: "PRODUCT",
      status: "DISABLED",
      title: `${rewardTitle} Updated`,
    });

    if (updateResult.status !== 200 || updateResult.responseBody.status !== "SUCCESS") {
      throw new Error(
        `Expected organizer reward tier update to succeed, got ${updateResult.status} ${updateResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push(`update-route:${updateResult.responseBody.status}`);

    const updatedRows = await fetchRewardTierByTitleAsync(organizerClient, `${rewardTitle} Updated`);

    if (updatedRows.length !== 1) {
      throw new Error(`Expected organizer to read 1 updated reward tier, got ${updatedRows.length}.`);
    }

    if (
      updatedRows[0].inventory_total !== 12 ||
      updatedRows[0].required_stamp_count !== 6 ||
      updatedRows[0].reward_type !== "PRODUCT" ||
      updatedRows[0].status !== "DISABLED"
    ) {
      throw new Error("Updated reward tier row did not persist the expected values.");
    }

    await assertRewardsPageContainsAsync(organizerRouteClient, `${rewardTitle} Updated`);
    outputs.push("updated-tier:ok");

    const inventoryConflictResult = await invokeUpdateRouteAsync(organizerRouteClient, {
      claimInstructions: "Fixture instructions",
      description: "Claimed reward fixture",
      inventoryTotal: "0",
      requiredStampCount: "2",
      rewardTierId: claimedFixture.rewardTierId,
      rewardType: "PATCH",
      status: "ACTIVE",
      title: claimedFixture.title,
    });

    if (
      inventoryConflictResult.status !== 200 ||
      inventoryConflictResult.responseBody.status !== "REWARD_INVENTORY_CONFLICT"
    ) {
      throw new Error(
        `Expected claimed inventory update to return REWARD_INVENTORY_CONFLICT, got ${inventoryConflictResult.status} ${inventoryConflictResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push(`claimed-inventory-floor:${inventoryConflictResult.responseBody.status}`);

    const studentRouteResult = await invokeCreateRouteAsync(
      studentRouteClient,
      createRewardPayload(`Student Route Blocked ${suffix}`)
    );

    if (studentRouteResult.status !== 403 || studentRouteResult.responseBody.status !== "CLUB_NOT_ALLOWED") {
      throw new Error(
        `Expected student reward tier route create to return 403 CLUB_NOT_ALLOWED, got ${studentRouteResult.status} ${studentRouteResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push("student-route:CLUB_NOT_ALLOWED");

    console.log(outputs.join("|"));
  } catch (error) {
    runError = error instanceof Error ? error : new Error("Unknown club rewards smoke error.");
    throw runError;
  } finally {
    try {
      await cleanupSmokeArtifactsAsync(artifacts);
    } catch (cleanupError) {
      if (runError === null) {
        throw cleanupError;
      }

      console.error(cleanupError);
    }
  }
};

void run();
