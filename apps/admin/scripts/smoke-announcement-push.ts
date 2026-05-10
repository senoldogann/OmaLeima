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
  successfulRetryProfileId: string | null;
  successfulRetryExpoToken: string | null;
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
    successfulRetryProfileId: null,
    successfulRetryExpoToken: null,
    studentExpoToken,
  };
};

const seedSuccessfulRetryRecipientAsync = async (
  fixture: AnnouncementPushFixture,
  suffix: string
): Promise<AnnouncementPushFixture> => {
  const successfulRetryProfileId = randomUUID();
  const successfulRetryIdentityId = randomUUID();
  const successfulRetryEmail = `announcement-success-${suffix.toLowerCase()}@omaleima.test`;
  const successfulRetryExpoToken = `ExponentPushToken[announcement-success-${suffix.toLowerCase()}]`;
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
      '${successfulRetryProfileId}',
      'authenticated',
      'authenticated',
      '${successfulRetryEmail}',
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
      '{"display_name":"Announcement Success Recipient"}'::jsonb,
      now(),
      now()
    );

    insert into auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      '${successfulRetryIdentityId}',
      '${successfulRetryProfileId}',
      '${successfulRetryProfileId}',
      jsonb_build_object('sub', '${successfulRetryProfileId}', 'email', '${successfulRetryEmail}'),
      'email',
      now(),
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
      '${successfulRetryProfileId}',
      '${successfulRetryEmail}',
      'Announcement Success Recipient',
      'STUDENT',
      'ACTIVE'
    )
    on conflict (id) do update
    set
      email = excluded.email,
      display_name = excluded.display_name,
      primary_role = excluded.primary_role,
      status = excluded.status,
      updated_at = now();

    insert into public.device_tokens (
      user_id,
      expo_push_token,
      platform,
      device_id,
      enabled,
      last_seen_at
    ) values (
      '${successfulRetryProfileId}',
      '${successfulRetryExpoToken}',
      'IOS',
      'announcement-success-device-${suffix.toLowerCase()}',
      true,
      now()
    );

    insert into public.notifications (
      user_id,
      type,
      title,
      body,
      payload,
      channel,
      status,
      sent_at
    ) values (
      '${successfulRetryProfileId}'::uuid,
      'ANNOUNCEMENT',
      'Previous successful announcement push',
      'Previous successful announcement push attempt.',
      jsonb_build_object(
        'announcementId',
        '${fixture.announcementId}',
        'deliveryResults',
        jsonb_build_array(jsonb_build_object('ok', true, 'ticketId', 'fixture-success')),
        'deviceTokenCount',
        1
      ),
      'PUSH',
      'SENT',
      now()
    );

    commit;
  `;

  await runSqlAsync(sql);

  return {
    ...fixture,
    successfulRetryProfileId,
    successfulRetryExpoToken,
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

    delete from auth.users
    where id = nullif('${fixture.successfulRetryProfileId ?? ""}', '')::uuid;

    delete from public.announcements
    where id = '${fixture.announcementId}'::uuid;

    commit;
  `;

  await runSqlAsync(sql);
};

const seedFailedAnnouncementNotificationAsync = async (fixture: AnnouncementPushFixture): Promise<void> => {
  const sql = `
    insert into public.notifications (
      user_id,
      type,
      title,
      body,
      payload,
      channel,
      status,
      sent_at
    ) values (
      '${seededStudentProfileId}'::uuid,
      'ANNOUNCEMENT',
      'Previous failed announcement push',
      'Previous failed announcement push attempt.',
      jsonb_build_object(
        'announcementId',
        '${fixture.announcementId}',
        'deliveryResults',
        jsonb_build_array(jsonb_build_object('ok', false, 'error', 'fixture failure')),
        'deviceTokenCount',
        1
      ),
      'PUSH',
      'FAILED',
      null
    );
  `;

  await runSqlAsync(sql);
};

const run = async (): Promise<void> => {
  const outputs: string[] = [];
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const pushMockServer = createPushMockServer();
  let fixture: AnnouncementPushFixture | null = null;
  let retryFixture: AnnouncementPushFixture | null = null;
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

    retryFixture = await seedAnnouncementPushFixtureAsync(`${suffix}-RETRY`);
    retryFixture = await seedSuccessfulRetryRecipientAsync(retryFixture, `${suffix}-RETRY`);
    await seedFailedAnnouncementNotificationAsync(retryFixture);

    const retryResult = await invokeFunctionAsync("send-announcement-push", adminAccessToken, {
      announcementId: retryFixture.announcementId,
    });

    if (retryResult.status !== 200 || retryResult.responseBody.status !== "SUCCESS") {
      throw new Error(
        `Expected failed announcement retry to return SUCCESS, got ${retryResult.status} ${retryResult.responseBody.status ?? "null"}.`
      );
    }

    if (retryResult.responseBody.notificationsCreated !== 2 || retryResult.responseBody.notificationsSent !== 2) {
      throw new Error(`Expected two repeat announcement notifications, got ${JSON.stringify(retryResult.responseBody)}.`);
    }

    const retryNotificationState = await readSqlTextAsync(`
      select string_agg(status, ',' order by status)
      from public.notifications
      where type = 'ANNOUNCEMENT'
        and user_id = '${seededStudentProfileId}'::uuid
        and payload->>'announcementId' = '${retryFixture.announcementId}';
    `);

    if (retryNotificationState !== "FAILED,SENT,SENT") {
      throw new Error(`Expected repeat fixture to keep previous rows and add new SENT rows, got ${retryNotificationState}.`);
    }

    outputs.push("repeat-after-history:SUCCESS");

    const retryBatches = pushMockServer.getReceivedBatches();
    const retryBatch = retryBatches[1] ?? [];
    const retryFailedRecipientMessage = retryBatch.find(
      (message) => message.to === retryFixture?.studentExpoToken
    );
    const retrySuccessfulRecipientMessage = retryBatch.find(
      (message) => message.to === retryFixture?.successfulRetryExpoToken
    );

    if (
      typeof retryFailedRecipientMessage === "undefined" ||
      typeof retrySuccessfulRecipientMessage === "undefined"
    ) {
      throw new Error(`Expected repeat push to include all eligible recipients, got ${JSON.stringify(retryBatch)}.`);
    }

    outputs.push("repeat-target:all-eligible");

    const duplicateRetryResult = await invokeFunctionAsync("send-announcement-push", adminAccessToken, {
      announcementId: retryFixture.announcementId,
    });

    if (
      duplicateRetryResult.status !== 200 ||
      duplicateRetryResult.responseBody.status !== "SUCCESS" ||
      duplicateRetryResult.responseBody.notificationsCreated !== 2 ||
      duplicateRetryResult.responseBody.notificationsSent !== 2
    ) {
      throw new Error(`Expected repeated send to stay SUCCESS, got ${JSON.stringify(duplicateRetryResult)}.`);
    }

    outputs.push("repeat-after-success:SUCCESS");
    console.log(outputs.join("|"));
  } catch (error) {
    runError = error instanceof Error ? error : new Error("Unknown announcement push smoke error.");
    throw runError;
  } finally {
    await pushMockServer.stopAsync();

    if (retryFixture !== null) {
      try {
        await cleanupAnnouncementPushFixtureAsync(retryFixture);
      } catch (cleanupError) {
        if (runError === null) {
          throw cleanupError;
        }

        console.error(cleanupError);
      }
    }

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
