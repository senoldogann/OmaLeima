import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import {
  createAuthedClientAsync,
  getAccessTokenAsync,
  invokeFunctionAsync,
  readSqlTextAsync,
  runSqlAsync,
  seededClubId,
  seededOrganizerProfileId,
  seededPassword,
  seededScannerEmail,
  seededScannerProfileId,
  seededStudentEmail,
  seededStudentProfileId,
} from "./_shared/function-smoke";

type PushRequestMessage = {
  body?: string;
  data?: {
    eventId?: string;
    rewardTierIds?: string[];
    type?: string;
    unlockedRewardTiers?: Array<{
      requiredStampCount?: number;
      rewardTierId?: string;
      title?: string;
    }>;
  };
  title?: string;
  to?: string;
};

type RewardUnlockFixture = {
  eventId: string;
  firstBusinessId: string;
  firstScannerDeviceId: string;
  firstEventVenueId: string;
  secondBusinessId: string;
  secondScannerDeviceId: string;
  secondEventVenueId: string;
  thirdBusinessId: string;
  thirdScannerDeviceId: string;
  thirdEventVenueId: string;
  firstRewardTierId: string;
  secondRewardTierId: string;
  soldOutRewardTierId: string;
  thirdRewardTierId: string;
  studentExpoToken: string;
};

const mockPushPort = 8789;
const backgroundSettleTimeoutMs = 8000;
const backgroundSettlePollMs = 200;
const stackReadinessTimeoutMs = 15000;
const stackReadinessPollMs = 500;

const sleepAsync = async (durationMs: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, durationMs));
};

const retryAsync = async <T>(callback: () => Promise<T>, timeoutMs: number, pollMs: number, errorMessage: string): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  let lastError: Error | null = null;

  while (Date.now() < deadline) {
    try {
      return await callback();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await sleepAsync(pollMs);
    }
  }

  throw new Error(`${errorMessage}: ${lastError?.message ?? "unknown error"}`);
};

const waitForAsync = async (callback: () => Promise<boolean>, errorMessage: string): Promise<void> => {
  const deadline = Date.now() + backgroundSettleTimeoutMs;

  while (Date.now() < deadline) {
    if (await callback()) {
      return;
    }

    await sleepAsync(backgroundSettlePollMs);
  }

  throw new Error(errorMessage);
};

const waitForLocalStackReadinessAsync = async (): Promise<void> => {
  await retryAsync(
    async () => {
      const [authResponse, restResponse] = await Promise.all([
        fetch("http://127.0.0.1:54321/auth/v1/health"),
        fetch("http://127.0.0.1:54321/rest/v1/"),
      ]);

      if (!authResponse.ok || !restResponse.ok) {
        throw new Error(`auth=${authResponse.status} rest=${restResponse.status}`);
      }

      return undefined;
    },
    stackReadinessTimeoutMs,
    stackReadinessPollMs,
    "Local Supabase HTTP services did not become ready"
  );

  await retryAsync(
    async () => {
      await runSqlAsync("select 1;");
      return undefined;
    },
    stackReadinessTimeoutMs,
    stackReadinessPollMs,
    "Local Supabase database did not become ready"
  );
};

const runSqlWithRetryAsync = async (sql: string): Promise<void> => {
  await retryAsync(
    async () => {
      await runSqlAsync(sql);
      return undefined;
    },
    stackReadinessTimeoutMs,
    stackReadinessPollMs,
    "SQL command did not succeed before timeout"
  );
};

const readSqlTextWithRetryAsync = async (sql: string): Promise<string> =>
  await retryAsync(
    async () => await readSqlTextAsync(sql),
    stackReadinessTimeoutMs,
    stackReadinessPollMs,
    "SQL text query did not succeed before timeout"
  );

