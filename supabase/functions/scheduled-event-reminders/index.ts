import { assertPostRequest, errorResponse, jsonResponse } from "../_shared/http.ts";
import { readRuntimeEnv } from "../_shared/env.ts";
import { type ExpoPushMessage, type ExpoPushSendResult, sendExpoPushMessages } from "../_shared/expoPush.ts";
import { assertScheduledJobRequest } from "../_shared/scheduled.ts";
import { createServiceClient } from "../_shared/supabase.ts";

type ReminderWindowHours = 24 | 2;

type ReminderWindow = {
  hours: ReminderWindowHours;
  lowerBoundMinutes: number;
  upperBoundMinutes: number;
};

type EventRow = {
  id: string;
  name: string;
  city: string;
  start_at: string;
};

type RegistrationRow = {
  event_id: string;
  student_id: string;
};

type ProfileRow = {
  id: string;
};

type DeviceTokenRow = {
  user_id: string;
  expo_push_token: string;
};

type ExistingNotificationRow = {
  user_id: string | null;
  event_id: string | null;
  payload: Record<string, unknown>;
};

type DueEvent = {
  eventId: string;
  eventName: string;
  eventCity: string;
  eventStartAt: string;
  reminderWindowHours: ReminderWindowHours;
};

type ReminderCandidate = {
  key: string;
  userId: string;
  eventId: string;
  eventName: string;
  eventCity: string;
  eventStartAt: string;
  reminderWindowHours: ReminderWindowHours;
  expoPushTokens: string[];
};

type PushTarget = {
  candidateKey: string;
  message: ExpoPushMessage;
};

type NotificationInsertRow = {
  user_id: string;
  event_id: string;
  type: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  channel: "PUSH";
  status: "SENT" | "FAILED";
  sent_at: string | null;
};

type DeliverySummary = {
  candidate: ReminderCandidate;
  title: string;
  body: string;
  tokenResults: ExpoPushSendResult[];
};

const reminderWindowMinutes = 30;
const reminderWindows: ReminderWindow[] = [
  {
    hours: 24,
    lowerBoundMinutes: 24 * 60,
    upperBoundMinutes: 24 * 60 + reminderWindowMinutes,
  },
  {
    hours: 2,
    lowerBoundMinutes: 2 * 60,
    upperBoundMinutes: 2 * 60 + reminderWindowMinutes,
  },
];

const addMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60 * 1000);

const buildReminderKey = (userId: string, eventId: string, reminderWindowHours: ReminderWindowHours): string =>
  `${userId}:${eventId}:${reminderWindowHours}`;

const isReminderWindowHours = (value: unknown): value is ReminderWindowHours =>
  value === 24 || value === 2;

