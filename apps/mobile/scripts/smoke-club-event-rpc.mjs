import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const mobileDir = resolve(scriptDir, "..");
const repoRoot = resolve(mobileDir, "../..");

for (const envFile of [resolve(repoRoot, ".env.local"), resolve(mobileDir, ".env.local")]) {
  if (existsSync(envFile)) {
    process.loadEnvFile?.(envFile);
  }
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dockerBinary = process.env.DOCKER_BINARY ?? "/usr/local/bin/docker";
const localDatabaseContainer = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_omaleima";
const seededClubId = "10000000-0000-0000-0000-000000000001";
const organizerEmail = process.env.OMALEIMA_ORGANIZER_SMOKE_EMAIL ?? "organizer@omaleima.test";
const organizerPassword = process.env.OMALEIMA_ORGANIZER_SMOKE_PASSWORD ?? "password123";

if (typeof supabaseUrl !== "string" || supabaseUrl.length === 0) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL for mobile club event smoke.");
}

if (typeof publishableKey !== "string" || publishableKey.length === 0) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY for mobile club event smoke.");
}

const isLocalSupabase = new URL(supabaseUrl).hostname === "127.0.0.1" || new URL(supabaseUrl).hostname === "localhost";

if (!isLocalSupabase && (typeof serviceRoleKey !== "string" || serviceRoleKey.length === 0)) {
  throw new Error("Hosted mobile club event smoke requires SUPABASE_SERVICE_ROLE_KEY for artifact cleanup.");
}

const createSupabaseClient = (key) =>
  createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

const organizerClient = createSupabaseClient(publishableKey);
const serviceClient =
  typeof serviceRoleKey === "string" && serviceRoleKey.length > 0 ? createSupabaseClient(serviceRoleKey) : null;

const createEventTimes = (offsetMinutes) => {
  const startAt = new Date(Date.now() + offsetMinutes * 60_000);
  const endAt = new Date(startAt.getTime() + 2 * 60 * 60_000);
  const joinDeadlineAt = new Date(startAt.getTime() - 60 * 60_000);

  return {
    endAt: endAt.toISOString(),
    joinDeadlineAt: joinDeadlineAt.toISOString(),
    startAt: startAt.toISOString(),
  };
};

const createRules = (label) => ({
  ageLimit: 18,
  dressCode: "overalls",
  smokeLabel: label,
});

const runLocalSql = (sql) => {
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

const cleanupSmokeArtifacts = async (eventId) => {
  if (eventId === null) {
    return;
  }

  if (serviceClient !== null) {
    await serviceClient.from("audit_logs").delete().eq("resource_type", "events").eq("resource_id", eventId);
    await serviceClient.from("events").delete().eq("id", eventId);
    return;
  }

  if (!isLocalSupabase) {
    throw new Error(`Cannot clean hosted smoke event ${eventId} without SUPABASE_SERVICE_ROLE_KEY.`);
  }

  runLocalSql(`
    begin;
    delete from public.audit_logs
    where resource_type = 'events'
      and resource_id = '${eventId}'::uuid;
    delete from public.events
    where id = '${eventId}'::uuid;
    commit;
  `);
};

const assertRpcSuccess = (payload, action) => {
  if (typeof payload !== "object" || payload === null || payload.status !== "SUCCESS") {
    throw new Error(`${action} returned ${typeof payload === "object" && payload !== null ? payload.status : "null"}.`);
  }
};

const main = async () => {
  let eventId = null;
  const suffix = randomUUID().slice(0, 8);
  const initialName = `Mobile Organizer Smoke ${suffix}`;
  const updatedName = `Mobile Organizer Smoke Updated ${suffix}`;

  try {
    const signInResult = await organizerClient.auth.signInWithPassword({
      email: organizerEmail,
      password: organizerPassword,
    });

    if (signInResult.error !== null || signInResult.data.user === null) {
      throw new Error(`Failed to sign in organizer smoke account: ${signInResult.error?.message ?? "missing user"}`);
    }

    const userId = signInResult.data.user.id;
    const initialTimes = createEventTimes(720);
    const createResult = await organizerClient.rpc("create_club_event_atomic", {
      p_city: "Helsinki",
      p_club_id: seededClubId,
      p_country: "Finland",
      p_cover_image_url: "",
      p_created_by: userId,
      p_description: "Mobile organizer event save smoke.",
      p_end_at: initialTimes.endAt,
      p_join_deadline_at: initialTimes.joinDeadlineAt,
      p_max_participants: 80,
      p_minimum_stamps_required: 2,
      p_name: initialName,
      p_rules: createRules("initial"),
      p_start_at: initialTimes.startAt,
      p_visibility: "PUBLIC",
    });

    if (createResult.error !== null) {
      throw new Error(`Mobile organizer create RPC failed: ${createResult.error.message}`);
    }

    assertRpcSuccess(createResult.data, "Mobile organizer create RPC");
    eventId = createResult.data.eventId;

    if (typeof eventId !== "string" || eventId.length === 0) {
      throw new Error("Mobile organizer create RPC did not return an eventId.");
    }

    const updateTimes = createEventTimes(780);
    const updateResult = await organizerClient.rpc("update_club_event_atomic", {
      p_actor_user_id: userId,
      p_city: "Helsinki",
      p_cover_image_staging_path: "",
      p_cover_image_url: "",
      p_description: "Mobile organizer event edit/save smoke updated.",
      p_end_at: updateTimes.endAt,
      p_event_id: eventId,
      p_join_deadline_at: updateTimes.joinDeadlineAt,
      p_max_participants: 96,
      p_minimum_stamps_required: 3,
      p_name: updatedName,
      p_rules: createRules("updated"),
      p_start_at: updateTimes.startAt,
      p_status: "DRAFT",
      p_ticket_url: "",
      p_visibility: "UNLISTED",
    });

    if (updateResult.error !== null) {
      throw new Error(`Mobile organizer update RPC failed: ${updateResult.error.message}`);
    }

    assertRpcSuccess(updateResult.data, "Mobile organizer update RPC");

    const { data: updatedEvent, error: readError } = await organizerClient
      .from("events")
      .select("id,name,status,visibility,max_participants,minimum_stamps_required")
      .eq("id", eventId)
      .maybeSingle();

    if (readError !== null) {
      throw new Error(`Failed to read updated mobile organizer smoke event: ${readError.message}`);
    }

    if (
      updatedEvent === null ||
      updatedEvent.name !== updatedName ||
      updatedEvent.status !== "DRAFT" ||
      updatedEvent.visibility !== "UNLISTED" ||
      updatedEvent.max_participants !== 96 ||
      updatedEvent.minimum_stamps_required !== 3
    ) {
      throw new Error("Mobile organizer event edit/save smoke did not persist the expected event state.");
    }

    console.log("Mobile organizer event edit/save RPC smoke passed.");
  } finally {
    await cleanupSmokeArtifacts(eventId);
  }
};

await main();