const createPushMockServer = () => {
  const receivedBatches: PushRequestMessage[][] = [];
  let isStarted = false;
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    if (request.method !== "POST") {
      response.statusCode = 405;
      response.end();
      return;
    }

    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    request.on("end", () => {
      const rawBody = Buffer.concat(chunks).toString("utf8");
      const parsedBody = JSON.parse(rawBody) as unknown;
      const messages = Array.isArray(parsedBody) ? parsedBody : [parsedBody];

      receivedBatches.push(messages as PushRequestMessage[]);

      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          data: messages.map((_: PushRequestMessage, index: number) => ({
            id: `reward-unlocked-ticket-${receivedBatches.length}-${index + 1}`,
            status: "ok",
          })),
        })
      );
    });
  });

  const startAsync = async (): Promise<void> =>
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(mockPushPort, "0.0.0.0", () => {
        server.off("error", reject);
        isStarted = true;
        resolve();
      });
    });

  const stopAsync = async (): Promise<void> => {
    if (!isStarted) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => {
        if (typeof error === "undefined") {
          isStarted = false;
          resolve();
          return;
        }

        reject(error);
      });
    });
  };

  return {
    getReceivedBatches: (): PushRequestMessage[][] => receivedBatches,
    startAsync,
    stopAsync,
  };
};