const readReminderWindowHours = (payload: Record<string, unknown>): ReminderWindowHours | null => {
  const value = payload.reminderWindowHours;

  if (isReminderWindowHours(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (isReminderWindowHours(parsed)) {
      return parsed;
    }
  }

  return null;
};

const buildReminderTitle = (eventName: string): string => `Reminder: ${eventName}`;

const buildReminderBody = (
  eventName: string,
  eventCity: string,
  reminderWindowHours: ReminderWindowHours,
): string => `${eventName} starts in ${reminderWindowHours} hours in ${eventCity}.`;

const serializeTokenResults = (results: ExpoPushSendResult[]): Record<string, unknown>[] =>
  results.map((result): Record<string, unknown> =>
    result.ok
      ? {
          ok: true,
          ticketId: result.ticketId,
        }
      : {
          ok: false,
          error: result.message,
        }
  );

const readDueEventsForWindow = async (
  supabase: ReturnType<typeof createServiceClient>,
  now: Date,
  reminderWindow: ReminderWindow,
): Promise<DueEvent[]> => {
  const lowerBoundIso = addMinutes(now, reminderWindow.lowerBoundMinutes).toISOString();
  const upperBoundIso = addMinutes(now, reminderWindow.upperBoundMinutes).toISOString();

  const { data, error } = await supabase
    .from("events")
    .select("id,name,city,start_at")
    .in("status", ["PUBLISHED", "ACTIVE"])
    .gte("start_at", lowerBoundIso)
    .lt("start_at", upperBoundIso)
    .returns<EventRow[]>();

  if (error !== null) {
    throw new Error(`Failed to read due events: ${error.message}`);
  }

  return data.map((event): DueEvent => ({
    eventId: event.id,
    eventName: event.name,
    eventCity: event.city,
    eventStartAt: event.start_at,
    reminderWindowHours: reminderWindow.hours,
  }));
};

const groupTokensByUser = (rows: DeviceTokenRow[]): Map<string, string[]> => {
  const grouped = new Map<string, string[]>();

  for (const row of rows) {
    const tokens = grouped.get(row.user_id) ?? [];
    tokens.push(row.expo_push_token);
    grouped.set(row.user_id, tokens);
  }

  return grouped;
};

const buildAlreadySentSet = (rows: ExistingNotificationRow[]): Set<string> => {
  const keys = new Set<string>();

  for (const row of rows) {
    if (row.user_id === null || row.event_id === null) {
      continue;
    }

    const reminderWindowHours = readReminderWindowHours(row.payload);

    if (reminderWindowHours === null) {
      continue;
    }

    keys.add(buildReminderKey(row.user_id, row.event_id, reminderWindowHours));
  }

  return keys;
};

const buildNotificationInsertRows = (deliveries: DeliverySummary[]): NotificationInsertRow[] =>
  deliveries.map((delivery): NotificationInsertRow => {
    const hasSuccessfulDelivery = delivery.tokenResults.some((result) => result.ok);

    return {
      user_id: delivery.candidate.userId,
      event_id: delivery.candidate.eventId,
      type: "EVENT_REMINDER",
      title: delivery.title,
      body: delivery.body,
      payload: {
        reminderWindowHours: delivery.candidate.reminderWindowHours,
        eventStartAt: delivery.candidate.eventStartAt,
        deviceTokenCount: delivery.candidate.expoPushTokens.length,
        deliveryResults: serializeTokenResults(delivery.tokenResults),
      },
      channel: "PUSH",
      status: hasSuccessfulDelivery ? "SENT" : "FAILED",
      sent_at: hasSuccessfulDelivery ? new Date().toISOString() : null,
    };
  });

Deno.serve(async (request: Request): Promise<Response> => {
  const methodResponse = assertPostRequest(request);

  if (methodResponse !== null) {
    return methodResponse;
  }

  try {
    const env = readRuntimeEnv();
    const scheduledAuthResponse = assertScheduledJobRequest(request, env);

    if (scheduledAuthResponse !== null) {
      return scheduledAuthResponse;
    }

    const supabase = createServiceClient(env);
    const now = new Date();
    const dueEventGroups = await Promise.all(
      reminderWindows.map((reminderWindow) => readDueEventsForWindow(supabase, now, reminderWindow)),
    );
    const dueEvents = dueEventGroups.flat();

    if (dueEvents.length === 0) {
      return jsonResponse({
        status: "SUCCESS",
        dueEvents: 0,
        reminderCandidates: 0,
        remindersSkippedAlreadySent: 0,
        remindersSkippedNoDeviceToken: 0,
        notificationsCreated: 0,
        notificationsSent: 0,
        notificationsFailed: 0,
      }, 200);
    }

    const dueEventIds = dueEvents.map((event) => event.eventId);
    const dueEventById = new Map<string, DueEvent>(
      dueEvents.map((event) => [event.eventId, event]),
    );

    const { data: registrations, error: registrationsError } = await supabase
      .from("event_registrations")
      .select("event_id,student_id")
      .in("event_id", dueEventIds)
      .eq("status", "REGISTERED")
      .returns<RegistrationRow[]>();

    if (registrationsError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read event registrations.", {
        registrationError: registrationsError.message,
      });
    }

    if (registrations.length === 0) {
      return jsonResponse({
        status: "SUCCESS",
        dueEvents: dueEvents.length,
        reminderCandidates: 0,
        remindersSkippedAlreadySent: 0,
        remindersSkippedNoDeviceToken: 0,
        notificationsCreated: 0,
        notificationsSent: 0,
        notificationsFailed: 0,
      }, 200);
    }

    const registeredUserIds = Array.from(new Set(registrations.map((registration) => registration.student_id)));

    const { data: activeProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id")
      .in("id", registeredUserIds)
      .eq("status", "ACTIVE")
      .returns<ProfileRow[]>();

    if (profilesError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read participant profiles.", {
        profilesError: profilesError.message,
      });
    }

    const activeProfileIds = new Set(activeProfiles.map((profile) => profile.id));
    const activeRegistrations = registrations.filter((registration) => activeProfileIds.has(registration.student_id));

    if (activeRegistrations.length === 0) {
      return jsonResponse({
        status: "SUCCESS",
        dueEvents: dueEvents.length,
        reminderCandidates: 0,
        remindersSkippedAlreadySent: 0,
        remindersSkippedNoDeviceToken: 0,
        notificationsCreated: 0,
        notificationsSent: 0,
        notificationsFailed: 0,
      }, 200);
    }

    const activeUserIds = Array.from(new Set(activeRegistrations.map((registration) => registration.student_id)));

    const [{ data: deviceTokens, error: deviceTokensError }, { data: existingNotifications, error: notificationsError }] =
      await Promise.all([
        supabase
          .from("device_tokens")
          .select("user_id,expo_push_token")
          .in("user_id", activeUserIds)
          .eq("enabled", true)
          .returns<DeviceTokenRow[]>(),
        supabase
          .from("notifications")
          .select("user_id,event_id,payload")
          .in("event_id", dueEventIds)
          .in("user_id", activeUserIds)
          .eq("type", "EVENT_REMINDER")
          .in("status", ["SENT", "READ"])
          .returns<ExistingNotificationRow[]>(),
      ]);

    if (deviceTokensError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read device tokens.", {
        deviceTokensError: deviceTokensError.message,
      });
    }

    if (notificationsError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read existing reminders.", {
        notificationsError: notificationsError.message,
      });
    }

    const tokensByUser = groupTokensByUser(deviceTokens);
    const alreadySentKeys = buildAlreadySentSet(existingNotifications);
    const reminderCandidates: ReminderCandidate[] = [];
    let remindersSkippedAlreadySent = 0;
    let remindersSkippedNoDeviceToken = 0;

    for (const registration of activeRegistrations) {
      const dueEvent = dueEventById.get(registration.event_id);

      if (typeof dueEvent === "undefined") {
        continue;
      }

      const reminderKey = buildReminderKey(
        registration.student_id,
        dueEvent.eventId,
        dueEvent.reminderWindowHours,
      );

      if (alreadySentKeys.has(reminderKey)) {
        remindersSkippedAlreadySent += 1;
        continue;
      }

      const expoPushTokens = tokensByUser.get(registration.student_id) ?? [];

      if (expoPushTokens.length === 0) {
        remindersSkippedNoDeviceToken += 1;
        continue;
      }

      reminderCandidates.push({
        key: reminderKey,
        userId: registration.student_id,
        eventId: dueEvent.eventId,
        eventName: dueEvent.eventName,
        eventCity: dueEvent.eventCity,
        eventStartAt: dueEvent.eventStartAt,
        reminderWindowHours: dueEvent.reminderWindowHours,
        expoPushTokens,
      });
    }

    if (reminderCandidates.length === 0) {
      return jsonResponse({
        status: "SUCCESS",
        dueEvents: dueEvents.length,
        reminderCandidates: 0,
        remindersSkippedAlreadySent,
        remindersSkippedNoDeviceToken,
        notificationsCreated: 0,
        notificationsSent: 0,
        notificationsFailed: 0,
      }, 200);
    }

    const deliveries = new Map<string, DeliverySummary>();
    const pushTargets: PushTarget[] = [];

    for (const candidate of reminderCandidates) {
      const title = buildReminderTitle(candidate.eventName);
      const body = buildReminderBody(candidate.eventName, candidate.eventCity, candidate.reminderWindowHours);

      deliveries.set(candidate.key, {
        candidate,
        title,
        body,
        tokenResults: [],
      });

      for (const expoPushToken of candidate.expoPushTokens) {
        pushTargets.push({
          candidateKey: candidate.key,
          message: {
            to: expoPushToken,
            title,
            body,
            data: {
              type: "EVENT_REMINDER",
              eventId: candidate.eventId,
              reminderWindowHours: candidate.reminderWindowHours,
              eventStartAt: candidate.eventStartAt,
            },
          },
        });
      }
    }

    const pushResults = await sendExpoPushMessages(
      env.expoPushApiUrl,
      env.expoPushAccessToken,
      pushTargets.map((target) => target.message),
    );

    pushResults.forEach((result, index) => {
      const pushTarget = pushTargets[index];

      if (typeof pushTarget === "undefined") {
        return;
      }

      const delivery = deliveries.get(pushTarget.candidateKey);

      if (typeof delivery === "undefined") {
        return;
      }

      delivery.tokenResults.push(result);
    });

    const deliverySummaries = Array.from(deliveries.values());
    const notificationRows = buildNotificationInsertRows(deliverySummaries);

    const { error: insertNotificationsError } = await supabase
      .from("notifications")
      .insert(notificationRows);

    if (insertNotificationsError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to record reminder notifications.", {
        insertNotificationsError: insertNotificationsError.message,
      });
    }

    const notificationsSent = notificationRows.filter((row) => row.status === "SENT").length;
    const notificationsFailed = notificationRows.length - notificationsSent;

    return jsonResponse({
      status: notificationsFailed > 0 ? "PARTIAL_SUCCESS" : "SUCCESS",
      dueEvents: dueEvents.length,
      reminderCandidates: reminderCandidates.length,
      remindersSkippedAlreadySent,
      remindersSkippedNoDeviceToken,
      notificationsCreated: notificationRows.length,
      notificationsSent,
      notificationsFailed,
    }, 200);
  } catch (error) {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to run scheduled event reminders.", {
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
});
