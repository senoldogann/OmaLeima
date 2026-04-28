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
const seededBusinessId = "20000000-0000-0000-0000-000000000001";
const seededEventId = "30000000-0000-0000-0000-000000000001";
const seededScannerId = "00000000-0000-0000-0000-000000000003";
const seededStudentEmail = "student@omaleima.test";
const seededStudentId = "00000000-0000-0000-0000-000000000004";

if (typeof supabaseUrl !== "string" || supabaseUrl.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL for club claims smoke script.");
}

if (typeof publishableKey !== "string" || publishableKey.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for club claims smoke script.");
}

type RewardClaimMutationResponse = {
  message?: string;
  status?: string;
};

type RewardClaimRow = {
  id: string;
  reward_tier_id: string;
  status: "CLAIMED" | "REVOKED";
};

type RewardTierRow = {
  id: string;
  inventory_claimed: number;
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

type ClaimSmokeArtifacts = {
  outOfStockRewardTierId: string | null;
  qrJti: string | null;
  rewardClaimIds: string[];
  rewardTierIds: string[];
  staffFixture: ClubStaffFixture | null;
  successRewardTierId: string | null;
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
    throw new Error(`Failed to sign in ${email} for club claims smoke: ${signInResult.error.message}`);
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
    throw new Error(`Failed to sign in ${email} for club claim route smoke: ${signInResult.error.message}`);
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
  const email = `club-claim-staff-${suffix.toLowerCase()}@example.test`;
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
      '{"display_name":"Club Claim Staff ${suffix}"}'::jsonb,
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
      'Club Claim Staff ${suffix}',
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
      '10000000-0000-0000-0000-000000000001',
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

const seedClaimFixturesAsync = async (
  suffix: string,
  artifacts: ClaimSmokeArtifacts
): Promise<void> => {
  const successRewardTierId = randomUUID();
  const lowStampRewardTierId = randomUUID();
  const outOfStockRewardTierId = randomUUID();
  const qrJti = `claim-smoke-${suffix.toLowerCase()}`;
  artifacts.successRewardTierId = successRewardTierId;
  artifacts.outOfStockRewardTierId = outOfStockRewardTierId;
  artifacts.qrJti = qrJti;
  artifacts.rewardTierIds.push(successRewardTierId, lowStampRewardTierId, outOfStockRewardTierId);

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
    ) values
      (
        '${successRewardTierId}',
        '${seededEventId}',
        'Claim Success ${suffix}',
        'Success reward fixture',
        1,
        'PATCH',
        20,
        0,
        'Success fixture instructions',
        'ACTIVE'
      ),
      (
        '${lowStampRewardTierId}',
        '${seededEventId}',
        'Claim More Needed ${suffix}',
        'Low stamp reward fixture',
        2,
        'COUPON',
        20,
        0,
        'Low stamp fixture instructions',
        'ACTIVE'
      ),
      (
        '${outOfStockRewardTierId}',
        '${seededEventId}',
        'Claim Empty ${suffix}',
        'Out of stock reward fixture',
        1,
        'PRODUCT',
        1,
        1,
        'Out of stock fixture instructions',
        'ACTIVE'
      );

    insert into public.qr_token_uses (
      jti,
      event_id,
      student_id,
      business_id,
      scanner_user_id,
      scanner_device_id
    ) values (
      '${qrJti}',
      '${seededEventId}',
      '${seededStudentId}',
      '${seededBusinessId}',
      '${seededScannerId}',
      'claim-smoke-device'
    );

    insert into public.stamps (
      event_id,
      student_id,
      business_id,
      scanner_user_id,
      qr_jti,
      scanner_device_id,
      validation_status
    ) values (
      '${seededEventId}',
      '${seededStudentId}',
      '${seededBusinessId}',
      '${seededScannerId}',
      '${qrJti}',
      'claim-smoke-device',
      'VALID'
    );

    commit;
  `;

  await runSqlAsync(sql);
};

const assertStudentDirectInsertBlockedAsync = async (client: AuthedClient, rewardTierId: string): Promise<void> => {
  const { error } = await client.supabase.from("reward_claims").insert({
    event_id: seededEventId,
    student_id: seededStudentId,
    reward_tier_id: rewardTierId,
    claimed_by: seededStudentId,
    notes: "direct insert should fail",
  });

  if (error === null) {
    throw new Error("Expected student direct reward claim insert to be blocked by RLS.");
  }
};

const assertStaffDirectInsertBlockedAsync = async (
  client: AuthedClient,
  rewardTierId: string,
  staffFixture: ClubStaffFixture
): Promise<void> => {
  const { error } = await client.supabase.from("reward_claims").insert({
    event_id: seededEventId,
    student_id: seededStudentId,
    reward_tier_id: rewardTierId,
    claimed_by: staffFixture.profileId,
    notes: "direct insert should fail",
  });

  if (error === null) {
    throw new Error("Expected staff direct reward claim insert to be blocked by RLS.");
  }
};

const assertClaimsPageContainsAsync = async (
  client: CookieBackedClient,
  expectedSnippet: string,
  forbiddenSnippet: string | null
): Promise<void> => {
  const response = await fetch(`${appBaseUrl}/club/claims`, {
    headers: {
      Cookie: client.toCookieHeader(),
    },
    method: "GET",
  });
  const html = await response.text();

  if (!response.ok) {
    throw new Error(`Expected /club/claims to return 200, got ${response.status}.`);
  }

  if (!html.includes(expectedSnippet)) {
    throw new Error(`Expected /club/claims to contain ${expectedSnippet}.`);
  }

  if (forbiddenSnippet !== null && html.includes(forbiddenSnippet)) {
    throw new Error(`Expected /club/claims not to contain ${forbiddenSnippet}.`);
  }
};

const invokeConfirmRouteAsync = async (
  client: CookieBackedClient,
  body: Record<string, string>
): Promise<{ responseBody: RewardClaimMutationResponse; status: number }> => {
  const response = await fetch(`${appBaseUrl}/api/club/reward-claims/confirm`, {
    body: JSON.stringify(body),
    headers: {
      Cookie: client.toCookieHeader(),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json()) as RewardClaimMutationResponse;

  return {
    responseBody,
    status: response.status,
  };
};

const fetchRewardClaimsByTierAsync = async (
  client: AuthedClient,
  rewardTierId: string
): Promise<RewardClaimRow[]> => {
  const { data, error } = await client.supabase
    .from("reward_claims")
    .select("id,reward_tier_id,status")
    .eq("reward_tier_id", rewardTierId)
    .returns<RewardClaimRow[]>();

  if (error !== null) {
    throw new Error(`Failed to read reward claims for ${rewardTierId}: ${error.message}`);
  }

  return data;
};

const fetchRewardTierAsync = async (
  client: AuthedClient,
  rewardTierId: string
): Promise<RewardTierRow> => {
  const { data, error } = await client.supabase
    .from("reward_tiers")
    .select("id,inventory_claimed")
    .eq("id", rewardTierId)
    .single<RewardTierRow>();

  if (error !== null) {
    throw new Error(`Failed to read reward tier ${rewardTierId}: ${error.message}`);
  }

  return data;
};

const cleanupSmokeArtifactsAsync = async (artifacts: ClaimSmokeArtifacts): Promise<void> => {
  const rewardTierIds = artifacts.rewardTierIds.map((id) => `'${id}'::uuid`).join(", ");
  const rewardClaimIds = artifacts.rewardClaimIds.map((id) => `'${id}'::uuid`).join(", ");
  const deleteRewardTierSql =
    artifacts.rewardTierIds.length === 0
      ? ""
      : `
        delete from public.audit_logs
        where resource_type = 'reward_claims'
          and (
            metadata->>'rewardTierId' in (${artifacts.rewardTierIds.map((id) => `'${id}'`).join(", ")})
            ${artifacts.rewardClaimIds.length === 0 ? "" : `or resource_id in (${rewardClaimIds})`}
          );

        delete from public.reward_claims
        where reward_tier_id in (${rewardTierIds});

        delete from public.reward_tiers
        where id in (${rewardTierIds});
      `;
  const deleteStampSql =
    artifacts.qrJti === null
      ? ""
      : `
        delete from public.stamps
        where qr_jti = '${artifacts.qrJti}';

        delete from public.qr_token_uses
        where jti = '${artifacts.qrJti}';
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
    ${deleteRewardTierSql}
    ${deleteStampSql}
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
  const outputs: string[] = [];
  const artifacts: ClaimSmokeArtifacts = {
    outOfStockRewardTierId: null,
    qrJti: null,
    rewardClaimIds: [],
    rewardTierIds: [],
    staffFixture: null,
    successRewardTierId: null,
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
    await seedClaimFixturesAsync(suffix, artifacts);
    organizerClient = await createAuthedClientAsync("organizer@omaleima.test", "password123");
    organizerRouteClient = await createCookieBackedClientAsync("organizer@omaleima.test", "password123");
    studentClient = await createAuthedClientAsync(seededStudentEmail, "password123");
    studentRouteClient = await createCookieBackedClientAsync(seededStudentEmail, "password123");
    staffClient = await createAuthedClientAsync(artifacts.staffFixture.email, "password123");
    staffRouteClient = await createCookieBackedClientAsync(artifacts.staffFixture.email, "password123");

    await assertStudentDirectInsertBlockedAsync(studentClient, artifacts.successRewardTierId ?? "");
    outputs.push("student-direct-insert:rls-blocked");

    await assertStaffDirectInsertBlockedAsync(staffClient, artifacts.successRewardTierId ?? "", artifacts.staffFixture);
    outputs.push("staff-direct-insert:rls-blocked");

    await assertClaimsPageContainsAsync(staffRouteClient, "Student ...0004", seededStudentEmail);
    outputs.push("staff-claims-route:ok");

    const confirmResult = await invokeConfirmRouteAsync(staffRouteClient, {
      eventId: seededEventId,
      notes: "Delivered at the organizer desk.",
      rewardTierId: artifacts.successRewardTierId ?? "",
      studentId: seededStudentId,
    });

    if (confirmResult.status !== 200 || confirmResult.responseBody.status !== "SUCCESS") {
      throw new Error(
        `Expected staff reward claim route to succeed, got ${confirmResult.status} ${confirmResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push(`claim-route:${confirmResult.responseBody.status}`);

    const rewardClaims = await fetchRewardClaimsByTierAsync(organizerClient, artifacts.successRewardTierId ?? "");

    if (rewardClaims.length !== 1 || rewardClaims[0].status !== "CLAIMED") {
      throw new Error("Expected exactly one claimed reward record after successful handoff.");
    }

    artifacts.rewardClaimIds.push(rewardClaims[0].id);
    outputs.push("claim-row:ok");

    const claimedRewardTier = await fetchRewardTierAsync(organizerClient, artifacts.successRewardTierId ?? "");

    if (claimedRewardTier.inventory_claimed !== 1) {
      throw new Error(`Expected claimed reward inventory to be 1, got ${claimedRewardTier.inventory_claimed}.`);
    }

    outputs.push("inventory-increment:ok");

    const duplicateResult = await invokeConfirmRouteAsync(staffRouteClient, {
      eventId: seededEventId,
      notes: "Delivered twice should fail.",
      rewardTierId: artifacts.successRewardTierId ?? "",
      studentId: seededStudentId,
    });

    if (duplicateResult.status !== 200 || duplicateResult.responseBody.status !== "REWARD_ALREADY_CLAIMED") {
      throw new Error(
        `Expected duplicate reward claim to return REWARD_ALREADY_CLAIMED, got ${duplicateResult.status} ${duplicateResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push(`duplicate-claim:${duplicateResult.responseBody.status}`);

    const lowStampResult = await invokeConfirmRouteAsync(staffRouteClient, {
      eventId: seededEventId,
      notes: "",
      rewardTierId: artifacts.rewardTierIds[1],
      studentId: seededStudentId,
    });

    if (lowStampResult.status !== 200 || lowStampResult.responseBody.status !== "NOT_ENOUGH_STAMPS") {
      throw new Error(
        `Expected low stamp claim to return NOT_ENOUGH_STAMPS, got ${lowStampResult.status} ${lowStampResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push(`low-stamp:${lowStampResult.responseBody.status}`);

    const outOfStockResult = await invokeConfirmRouteAsync(organizerRouteClient, {
      eventId: seededEventId,
      notes: "",
      rewardTierId: artifacts.outOfStockRewardTierId ?? "",
      studentId: seededStudentId,
    });

    if (outOfStockResult.status !== 200 || outOfStockResult.responseBody.status !== "REWARD_OUT_OF_STOCK") {
      throw new Error(
        `Expected out of stock claim to return REWARD_OUT_OF_STOCK, got ${outOfStockResult.status} ${outOfStockResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push(`out-of-stock:${outOfStockResult.responseBody.status}`);

    const studentRouteResult = await invokeConfirmRouteAsync(studentRouteClient, {
      eventId: seededEventId,
      notes: "",
      rewardTierId: artifacts.successRewardTierId ?? "",
      studentId: seededStudentId,
    });

    if (studentRouteResult.status !== 403 || studentRouteResult.responseBody.status !== "CLUB_NOT_ALLOWED") {
      throw new Error(
        `Expected student reward claim route to return 403 CLUB_NOT_ALLOWED, got ${studentRouteResult.status} ${studentRouteResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push("student-route:CLUB_NOT_ALLOWED");

    console.log(outputs.join("|"));
  } catch (error) {
    runError = error instanceof Error ? error : new Error("Unknown club claims smoke error.");
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
