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
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL for oversight smoke script.");
}

if (typeof publishableKey !== "string" || publishableKey.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for oversight smoke script.");
}

type AuditLogRow = {
  action: string;
  id: string;
};

type FraudSignalRow = {
  description: string;
  id: string;
  status: "OPEN" | "REVIEWED" | "DISMISSED" | "CONFIRMED";
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
    throw new Error(`Failed to sign in ${email} for oversight smoke: ${signInResult.error.message}`);
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
    throw new Error(`Failed to sign in ${email} for oversight route smoke: ${signInResult.error.message}`);
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

const seedOversightFixtures = (suffix: string) => {
  const auditAction = `OVERSIGHT_SMOKE_ACTION_${suffix}`;
  const openFraudDescription = `Oversight smoke open fraud ${suffix}`;
  const reviewedFraudDescription = `Oversight smoke reviewed fraud ${suffix}`;
  const futureEventName = `Oversight smoke future event ${suffix}`;
  const endedEventName = `Oversight smoke ended event ${suffix}`;
  const futureEventSlug = `oversight-smoke-future-${suffix.toLowerCase()}`;
  const endedEventSlug = `oversight-smoke-ended-${suffix.toLowerCase()}`;
  const sql = `
    begin;

    insert into public.events (
      id,
      club_id,
      name,
      slug,
      description,
      city,
      country,
      status,
      visibility,
      start_at,
      end_at,
      join_deadline_at,
      created_by,
      max_participants
    ) values (
      gen_random_uuid(),
      '10000000-0000-0000-0000-000000000001',
      '${futureEventName}',
      '${futureEventSlug}',
      'Oversight smoke future event fixture',
      'Helsinki',
      'Finland',
      'PUBLISHED',
      'PUBLIC',
      now() + interval '1 day',
      now() + interval '1 day 3 hours',
      now() + interval '20 hours',
      '00000000-0000-0000-0000-000000000002',
      200
    );

    insert into public.events (
      id,
      club_id,
      name,
      slug,
      description,
      city,
      country,
      status,
      visibility,
      start_at,
      end_at,
      join_deadline_at,
      created_by,
      max_participants
    ) values (
      gen_random_uuid(),
      '10000000-0000-0000-0000-000000000001',
      '${endedEventName}',
      '${endedEventSlug}',
      'Oversight smoke ended event fixture',
      'Espoo',
      'Finland',
      'ACTIVE',
      'PUBLIC',
      now() - interval '3 hours',
      now() - interval '30 minutes',
      now() - interval '4 hours',
      '00000000-0000-0000-0000-000000000002',
      120
    );

    insert into public.audit_logs (
      actor_user_id,
      action,
      resource_type,
      resource_id,
      metadata,
      created_at
    ) values (
      '00000000-0000-0000-0000-000000000001',
      '${auditAction}',
      'EVENT',
      '30000000-0000-0000-0000-000000000001',
      '{"source":"oversight_smoke","suffix":"${suffix}"}'::jsonb,
      now()
    );

    insert into public.fraud_signals (
      event_id,
      business_id,
      scanner_user_id,
      type,
      severity,
      description,
      metadata,
      status,
      created_at
    ) values (
      '30000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000003',
      'RAPID_REPLAY_PATTERN',
      'HIGH',
      '${openFraudDescription}',
      '{"source":"oversight_smoke","suffix":"${suffix}"}'::jsonb,
      'OPEN',
      now()
    );

    insert into public.fraud_signals (
      event_id,
      business_id,
      scanner_user_id,
      type,
      severity,
      description,
      metadata,
      status,
      created_at
    ) values (
      '30000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000003',
      'MANUAL_REVIEW_FOLLOW_UP',
      'LOW',
      '${reviewedFraudDescription}',
      '{"source":"oversight_smoke","suffix":"${suffix}","reviewed":true}'::jsonb,
      'REVIEWED',
      now() + interval '1 minute'
    );

    commit;
  `;

  execFileSync(dockerBinary, ["exec", localDatabaseContainer, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql], {
    stdio: "pipe",
  });

  return {
    auditAction,
    endedEventName,
    futureEventName,
    openFraudDescription,
    reviewedFraudDescription,
  };
};

const assertAdminAuditVisibleAsync = async (client: AuthedClient, auditAction: string): Promise<void> => {
  const { data, error } = await client.supabase
    .from("audit_logs")
    .select("id,action")
    .eq("action", auditAction)
    .returns<AuditLogRow[]>();

  if (error !== null) {
    throw new Error(`Admin audit read failed for ${client.email}: ${error.message}`);
  }

  if (data.length !== 1) {
    throw new Error(`Expected admin to see 1 audit row for ${auditAction}, got ${data.length}.`);
  }
};

const assertOrganizerAuditHiddenAsync = async (client: AuthedClient, auditAction: string): Promise<void> => {
  const { data, error } = await client.supabase
    .from("audit_logs")
    .select("id,action")
    .eq("action", auditAction)
    .returns<AuditLogRow[]>();

  if (error !== null) {
    throw new Error(`Organizer audit read returned an unexpected error for ${client.email}: ${error.message}`);
  }

  if (data.length !== 0) {
    throw new Error(`Expected organizer to see 0 audit rows for ${auditAction}, got ${data.length}.`);
  }
};

const assertAdminFraudVisibleAsync = async (client: AuthedClient, fraudDescription: string): Promise<void> => {
  const { data, error } = await client.supabase
    .from("fraud_signals")
    .select("id,description,status")
    .eq("description", fraudDescription)
    .returns<FraudSignalRow[]>();

  if (error !== null) {
    throw new Error(`Admin fraud read failed for ${client.email}: ${error.message}`);
  }

  if (data.length !== 1) {
    throw new Error(`Expected admin to see 1 fraud row for ${fraudDescription}, got ${data.length}.`);
  }
};

const assertOrganizerFraudVisibleAsync = async (client: AuthedClient, fraudDescription: string): Promise<void> => {
  const { data, error } = await client.supabase
    .from("fraud_signals")
    .select("id,description,status")
    .eq("description", fraudDescription)
    .returns<FraudSignalRow[]>();

  if (error !== null) {
    throw new Error(`Organizer fraud read failed for ${client.email}: ${error.message}`);
  }

  if (data.length !== 1 || data[0]?.status !== "OPEN") {
    throw new Error(`Expected organizer to see 1 OPEN fraud row for ${fraudDescription}, got ${data.length}.`);
  }
};

const assertOversightPageAsync = async (
  client: CookieBackedClient,
  expectedSnippets: string[],
  blockedSnippets: string[]
): Promise<void> => {
  const response = await fetch(`${appBaseUrl}/admin/oversight`, {
    headers: {
      Cookie: client.toCookieHeader(),
    },
    method: "GET",
  });
  const html = await response.text();

  if (!response.ok) {
    throw new Error(`Expected oversight page to return 200, got ${response.status}.`);
  }

  expectedSnippets.forEach((snippet) => {
    if (!html.includes(snippet)) {
      throw new Error(`Expected oversight page to contain ${snippet}.`);
    }
  });

  blockedSnippets.forEach((snippet) => {
    if (html.includes(snippet)) {
      throw new Error(`Expected oversight page to hide ${snippet}.`);
    }
  });
};

const assertOrganizerOversightRedirectAsync = async (client: CookieBackedClient): Promise<void> => {
  const response = await fetch(`${appBaseUrl}/admin/oversight`, {
    headers: {
      Cookie: client.toCookieHeader(),
    },
    method: "GET",
    redirect: "manual",
  });

  if (response.status !== 307) {
    throw new Error(`Expected organizer oversight request to return 307, got ${response.status}.`);
  }

  const location = response.headers.get("location");

  if (location !== "/club") {
    throw new Error(`Expected organizer oversight redirect to /club, got ${location}.`);
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
  const adminRouteClient = await createCookieBackedClientAsync("admin@omaleima.test", "password123");
  const organizerRouteClient = await createCookieBackedClientAsync("organizer@omaleima.test", "password123");
  const { auditAction, endedEventName, futureEventName, openFraudDescription, reviewedFraudDescription } = seedOversightFixtures(suffix);
  const outputs: string[] = [];

  await assertAdminAuditVisibleAsync(adminDataClient, auditAction);
  outputs.push("admin-audit-read:1");

  await assertOrganizerAuditHiddenAsync(organizerDataClient, auditAction);
  outputs.push("organizer-audit-read:0");

  await assertAdminFraudVisibleAsync(adminDataClient, openFraudDescription);
  outputs.push("admin-fraud-read:1");

  await assertOrganizerFraudVisibleAsync(organizerDataClient, openFraudDescription);
  outputs.push("organizer-fraud-read:1");

  await assertOversightPageAsync(adminRouteClient, [
    "Platform oversight",
    "OmaLeima Test Guild",
    "OmaLeima Test Appro",
    auditAction,
    futureEventName,
    openFraudDescription,
  ], [
    endedEventName,
    reviewedFraudDescription,
  ]);
  outputs.push("admin-oversight-route:ok");

  await assertOrganizerOversightRedirectAsync(organizerRouteClient);
  outputs.push("organizer-oversight-redirect:/club");

  await signOutAsync(adminDataClient);
  await signOutAsync(organizerDataClient);
  await signOutAsync(adminRouteClient);
  await signOutAsync(organizerRouteClient);

  console.log(outputs.join("|"));
};

void run();
