import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import {
  createAuthedClientAsync,
  getAccessTokenAsync,
  invokeFunctionAsync,
  readSqlTextAsync,
  runSqlAsync,
  seededAdminEmail,
  seededAdminProfileId,
  seededPassword,
  seededStudentEmail,
  seededStudentProfileId,
} from "./_shared/function-smoke";

type AnnouncementPushFixture = {
  announcementId: string;
  studentExpoToken: string;
};

type PushRequestMessage = {
  data?: {
    announcementId?: string;
    type?: string;
  };
  title?: string;
  to?: string;
};

const mockPushPort = 8789;

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
      const parsedBody = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
      const messages = Array.isArray(parsedBody) ? parsedBody : [parsedBody];

      receivedBatches.push(messages as PushRequestMessage[]);
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          data: messages.map((_: PushRequestMessage, index: number) => ({
            id: `announcement-push-ticket-${receivedBatches.length}-${index + 1}`,
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

const seedAnnouncementPushFixtureAsync = async (suffix: string): Promise<AnnouncementPushFixture> => {
  const announcementId = randomUUID();
  const studentExpoToken = `ExponentPushToken[announcement-smoke-${suffix.toLowerCase()}]`;
  const sql = `
    begin;

    insert into public.announcements (
      id,
      club_id,
      created_by,
      audience,
      title,
      body,
      status,
      starts_at,
      ends_at,
      show_as_popup
    ) values (
      '${announcementId}',
      null,
      '${seededAdminProfileId}',
      'STUDENTS',
      'Announcement Smoke ${suffix}',
      'Announcement push smoke validates delivery and audit persistence.',
      'PUBLISHED',
      now() - interval '5 minutes',
      now() + interval '1 hour',
      true
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
      'announcement-smoke-device-${suffix.toLowerCase()}',
      true,
      now()
    );

    commit;
  `;

  await runSqlAsync(sql);

  return {
    announcementId,
    studentExpoToken,
  };
};

const cleanupAnnouncementPushFixtureAsync = async (fixture: AnnouncementPushFixture): Promise<void> => {
  const sql = `
    begin;

    delete from public.audit_logs
    where action = 'ANNOUNCEMENT_PUSH_SENT'
      and resource_id = '${fixture.announcementId}'::uuid;

    delete from public.notifications
    where type = 'ANNOUNCEMENT'
      and payload->>'announcementId' = '${fixture.announcementId}';

    delete from public.device_tokens
    where expo_push_token = '${fixture.studentExpoToken}';

    delete from public.announcements
    where id = '${fixture.announcementId}'::uuid;

    commit;
  `;

  await runSqlAsync(sql);
};

const run = async (): Promise<void> => {
  const outputs: string[] = [];
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const pushMockServer = createPushMockServer();
  let fixture: AnnouncementPushFixture | null = null;
  let runError: Error | null = null;

  try {
    await pushMockServer.startAsync();
    fixture = await seedAnnouncementPushFixtureAsync(suffix);
    const adminClient = await createAuthedClientAsync(seededAdminEmail, seededPassword);
    const studentClient = await createAuthedClientAsync(seededStudentEmail, seededPassword);
    const adminAccessToken = await getAccessTokenAsync(adminClient);
    const studentAccessToken = await getAccessTokenAsync(studentClient);

    const forbiddenResult = await invokeFunctionAsync("send-announcement-push", studentAccessToken, {
      announcementId: fixture.announcementId,
    });

    if (
      forbiddenResult.status !== 403 ||
      forbiddenResult.responseBody.status !== "ANNOUNCEMENT_PUSH_NOT_ALLOWED"
    ) {
      throw new Error(
        `Expected student announcement push to be forbidden, got ${forbiddenResult.status} ${forbiddenResult.responseBody.status ?? "null"}.`
      );
    }

    outputs.push("student-send:forbidden");

    const adminResult = await invokeFunctionAsync("send-announcement-push", adminAccessToken, {
      announcementId: fixture.announcementId,
    });

    if (adminResult.status !== 200 || adminResult.responseBody.status !== "SUCCESS") {
      throw new Error(
        `Expected admin announcement push to return SUCCESS, got ${adminResult.status} ${adminResult.responseBody.status ?? "null"}.`
      );
    }

    if (adminResult.responseBody.notificationsCreated !== 1 || adminResult.responseBody.notificationsSent !== 1) {
      throw new Error(`Expected one sent announcement notification, got ${JSON.stringify(adminResult.responseBody)}.`);
    }

    outputs.push("admin-send:SUCCESS");

    const [firstBatch] = pushMockServer.getReceivedBatches();
    const expectedMessage = (firstBatch ?? []).find(
      (message) => message.to === fixture?.studentExpoToken
    );

    if (
      typeof expectedMessage === "undefined" ||
      expectedMessage.data?.announcementId !== fixture.announcementId ||
      expectedMessage.data?.type !== "ANNOUNCEMENT"
    ) {
      throw new Error(`Expected mock push to include the announcement payload, got ${JSON.stringify(firstBatch)}.`);
    }

    outputs.push("push-payload:ok");

    const notificationCount = await readSqlTextAsync(`
      select count(*)
      from public.notifications
      where type = 'ANNOUNCEMENT'
        and status = 'SENT'
        and user_id = '${seededStudentProfileId}'::uuid
        and payload->>'announcementId' = '${fixture.announcementId}';
    `);
    const auditCount = await readSqlTextAsync(`
      select count(*)
      from public.audit_logs
      where action = 'ANNOUNCEMENT_PUSH_SENT'
        and resource_id = '${fixture.announcementId}'::uuid;
    `);

    if (notificationCount !== "1" || auditCount !== "1") {
      throw new Error(`Expected one SENT notification and one audit log, got notification=${notificationCount} audit=${auditCount}.`);
    }

    outputs.push("persistence:ok");
    console.log(outputs.join("|"));
  } catch (error) {
    runError = error instanceof Error ? error : new Error("Unknown announcement push smoke error.");
    throw runError;
  } finally {
    await pushMockServer.stopAsync();

    if (fixture !== null) {
      try {
        await cleanupAnnouncementPushFixtureAsync(fixture);
      } catch (cleanupError) {
        if (runError === null) {
          throw cleanupError;
        }

        console.error(cleanupError);
      }
    }
  }
};

void run();