const seedRewardUnlockFixtureAsync = async (suffix: string): Promise<RewardUnlockFixture> => {
  const eventId = randomUUID();
  const firstBusinessId = randomUUID();
  const firstEventVenueId = randomUUID();
  const firstScannerDeviceId = randomUUID();
  const secondBusinessId = randomUUID();
  const secondEventVenueId = randomUUID();
  const secondScannerDeviceId = randomUUID();
  const thirdBusinessId = randomUUID();
  const thirdEventVenueId = randomUUID();
  const thirdScannerDeviceId = randomUUID();
  const firstRewardTierId = randomUUID();
  const secondRewardTierId = randomUUID();
  const soldOutRewardTierId = randomUUID();
  const thirdRewardTierId = randomUUID();
  const studentExpoToken = `ExponentPushToken[reward-unlocked-${suffix.toLowerCase()}]`;
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
    ) values
      (
        '${firstBusinessId}',
        'Reward Unlock Venue A ${suffix}',
        'reward-unlock-venue-a-${suffix.toLowerCase()}',
        'reward-unlock-a-${suffix.toLowerCase()}@example.test',
        'A Street 1',
        'Helsinki',
        'Finland',
        'ACTIVE'
      ),
      (
        '${secondBusinessId}',
        'Reward Unlock Venue B ${suffix}',
        'reward-unlock-venue-b-${suffix.toLowerCase()}',
        'reward-unlock-b-${suffix.toLowerCase()}@example.test',
        'B Street 2',
        'Helsinki',
        'Finland',
        'ACTIVE'
      ),
      (
        '${thirdBusinessId}',
        'Reward Unlock Venue C ${suffix}',
        'reward-unlock-venue-c-${suffix.toLowerCase()}',
        'reward-unlock-c-${suffix.toLowerCase()}@example.test',
        'C Street 3',
        'Helsinki',
        'Finland',
        'ACTIVE'
      );

    insert into public.business_staff (
      id,
      business_id,
      user_id,
      role,
      status
    ) values
      (
        '${randomUUID()}',
        '${firstBusinessId}',
        '${seededScannerProfileId}',
        'SCANNER',
        'ACTIVE'
      ),
      (
        '${randomUUID()}',
        '${secondBusinessId}',
        '${seededScannerProfileId}',
        'SCANNER',
        'ACTIVE'
      ),
      (
        '${randomUUID()}',
        '${thirdBusinessId}',
        '${seededScannerProfileId}',
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
    ) values
      (
        '${firstScannerDeviceId}',
        '${firstBusinessId}',
        'reward-unlock-device-a-${suffix.toLowerCase()}',
        'Reward Unlock Scanner A ${suffix}',
        'WEB',
        'ACTIVE',
        '${seededScannerProfileId}'
      ),
      (
        '${secondScannerDeviceId}',
        '${secondBusinessId}',
        'reward-unlock-device-b-${suffix.toLowerCase()}',
        'Reward Unlock Scanner B ${suffix}',
        'WEB',
        'ACTIVE',
        '${seededScannerProfileId}'
      ),
      (
        '${thirdScannerDeviceId}',
        '${thirdBusinessId}',
        'reward-unlock-device-c-${suffix.toLowerCase()}',
        'Reward Unlock Scanner C ${suffix}',
        'WEB',
        'ACTIVE',
        '${seededScannerProfileId}'
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
      'Reward Unlock Event ${suffix}',
      'reward-unlock-event-${suffix.toLowerCase()}',
      'Fixture event for reward unlocked push smoke.',
      'Helsinki',
      now() - interval '20 minutes',
      now() + interval '2 hours',
      now() - interval '90 minutes',
      'ACTIVE',
      'PUBLIC',
      3,
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
      (
        '${firstEventVenueId}',
        '${eventId}',
        '${firstBusinessId}',
        'JOINED',
        '${seededScannerProfileId}',
        now() - interval '80 minutes',
        1,
        'Unlock Stamp 1'
      ),
      (
        '${secondEventVenueId}',
        '${eventId}',
        '${secondBusinessId}',
        'JOINED',
        '${seededScannerProfileId}',
        now() - interval '79 minutes',
        2,
        'Unlock Stamp 2'
      ),
      (
        '${thirdEventVenueId}',
        '${eventId}',
        '${thirdBusinessId}',
        'JOINED',
        '${seededScannerProfileId}',
        now() - interval '78 minutes',
        3,
        'Unlock Stamp 3'
      );

    insert into public.event_registrations (
      event_id,
      student_id
    ) values (
      '${eventId}',
      '${seededStudentProfileId}'
    );

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
        '${firstRewardTierId}',
        '${eventId}',
        'First Reward ${suffix}',
        'Unlocks on first scan.',
        1,
        'PATCH',
        50,
        0,
        'Claim at the desk.',
        'ACTIVE'
      ),
      (
        '${secondRewardTierId}',
        '${eventId}',
        'Second Reward ${suffix}',
        'Unlocks on second scan.',
        2,
        'PRODUCT',
        25,
        0,
        'Claim at the desk.',
        'ACTIVE'
      ),
      (
        '${soldOutRewardTierId}',
        '${eventId}',
        'Sold Out Reward ${suffix}',
        'Should never send because it is already out of stock.',
        1,
        'COUPON',
        0,
        0,
        'Unavailable.',
        'ACTIVE'
      ),
      (
        '${thirdRewardTierId}',
        '${eventId}',
        'Third Reward ${suffix}',
        'Unlocks on third scan and is used for failed delivery persistence.',
        3,
        'OTHER',
        10,
        0,
        'Claim at the desk.',
        'ACTIVE'
      );

    insert into public.device_tokens (
      user_id,
      expo_push_token,
      platform,
      device_id,
      enabled,
      last_seen_at
    ) values (
      '${seededStudentProfileId}',
      '${studentExpoToken}',
      'IOS',
      'reward-unlocked-smoke-device-${suffix.toLowerCase()}',
      true,
      now()
    );

    commit;
  `;

  await runSqlWithRetryAsync(sql);

  return {
    eventId,
    firstBusinessId,
    firstScannerDeviceId,
    firstEventVenueId,
    secondBusinessId,
    secondScannerDeviceId,
    secondEventVenueId,
    thirdBusinessId,
    thirdScannerDeviceId,
    thirdEventVenueId,
    firstRewardTierId,
    secondRewardTierId,
    soldOutRewardTierId,
    thirdRewardTierId,
    studentExpoToken,
  };
};

const cleanupRewardUnlockFixtureAsync = async (fixture: RewardUnlockFixture): Promise<void> => {
  const sql = `
    begin;

    delete from public.notifications
    where event_id = '${fixture.eventId}'::uuid
      and type = 'REWARD_UNLOCKED';

    delete from public.audit_logs
    where action = 'STAMP_CREATED'
      and metadata->>'eventId' = '${fixture.eventId}';

    delete from public.stamps
    where event_id = '${fixture.eventId}'::uuid;

    delete from public.qr_token_uses
    where event_id = '${fixture.eventId}'::uuid;

    delete from public.reward_claims
    where event_id = '${fixture.eventId}'::uuid;

    delete from public.reward_tiers
    where event_id = '${fixture.eventId}'::uuid;

    delete from public.device_tokens
    where expo_push_token = '${fixture.studentExpoToken}';

    delete from public.event_registrations
    where event_id = '${fixture.eventId}'::uuid;

    delete from public.event_venues
    where event_id = '${fixture.eventId}'::uuid;

    delete from public.business_scanner_devices
    where id in ('${fixture.firstScannerDeviceId}'::uuid, '${fixture.secondScannerDeviceId}'::uuid, '${fixture.thirdScannerDeviceId}'::uuid);

    delete from public.events
    where id = '${fixture.eventId}'::uuid;

    delete from public.business_staff
    where business_id in ('${fixture.firstBusinessId}'::uuid, '${fixture.secondBusinessId}'::uuid, '${fixture.thirdBusinessId}'::uuid)
      and user_id = '${seededScannerProfileId}'::uuid;

    delete from public.businesses
    where id in ('${fixture.firstBusinessId}'::uuid, '${fixture.secondBusinessId}'::uuid, '${fixture.thirdBusinessId}'::uuid);

    commit;
  `;

  await runSqlWithRetryAsync(sql);
};

const readRewardUnlockNotificationsAsync = async (eventId: string): Promise<Array<{ payload: { rewardTierIds?: string[] }; status: string }>> => {
  const rawValue = await readSqlTextWithRetryAsync(`
    select coalesce(
      json_agg(
        json_build_object(
          'status', status,
          'payload', payload
        )
        order by created_at asc
      )::text,
      '[]'
    )
    from public.notifications
    where event_id = '${eventId}'::uuid
      and type = 'REWARD_UNLOCKED';
  `);

  return JSON.parse(rawValue) as Array<{ payload: { rewardTierIds?: string[] }; status: string }>;
};

const run = async (): Promise<void> => {
  const outputs: string[] = [];
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const pushMockServer = createPushMockServer();
  let studentClient: Awaited<ReturnType<typeof createAuthedClientAsync>> | null = null;
  let scannerClient: Awaited<ReturnType<typeof createAuthedClientAsync>> | null = null;
  let fixture: RewardUnlockFixture | null = null;
  let runError: Error | null = null;

  try {
    await waitForLocalStackReadinessAsync();
    await pushMockServer.startAsync();
    studentClient = await createAuthedClientAsync(seededStudentEmail, seededPassword);
    scannerClient = await createAuthedClientAsync(seededScannerEmail, seededPassword);
    fixture = await seedRewardUnlockFixtureAsync(suffix);
    const fixtureEventId = fixture.eventId;

    const studentAccessToken = await getAccessTokenAsync(studentClient);
    const scannerAccessToken = await getAccessTokenAsync(scannerClient);

    const generateResult = await invokeFunctionAsync("generate-qr-token", studentAccessToken, {
      eventId: fixture.eventId,
    });
    const firstQrToken = generateResult.responseBody.qrPayload?.token;

    if (generateResult.status !== 200 || typeof firstQrToken !== "string") {
      throw new Error(
        `Expected reward unlock generate-qr-token to return 200, got ${generateResult.status} ${generateResult.responseBody.status ?? "null"}.`
      );
    }

    const firstScan = await invokeFunctionAsync("scan-qr", scannerAccessToken, {
      businessId: fixture.firstBusinessId,
      eventId: fixture.eventId,
      eventVenueId: fixture.firstEventVenueId,
      qrToken: firstQrToken,
      scannerDeviceId: fixture.firstScannerDeviceId,
    });

    if (firstScan.status !== 200 || firstScan.responseBody.status !== "SUCCESS") {
      throw new Error(
        `Expected first reward unlock scan to return 200 SUCCESS, got ${firstScan.status} ${firstScan.responseBody.status ?? "null"}.`
      );
    }

    if (firstScan.responseBody.rewardUnlockPush?.status !== "QUEUED") {
      throw new Error(
        `Expected first reward unlock push status QUEUED, got ${firstScan.responseBody.rewardUnlockPush?.status ?? "null"}.`
      );
    }

    const firstUnlockedRewardIds = firstScan.responseBody.unlockedRewardTiers?.map((rewardTier) => rewardTier.rewardTierId) ?? [];

    if (firstUnlockedRewardIds.length !== 1 || firstUnlockedRewardIds[0] !== fixture.firstRewardTierId) {
      throw new Error(
        `Expected first scan to unlock only the first reward tier, got ${JSON.stringify(firstUnlockedRewardIds)}.`
      );
    }

    outputs.push("first-scan:unlock-first-tier");

    const secondGenerate = await invokeFunctionAsync("generate-qr-token", studentAccessToken, {
      eventId: fixture.eventId,
    });
    const secondQrToken = secondGenerate.responseBody.qrPayload?.token;

    if (secondGenerate.status !== 200 || typeof secondQrToken !== "string") {
      throw new Error(
        `Expected second generate-qr-token to return 200, got ${secondGenerate.status} ${secondGenerate.responseBody.status ?? "null"}.`
      );
    }

    const secondScan = await invokeFunctionAsync("scan-qr", scannerAccessToken, {
      businessId: fixture.secondBusinessId,
      eventId: fixture.eventId,
      eventVenueId: fixture.secondEventVenueId,
      qrToken: secondQrToken,
      scannerDeviceId: fixture.secondScannerDeviceId,
    });

    if (secondScan.status !== 200 || secondScan.responseBody.status !== "SUCCESS") {
      throw new Error(
        `Expected second reward unlock scan to return 200 SUCCESS, got ${secondScan.status} ${secondScan.responseBody.status ?? "null"}.`
      );
    }

    if (secondScan.responseBody.rewardUnlockPush?.status !== "QUEUED") {
      throw new Error(
        `Expected second reward unlock push status QUEUED, got ${secondScan.responseBody.rewardUnlockPush?.status ?? "null"}.`
      );
    }

    const secondUnlockedRewardIds = secondScan.responseBody.unlockedRewardTiers?.map((rewardTier) => rewardTier.rewardTierId) ?? [];

    if (secondUnlockedRewardIds.length !== 1 || secondUnlockedRewardIds[0] !== fixture.secondRewardTierId) {
      throw new Error(
        `Expected second scan to unlock only the second reward tier, got ${JSON.stringify(secondUnlockedRewardIds)}.`
      );
    }

    outputs.push("second-scan:unlock-second-tier");

    await waitForAsync(
      async () => pushMockServer.getReceivedBatches().length === 2,
      "Expected two reward unlock push batches before timeout."
    );

    await waitForAsync(
      async () => (await readRewardUnlockNotificationsAsync(fixtureEventId)).length === 2,
      "Expected two REWARD_UNLOCKED notifications before timeout."
    );

    const pushBatches = pushMockServer.getReceivedBatches();

    if (pushBatches.length !== 2) {
      throw new Error(`Expected exactly two reward unlock push batches, got ${pushBatches.length}.`);
    }

    const firstBatchRewardIds = pushBatches[0]?.[0]?.data?.rewardTierIds ?? [];
    const secondBatchRewardIds = pushBatches[1]?.[0]?.data?.rewardTierIds ?? [];

    if (firstBatchRewardIds.length !== 1 || firstBatchRewardIds[0] !== fixture.firstRewardTierId) {
      throw new Error(`Expected first push batch to target only the first tier, got ${JSON.stringify(firstBatchRewardIds)}.`);
    }

    if (secondBatchRewardIds.length !== 1 || secondBatchRewardIds[0] !== fixture.secondRewardTierId) {
      throw new Error(`Expected second push batch to target only the second tier, got ${JSON.stringify(secondBatchRewardIds)}.`);
    }

    outputs.push("push-batches:deduped");

    const notifications = await readRewardUnlockNotificationsAsync(fixtureEventId);

    if (notifications.length !== 2) {
      throw new Error(`Expected exactly two REWARD_UNLOCKED notifications, got ${notifications.length}.`);
    }

    const firstNotificationRewardIds = notifications[0]?.payload.rewardTierIds ?? [];
    const secondNotificationRewardIds = notifications[1]?.payload.rewardTierIds ?? [];

    if (
      notifications.some((notification) => notification.status !== "SENT") ||
      firstNotificationRewardIds[0] !== fixture.firstRewardTierId ||
      secondNotificationRewardIds[0] !== fixture.secondRewardTierId
    ) {
      throw new Error(`Expected two SENT notifications with ordered reward tier ids, got ${JSON.stringify(notifications)}.`);
    }

    outputs.push("notifications:SENT");

    await pushMockServer.stopAsync();

    const thirdGenerate = await invokeFunctionAsync("generate-qr-token", studentAccessToken, {
      eventId: fixture.eventId,
    });
    const thirdQrToken = thirdGenerate.responseBody.qrPayload?.token;

    if (thirdGenerate.status !== 200 || typeof thirdQrToken !== "string") {
      throw new Error(
        `Expected third generate-qr-token to return 200, got ${thirdGenerate.status} ${thirdGenerate.responseBody.status ?? "null"}.`
      );
    }

    const thirdScan = await invokeFunctionAsync("scan-qr", scannerAccessToken, {
      businessId: fixture.thirdBusinessId,
      eventId: fixture.eventId,
      eventVenueId: fixture.thirdEventVenueId,
      qrToken: thirdQrToken,
      scannerDeviceId: fixture.thirdScannerDeviceId,
    });

    if (thirdScan.status !== 200 || thirdScan.responseBody.status !== "SUCCESS") {
      throw new Error(
        `Expected third reward unlock scan to return 200 SUCCESS, got ${thirdScan.status} ${thirdScan.responseBody.status ?? "null"}.`
      );
    }

    if (thirdScan.responseBody.rewardUnlockPush?.status !== "QUEUED") {
      throw new Error(
        `Expected third reward unlock push status QUEUED, got ${thirdScan.responseBody.rewardUnlockPush?.status ?? "null"}.`
      );
    }

    const thirdUnlockedRewardIds = thirdScan.responseBody.unlockedRewardTiers?.map((rewardTier) => rewardTier.rewardTierId) ?? [];

    if (thirdUnlockedRewardIds.length !== 1 || thirdUnlockedRewardIds[0] !== fixture.thirdRewardTierId) {
      throw new Error(
        `Expected third scan to unlock only the third reward tier, got ${JSON.stringify(thirdUnlockedRewardIds)}.`
      );
    }

    await waitForAsync(
      async () => (await readRewardUnlockNotificationsAsync(fixtureEventId)).length === 3,
      "Expected three REWARD_UNLOCKED notifications before timeout."
    );

    const notificationsAfterFailure = await readRewardUnlockNotificationsAsync(fixtureEventId);
    const thirdNotification = notificationsAfterFailure[2];
    const thirdNotificationRewardIds = thirdNotification?.payload.rewardTierIds ?? [];

    if (
      typeof thirdNotification === "undefined" ||
      thirdNotification.status !== "FAILED" ||
      thirdNotificationRewardIds.length !== 1 ||
      thirdNotificationRewardIds[0] !== fixture.thirdRewardTierId
    ) {
      throw new Error(
        `Expected failed third reward notification with the third tier id, got ${JSON.stringify(thirdNotification)}.`
      );
    }

    outputs.push("notifications:FAILED");

    const directRpcAttempt = await scannerClient.supabase.rpc("scan_stamp_atomic", {
      p_business_id: fixture.firstBusinessId,
      p_event_id: fixture.eventId,
      p_ip: null,
      p_qr_jti: `direct-rpc-${suffix.toLowerCase()}`,
      p_scanner_device_id: null,
      p_scanner_latitude: null,
      p_scanner_longitude: null,
      p_scanner_user_id: seededScannerProfileId,
      p_student_id: seededStudentProfileId,
      p_user_agent: null,
    });

    if (directRpcAttempt.error === null) {
      throw new Error("Expected direct scan_stamp_atomic RPC execution to be denied for authenticated clients.");
    }

    outputs.push("direct-rpc:denied");

    console.log(outputs.join("|"));
  } catch (error) {
    runError = error instanceof Error ? error : new Error(String(error));
    throw runError;
  } finally {
    if (fixture !== null) {
      try {
        await cleanupRewardUnlockFixtureAsync(fixture);
      } catch (cleanupError) {
        if (runError === null) {
          throw cleanupError;
        }

        console.error("reward-unlocked-push-cleanup-failed", cleanupError);
      }
    }

    try {
      await pushMockServer.stopAsync();
    } catch (stopError) {
      if (runError === null) {
        throw stopError;
      }

      console.error("reward-unlocked-push-mock-stop-failed", stopError);
    }
  }
};

void run();
