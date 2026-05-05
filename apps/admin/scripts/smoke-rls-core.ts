import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

process.loadEnvFile?.(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const dockerBinary = process.env.DOCKER_BINARY ?? "/usr/local/bin/docker";
const localDatabaseContainer = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_omaleima";

const seededAdminEmail = "admin@omaleima.test";
const seededOrganizerEmail = "organizer@omaleima.test";
const seededStudentEmail = "student@omaleima.test";
const seededPassword = "password123";

const seededAdminProfileId = "00000000-0000-0000-0000-000000000001";
const seededOrganizerProfileId = "00000000-0000-0000-0000-000000000002";
const seededScannerProfileId = "00000000-0000-0000-0000-000000000003";
const seededStudentProfileId = "00000000-0000-0000-0000-000000000004";
const seededClubId = "10000000-0000-0000-0000-000000000001";
const seededBusinessId = "20000000-0000-0000-0000-000000000001";

if (typeof supabaseUrl !== "string" || supabaseUrl.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL for RLS core smoke script.");
}

if (typeof publishableKey !== "string" || publishableKey.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for RLS core smoke script.");
}

type AuthedClient = {
  email: string;
  supabase: ReturnType<typeof createStatelessClient>;
};

type AuditLogRow = {
  action: string;
  id: string;
  resource_type: string;
};

type StampRow = {
  qr_jti: string;
  student_id: string;
  validation_status: "MANUAL_REVIEW" | "REVOKED" | "VALID";
};

type SeededFixtureSet = {
  auditLogId: string;
  fixtureEventId: string;
  fixtureInsertAttemptEventId: string;
  fixtureRewardTierId: string;
  fixtureStudentProfileId: string;
  insertAttemptQti: string;
  otherStudentQti: string;
  ownStudentQti: string;
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
    throw new Error(`Failed to sign in ${email} for RLS core smoke: ${signInResult.error.message}`);
  }

  return {
    email,
    supabase,
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

const seedFixturesAsync = async (suffix: string): Promise<SeededFixtureSet> => {
  const fixtureStudentProfileId = randomUUID();
  const fixtureEventId = randomUUID();
  const fixtureInsertAttemptEventId = randomUUID();
  const fixtureEventVenueId = randomUUID();
  const fixtureRewardTierId = randomUUID();
  const insertAttemptQti = `rls-smoke-insert-${suffix.toLowerCase()}`;
  const ownStudentQti = `rls-smoke-own-${suffix.toLowerCase()}`;
  const otherStudentQti = `rls-smoke-other-${suffix.toLowerCase()}`;
  const auditLogId = randomUUID();
  const fixtureStudentEmail = `rls-student-${suffix.toLowerCase()}@example.test`;
  const fixtureEventSlug = `rls-smoke-event-${suffix.toLowerCase()}`;
  const fixtureInsertAttemptEventSlug = `rls-smoke-insert-event-${suffix.toLowerCase()}`;
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
      '${fixtureStudentProfileId}',
      'authenticated',
      'authenticated',
      '${fixtureStudentEmail}',
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
      '{"display_name":"RLS Fixture Student ${suffix}"}'::jsonb,
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
      '${fixtureStudentProfileId}',
      '${fixtureStudentEmail}',
      'RLS Fixture Student ${suffix}',
      'STUDENT',
      'ACTIVE'
    )
    on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        primary_role = excluded.primary_role,
        status = excluded.status;

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
      '${fixtureEventId}',
      '${seededClubId}',
      'RLS Smoke Event ${suffix}',
      '${fixtureEventSlug}',
      'Fixture event for core RLS smoke coverage.',
      'Helsinki',
      now() - interval '30 minutes',
      now() + interval '2 hours',
      now() - interval '90 minutes',
      'ACTIVE',
      'PUBLIC',
      1,
      '${seededOrganizerProfileId}'
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
      '${fixtureInsertAttemptEventId}',
      '${seededClubId}',
      'RLS Smoke Insert Event ${suffix}',
      '${fixtureInsertAttemptEventSlug}',
      'Fixture event for direct stamp insert blocking.',
      'Helsinki',
      now() - interval '20 minutes',
      now() + interval '2 hours',
      now() - interval '80 minutes',
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
    ) values (
      '${fixtureEventVenueId}',
      '${fixtureEventId}',
      '${seededBusinessId}',
      'JOINED',
      '${seededScannerProfileId}',
      now() - interval '45 minutes',
      1,
      'RLS Smoke Stamp'
    );

    insert into public.event_registrations (
      event_id,
      student_id
    ) values
      ('${fixtureEventId}', '${seededStudentProfileId}'),
      ('${fixtureEventId}', '${fixtureStudentProfileId}'),
      ('${fixtureInsertAttemptEventId}', '${seededStudentProfileId}');

    insert into public.reward_tiers (
      id,
      event_id,
      title,
      description,
      required_stamp_count,
      reward_type,
      inventory_total
    ) values (
      '${fixtureRewardTierId}',
      '${fixtureEventId}',
      'RLS Smoke Reward ${suffix}',
      'Fixture reward for direct reward_claim insert blocking.',
      1,
      'PATCH',
      5
    );

    insert into public.qr_token_uses (
      jti,
      event_id,
      student_id,
      business_id,
      scanner_user_id,
      used_at
    ) values
      (
        '${insertAttemptQti}',
        '${fixtureInsertAttemptEventId}',
        '${seededStudentProfileId}',
        '${seededBusinessId}',
        '${seededScannerProfileId}',
        now() - interval '6 minutes'
      ),
      (
        '${ownStudentQti}',
        '${fixtureEventId}',
        '${seededStudentProfileId}',
        '${seededBusinessId}',
        '${seededScannerProfileId}',
        now() - interval '5 minutes'
      ),
      (
        '${otherStudentQti}',
        '${fixtureEventId}',
        '${fixtureStudentProfileId}',
        '${seededBusinessId}',
        '${seededScannerProfileId}',
        now() - interval '4 minutes'
      );

    insert into public.stamps (
      event_id,
      student_id,
      business_id,
      event_venue_id,
      scanner_user_id,
      qr_jti,
      validation_status
    ) values
      (
        '${fixtureEventId}',
        '${seededStudentProfileId}',
        '${seededBusinessId}',
        '${fixtureEventVenueId}',
        '${seededScannerProfileId}',
        '${ownStudentQti}',
        'VALID'
      ),
      (
        '${fixtureEventId}',
        '${fixtureStudentProfileId}',
        '${seededBusinessId}',
        '${fixtureEventVenueId}',
        '${seededScannerProfileId}',
        '${otherStudentQti}',
        'VALID'
      );

    insert into public.audit_logs (
      id,
      actor_user_id,
      action,
      resource_type,
      resource_id,
      metadata
    ) values (
      '${auditLogId}',
      '${seededAdminProfileId}',
      'RLS_SMOKE_AUDIT',
      'event',
      '${fixtureEventId}',
      '{"scope":"phase6-core"}'::jsonb
    );

    commit;
  `;

  await runSqlAsync(sql);

  return {
    auditLogId,
    fixtureEventId,
    fixtureInsertAttemptEventId,
    fixtureRewardTierId,
    fixtureStudentProfileId,
    insertAttemptQti,
    otherStudentQti,
    ownStudentQti,
  };
};

const cleanupFixturesAsync = async (fixtures: SeededFixtureSet): Promise<void> => {
  const sql = `
    begin;

    delete from public.audit_logs
    where id = '${fixtures.auditLogId}'::uuid;

    delete from public.reward_claims
    where event_id = '${fixtures.fixtureEventId}'::uuid;

    delete from public.stamps
    where event_id in ('${fixtures.fixtureEventId}'::uuid, '${fixtures.fixtureInsertAttemptEventId}'::uuid);

    delete from public.qr_token_uses
    where event_id in ('${fixtures.fixtureEventId}'::uuid, '${fixtures.fixtureInsertAttemptEventId}'::uuid);

    delete from public.event_registrations
    where event_id in ('${fixtures.fixtureEventId}'::uuid, '${fixtures.fixtureInsertAttemptEventId}'::uuid);

    delete from public.reward_tiers
    where event_id = '${fixtures.fixtureEventId}'::uuid;

    delete from public.event_venues
    where event_id = '${fixtures.fixtureEventId}'::uuid;

    delete from public.events
    where id in ('${fixtures.fixtureEventId}'::uuid, '${fixtures.fixtureInsertAttemptEventId}'::uuid);

    delete from public.profiles
    where id = '${fixtures.fixtureStudentProfileId}'::uuid;

    delete from auth.users
    where id = '${fixtures.fixtureStudentProfileId}'::uuid;

    commit;
  `;

  await runSqlAsync(sql);
};

const assertInsertBlockedAsync = async (
  label: string,
  promise: PromiseLike<{ error: { message: string } | null }>
): Promise<void> => {
  const result = await promise;

  if (result.error === null) {
    throw new Error(`Expected ${label} to be blocked by RLS.`);
  }
};

const run = async (): Promise<void> => {
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const outputs: string[] = [];
  let fixtures: SeededFixtureSet | null = null;
  let runError: Error | null = null;

  const adminClient = await createAuthedClientAsync(seededAdminEmail, seededPassword);
  const organizerClient = await createAuthedClientAsync(seededOrganizerEmail, seededPassword);
  const studentClient = await createAuthedClientAsync(seededStudentEmail, seededPassword);

  try {
    fixtures = await seedFixturesAsync(suffix);

    await assertInsertBlockedAsync(
      "student direct stamp insert",
      studentClient.supabase.from("stamps").insert({
        business_id: seededBusinessId,
        event_id: fixtures.fixtureInsertAttemptEventId,
        qr_jti: fixtures.insertAttemptQti,
        scanner_user_id: seededScannerProfileId,
        student_id: seededStudentProfileId,
      })
    );
    outputs.push("student-direct-stamp-insert:rls-blocked");

    const ownStampResult = await studentClient.supabase
      .from("stamps")
      .select("qr_jti,student_id,validation_status")
      .eq("qr_jti", fixtures.ownStudentQti)
      .returns<StampRow[]>();

    if (ownStampResult.error !== null) {
      throw new Error(`Failed to read own student stamp during RLS smoke: ${ownStampResult.error.message}`);
    }

    if (ownStampResult.data.length !== 1 || ownStampResult.data[0]?.student_id !== seededStudentProfileId) {
      throw new Error(`Expected seeded student to read exactly 1 own stamp row, got ${ownStampResult.data.length}.`);
    }

    outputs.push("student-own-stamp-read:ok");

    const otherStampResult = await studentClient.supabase
      .from("stamps")
      .select("qr_jti,student_id,validation_status")
      .eq("qr_jti", fixtures.otherStudentQti)
      .returns<StampRow[]>();

    if (otherStampResult.error !== null) {
      throw new Error(`Failed to query hidden student stamp during RLS smoke: ${otherStampResult.error.message}`);
    }

    if (otherStampResult.data.length !== 0) {
      throw new Error(`Expected seeded student to read 0 foreign stamp rows, got ${otherStampResult.data.length}.`);
    }

    outputs.push("student-foreign-stamp-read:hidden");

    await assertInsertBlockedAsync(
      "student direct reward claim insert",
      studentClient.supabase.from("reward_claims").insert({
        claimed_by: seededStudentProfileId,
        event_id: fixtures.fixtureEventId,
        notes: "RLS smoke should block direct reward claims.",
        reward_tier_id: fixtures.fixtureRewardTierId,
        student_id: seededStudentProfileId,
      })
    );
    outputs.push("student-direct-reward-claim-insert:rls-blocked");

    const organizerAuditResult = await organizerClient.supabase
      .from("audit_logs")
      .select("id,action,resource_type")
      .eq("id", fixtures.auditLogId)
      .returns<AuditLogRow[]>();

    if (organizerAuditResult.error !== null) {
      throw new Error(`Failed to query audit logs as organizer during RLS smoke: ${organizerAuditResult.error.message}`);
    }

    if (organizerAuditResult.data.length !== 0) {
      throw new Error(`Expected organizer to read 0 audit log rows, got ${organizerAuditResult.data.length}.`);
    }

    outputs.push("organizer-audit-log-read:hidden");

    const adminAuditResult = await adminClient.supabase
      .from("audit_logs")
      .select("id,action,resource_type")
      .eq("id", fixtures.auditLogId)
      .returns<AuditLogRow[]>();

    if (adminAuditResult.error !== null) {
      throw new Error(`Failed to query audit logs as admin during RLS smoke: ${adminAuditResult.error.message}`);
    }

    if (adminAuditResult.data.length !== 1 || adminAuditResult.data[0]?.action !== "RLS_SMOKE_AUDIT") {
      throw new Error(`Expected admin to read exactly 1 fixture audit log row, got ${adminAuditResult.data.length}.`);
    }

    outputs.push("admin-audit-log-read:ok");

    console.log(outputs.join("|"));
  } catch (error) {
    runError = error instanceof Error ? error : new Error("Unknown RLS core smoke error.");
    throw runError;
  } finally {
    const signOutResults = await Promise.all([
      adminClient.supabase.auth.signOut(),
      organizerClient.supabase.auth.signOut(),
      studentClient.supabase.auth.signOut(),
    ]);
    const signOutError = signOutResults.find((signOutResult) => signOutResult.error !== null)?.error ?? null;

    try {
      if (fixtures !== null) {
        await cleanupFixturesAsync(fixtures);
      }
    } catch (cleanupError) {
      if (runError === null) {
        throw cleanupError;
      }

      console.error(cleanupError);
    }

    if (signOutError !== null) {
      const failedClientIndex = signOutResults.findIndex((signOutResult) => signOutResult.error !== null);
      const failedClientLabel = [seededAdminEmail, seededOrganizerEmail, seededStudentEmail][failedClientIndex] ?? "unknown";

      try {
        if (runError === null) {
          throw new Error(`Failed to sign out ${failedClientLabel} after RLS core smoke: ${signOutError.message}`);
        }
      } catch (signOutFailure) {
        console.error(signOutFailure);
      }
    }
  }
};

void run();
