import { createHmac, randomUUID } from "node:crypto";

import {
  createAuthedClientAsync,
  getAccessTokenAsync,
  invokeFunctionAsync,
  readSqlTextAsync,
  requireQrSigningSecret,
  runSqlAsync,
  seededActiveEventId,
  seededBusinessId,
  seededOrganizerProfileId,
  seededPassword,
  seededScannerEmail,
  seededStudentEmail,
  seededStudentProfileId,
} from "./_shared/function-smoke";

type WrongEventFixture = {
  eventId: string;
};

type QrPayload = {
  eventId: string;
  exp: number;
  iat: number;
  jti: string;
  sub: string;
  typ: string;
};

const toBase64Url = (value: Buffer | string): string =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const signQrJwt = (secret: string, payload: QrPayload): string => {
  const encodedHeader = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", secret).update(signingInput).digest();

  return `${signingInput}.${toBase64Url(signature)}`;
};

const createWrongTypeQrToken = (secret: string, eventId: string): string => {
  const nowUnixSeconds = Math.floor(Date.now() / 1000);

  return signQrJwt(secret, {
    eventId,
    exp: nowUnixSeconds + 45,
    iat: nowUnixSeconds,
    jti: `wrong-type-${randomUUID()}`,
    sub: seededStudentProfileId,
    typ: "NOT_A_LEIMA_QR",
  });
};

const createExpiredQrToken = (secret: string, eventId: string): string => {
  const nowUnixSeconds = Math.floor(Date.now() / 1000);

  return signQrJwt(secret, {
    eventId,
    exp: nowUnixSeconds - 30,
    iat: nowUnixSeconds - 60,
    jti: `expired-${randomUUID()}`,
    sub: seededStudentProfileId,
    typ: "LEIMA_STAMP_QR",
  });
};

const tamperToken = (token: string): string => {
  const [header, payload, signature] = token.split(".");

  if (typeof header !== "string" || typeof payload !== "string" || typeof signature !== "string") {
    throw new Error("Expected QR token to contain header, payload, and signature segments.");
  }

  const replacementCharacter = payload.startsWith("a") ? "b" : "a";

  return `${header}.${replacementCharacter}${payload.slice(1)}.${signature}`;
};

const seedWrongEventFixtureAsync = async (suffix: string): Promise<WrongEventFixture> => {
  const eventId = randomUUID();
  const eventSlug = `qr-security-wrong-event-${suffix.toLowerCase()}`;
  const sql = `
    begin;

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
      '10000000-0000-0000-0000-000000000001',
      'QR Security Wrong Event ${suffix}',
      '${eventSlug}',
      'Fixture event for wrong-event QR security validation.',
      'Helsinki',
      now() - interval '20 minutes',
      now() + interval '2 hours',
      now() - interval '80 minutes',
      'ACTIVE',
      'PUBLIC',
      1,
      '${seededOrganizerProfileId}'
    );

    insert into public.event_registrations (
      event_id,
      student_id
    ) values (
      '${eventId}',
      '${seededStudentProfileId}'
    );

    commit;
  `;

  await runSqlAsync(sql);

  return {
    eventId,
  };
};

const cleanupWrongEventFixtureAsync = async (fixture: WrongEventFixture): Promise<void> => {
  const sql = `
    begin;

    delete from public.audit_logs
    where action = 'STAMP_CREATED'
      and metadata->>'eventId' = '${fixture.eventId}';

    delete from public.stamps
    where event_id = '${fixture.eventId}'::uuid;

    delete from public.qr_token_uses
    where event_id = '${fixture.eventId}'::uuid;

    delete from public.event_registrations
    where event_id = '${fixture.eventId}'::uuid;

    delete from public.events
    where id = '${fixture.eventId}'::uuid;

    commit;
  `;

  await runSqlAsync(sql);
};

const run = async (): Promise<void> => {
  const outputs: string[] = [];
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const qrSigningSecret = requireQrSigningSecret();
  const studentClient = await createAuthedClientAsync(seededStudentEmail, seededPassword);
  const scannerClient = await createAuthedClientAsync(seededScannerEmail, seededPassword);
  let wrongEventFixture: WrongEventFixture | null = null;
  let runError: Error | null = null;

  try {
    const studentAccessToken = await getAccessTokenAsync(studentClient);
    const scannerAccessToken = await getAccessTokenAsync(scannerClient);

    const invalidGenerate = await invokeFunctionAsync("generate-qr-token", null, {
      eventId: seededActiveEventId,
    });

    if (invalidGenerate.status !== 401 || invalidGenerate.responseBody.status !== "UNAUTHORIZED") {
      throw new Error(
        `Expected generate-qr-token without bearer to return 401 UNAUTHORIZED, got ${invalidGenerate.status} ${invalidGenerate.responseBody.status ?? "null"}.`
      );
    }

    outputs.push("generate-without-bearer:UNAUTHORIZED");

    const validGenerate = await invokeFunctionAsync("generate-qr-token", studentAccessToken, {
      eventId: seededActiveEventId,
    });

    const validToken = validGenerate.responseBody.qrPayload?.token;

    if (validGenerate.status !== 200 || typeof validToken !== "string") {
      throw new Error(
        `Expected generate-qr-token to return 200 and a QR token, got ${validGenerate.status} ${validGenerate.responseBody.status ?? "null"}.`
      );
    }

    outputs.push("generate-valid:ok");

    const seededEventVenueId = await readSqlTextAsync(`
      select id::text
      from public.event_venues
      where event_id = '${seededActiveEventId}'::uuid
        and business_id = '${seededBusinessId}'::uuid
        and status = 'JOINED'
      limit 1;
    `);

    if (seededEventVenueId.length === 0) {
      throw new Error("Expected seeded active event venue to exist for QR security smoke.");
    }

    const invalidScanBearer = await invokeFunctionAsync("scan-qr", null, {
      businessId: seededBusinessId,
      eventId: seededActiveEventId,
      eventVenueId: seededEventVenueId,
      qrToken: validToken,
      scannerDeviceId: randomUUID(),
    });

    if (invalidScanBearer.status !== 401 || invalidScanBearer.responseBody.status !== "UNAUTHORIZED") {
      throw new Error(
        `Expected scan-qr without bearer to return 401 UNAUTHORIZED, got ${invalidScanBearer.status} ${invalidScanBearer.responseBody.status ?? "null"}.`
      );
    }

    outputs.push("scan-without-bearer:UNAUTHORIZED");

    const tamperedScan = await invokeFunctionAsync("scan-qr", scannerAccessToken, {
      businessId: seededBusinessId,
      eventId: seededActiveEventId,
      eventVenueId: seededEventVenueId,
      qrToken: tamperToken(validToken),
      scannerDeviceId: randomUUID(),
    });

    if (tamperedScan.status !== 400 || tamperedScan.responseBody.status !== "INVALID_QR") {
      throw new Error(
        `Expected tampered QR to return 400 INVALID_QR, got ${tamperedScan.status} ${tamperedScan.responseBody.status ?? "null"}.`
      );
    }

    outputs.push("tampered-qr:INVALID_QR");

    const invalidTypeScan = await invokeFunctionAsync("scan-qr", scannerAccessToken, {
      businessId: seededBusinessId,
      eventId: seededActiveEventId,
      eventVenueId: seededEventVenueId,
      qrToken: createWrongTypeQrToken(qrSigningSecret, seededActiveEventId),
      scannerDeviceId: randomUUID(),
    });

    if (invalidTypeScan.status !== 400 || invalidTypeScan.responseBody.status !== "INVALID_QR_TYPE") {
      throw new Error(
        `Expected wrong-type QR to return 400 INVALID_QR_TYPE, got ${invalidTypeScan.status} ${invalidTypeScan.responseBody.status ?? "null"}.`
      );
    }

    outputs.push("wrong-type-qr:INVALID_QR_TYPE");

    const expiredScan = await invokeFunctionAsync("scan-qr", scannerAccessToken, {
      businessId: seededBusinessId,
      eventId: seededActiveEventId,
      eventVenueId: seededEventVenueId,
      qrToken: createExpiredQrToken(qrSigningSecret, seededActiveEventId),
      scannerDeviceId: randomUUID(),
    });

    if (expiredScan.status !== 400 || expiredScan.responseBody.status !== "QR_EXPIRED") {
      throw new Error(
        `Expected expired QR to return 400 QR_EXPIRED, got ${expiredScan.status} ${expiredScan.responseBody.status ?? "null"}.`
      );
    }

    outputs.push("expired-qr:QR_EXPIRED");

    wrongEventFixture = await seedWrongEventFixtureAsync(suffix);

    const wrongEventGenerate = await invokeFunctionAsync("generate-qr-token", studentAccessToken, {
      eventId: wrongEventFixture.eventId,
    });
    const wrongEventToken = wrongEventGenerate.responseBody.qrPayload?.token;

    if (wrongEventGenerate.status !== 200 || typeof wrongEventToken !== "string") {
      throw new Error(
        `Expected wrong-event fixture generate-qr-token to return 200, got ${wrongEventGenerate.status} ${wrongEventGenerate.responseBody.status ?? "null"}.`
      );
    }

    const wrongEventScan = await invokeFunctionAsync("scan-qr", scannerAccessToken, {
      businessId: seededBusinessId,
      eventId: seededActiveEventId,
      eventVenueId: seededEventVenueId,
      qrToken: wrongEventToken,
      scannerDeviceId: null,
    });

    if (wrongEventScan.status !== 200 || wrongEventScan.responseBody.status !== "EVENT_CONTEXT_MISMATCH") {
      throw new Error(
        `Expected wrong-event QR to return 200 EVENT_CONTEXT_MISMATCH, got ${wrongEventScan.status} ${wrongEventScan.responseBody.status ?? "null"}.`
      );
    }

    outputs.push("wrong-event-qr:EVENT_CONTEXT_MISMATCH");

    console.log(outputs.join("|"));
  } catch (error) {
    runError = error instanceof Error ? error : new Error("Unknown QR security smoke error.");
    throw runError;
  } finally {
    const signOutResults = await Promise.all([
      studentClient.supabase.auth.signOut(),
      scannerClient.supabase.auth.signOut(),
    ]);

    if (wrongEventFixture !== null) {
      try {
        await cleanupWrongEventFixtureAsync(wrongEventFixture);
      } catch (cleanupError) {
        if (runError === null) {
          throw cleanupError;
        }

        console.error(cleanupError);
      }
    }

    signOutResults.forEach((signOutResult, index) => {
      if (signOutResult.error !== null) {
        const clientLabel = [seededStudentEmail, seededScannerEmail][index];

        if (runError === null) {
          throw new Error(`Failed to sign out ${clientLabel} after QR security smoke: ${signOutResult.error.message}`);
        }

        console.error(new Error(`Failed to sign out ${clientLabel} after QR security smoke: ${signOutResult.error.message}`));
      }
    });
  }
};

void run();
