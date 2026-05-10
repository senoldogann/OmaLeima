import { useEffect, useMemo } from "react";

import { useSessionAccessQuery } from "@/features/auth/session-access";
import {
  flattenStudentEventsBuckets,
  rehydrateStudentEventsBuckets,
  useStudentEventsQuery,
} from "@/features/events/student-events";
import type { StudentEventSummary } from "@/features/events/types";
import { useActiveAppState, useCurrentTime } from "@/features/qr/student-qr";
import {
  cancelScheduledNotificationAsync,
  presentLocalNotificationAsync,
  readScheduledNotificationsAsync,
  scheduleLocalNotificationAtAsync,
} from "@/lib/push";
import { useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { deviceStorage } from "@/lib/device-storage";
import { useSession } from "@/providers/session-provider";

const eventReminderLeadMs = 60 * 60 * 1000;
const eventReminderStoreKey = "student_event_reminder_fired_v1";
const eventReminderIdentifierPrefix = "student-event-reminder";

type FiredReminderRecord = Record<string, string>;

const createReminderIdentifier = (studentId: string, event: StudentEventSummary): string =>
  `${eventReminderIdentifierPrefix}:${studentId}:${event.id}:${event.startAt}`;

const createReminderDate = (event: StudentEventSummary): Date =>
  new Date(new Date(event.startAt).getTime() - eventReminderLeadMs);

const createReminderTitle = (language: "fi" | "en"): string =>
  language === "fi" ? "Tapahtuma alkaa pian" : "Event starts soon";

const createReminderBody = (
  event: StudentEventSummary,
  language: "fi" | "en"
): string =>
  language === "fi"
    ? `${event.name} alkaa alle tunnin kuluttua ${event.city}-illassa. Avaa OmaLeima ja pidä QR valmiina.`
    : `${event.name} starts in under an hour in ${event.city}. Open OmaLeima and keep your QR ready.`;

const isReminderCandidate = (event: StudentEventSummary): boolean =>
  event.registrationState === "REGISTERED" && event.timelineState === "UPCOMING";

const readFiredReminderRecordAsync = async (): Promise<FiredReminderRecord> => {
  const rawValue = await deviceStorage.getItemAsync(eventReminderStoreKey);

  if (rawValue === null) {
    return {};
  }

  const parsedValue = JSON.parse(rawValue) as unknown;

  if (parsedValue === null || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
    throw new Error("Stored event reminder record is not a valid object.");
  }

  const entries = Object.entries(parsedValue);

  for (const [key, value] of entries) {
    if (typeof value !== "string") {
      throw new Error(`Stored event reminder record has invalid value for ${key}.`);
    }
  }

  return Object.fromEntries(entries) as FiredReminderRecord;
};

const writeFiredReminderRecordAsync = async (record: FiredReminderRecord): Promise<void> => {
  await deviceStorage.setItemAsync(eventReminderStoreKey, JSON.stringify(record));
};

const logReminderWarning = (code: string, detail: Record<string, unknown>): void => {
  console.warn(code, detail);
};

const clearStudentReminderStateAsync = async (): Promise<void> => {
  const scheduledRequests = await readScheduledNotificationsAsync();

  await Promise.all(
    scheduledRequests
      .map((request) => request.identifier)
      .filter((identifier) => identifier.startsWith(eventReminderIdentifierPrefix))
      .map((identifier) => cancelScheduledNotificationAsync(identifier))
  );

  await deviceStorage.deleteItemAsync(eventReminderStoreKey);
};

const syncFutureReminderSchedulesAsync = async (
  studentId: string,
  events: StudentEventSummary[],
  now: number,
  language: "fi" | "en"
): Promise<void> => {
  const scheduledRequests = await readScheduledNotificationsAsync();
  const existingIdentifiers = new Set(
    scheduledRequests
      .map((request) => request.identifier)
      .filter((identifier) => identifier.startsWith(`${eventReminderIdentifierPrefix}:${studentId}:`))
  );
  const desiredIdentifiers = new Set<string>();

  for (const event of events) {
    const reminderIdentifier = createReminderIdentifier(studentId, event);
    const reminderDate = createReminderDate(event);

    if (reminderDate.getTime() <= now) {
      continue;
    }

    desiredIdentifiers.add(reminderIdentifier);

    if (existingIdentifiers.has(reminderIdentifier)) {
      continue;
    }

    await scheduleLocalNotificationAtAsync({
      identifier: reminderIdentifier,
      content: {
        title: createReminderTitle(language),
        body: createReminderBody(event, language),
        data: {
          eventId: event.id,
          studentId,
          type: "EVENT_REMINDER_LOCAL",
        },
        sound: "default",
      },
      date: reminderDate,
    });
  }

  for (const identifier of existingIdentifiers) {
    if (desiredIdentifiers.has(identifier)) {
      continue;
    }

    await cancelScheduledNotificationAsync(identifier);
  }
};

const syncImmediateReminderPresentationAsync = async (
  studentId: string,
  events: StudentEventSummary[],
  now: number,
  language: "fi" | "en"
): Promise<void> => {
  const firedRecord = await readFiredReminderRecordAsync();
  const nextRecord: FiredReminderRecord = {};

  for (const [identifier, startAt] of Object.entries(firedRecord)) {
    const startTime = new Date(startAt).getTime();

    if (startTime > now - eventReminderLeadMs) {
      nextRecord[identifier] = startAt;
    }
  }

  for (const event of events) {
    const reminderIdentifier = createReminderIdentifier(studentId, event);
    const reminderDate = createReminderDate(event).getTime();
    const startTime = new Date(event.startAt).getTime();

    if (now < reminderDate || now >= startTime) {
      continue;
    }

    nextRecord[reminderIdentifier] = event.startAt;

    if (firedRecord[reminderIdentifier] === event.startAt) {
      continue;
    }

    await presentLocalNotificationAsync({
      title: createReminderTitle(language),
      body: createReminderBody(event, language),
      data: {
        eventId: event.id,
        studentId,
        type: "EVENT_REMINDER_LOCAL",
      },
      sound: "default",
    });
  }

  await writeFiredReminderRecordAsync(nextRecord);
};

export const StudentEventReminderBridge = (): null => {
  const { session } = useSession();
  const { language } = useUiPreferences();
  const isAppActive = useActiveAppState();
  const now = useCurrentTime(isAppActive);
  const nowMinute = Math.floor(now / 60000);
  const reminderNow = nowMinute * 60000;
  const studentId = session?.user.id ?? null;
  const accessQuery = useSessionAccessQuery({
    userId: studentId ?? "",
    isEnabled: studentId !== null,
  });
  const isStudentSession = accessQuery.data?.area === "student";
  const eventsQuery = useStudentEventsQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null && isStudentSession,
  });
  const reminderEvents = useMemo(() => {
    if (eventsQuery.data === undefined) {
      return [];
    }

    return flattenStudentEventsBuckets(
      rehydrateStudentEventsBuckets(eventsQuery.data, reminderNow)
    ).filter(isReminderCandidate);
  }, [eventsQuery.data, reminderNow]);
  const reminderSignature = useMemo(
    () =>
      reminderEvents
        .map((event) => `${event.id}:${event.startAt}:${event.registrationState}:${event.timelineState}`)
        .join("|"),
    [reminderEvents]
  );

  useEffect(() => {
    if (accessQuery.isLoading || (studentId !== null && isStudentSession)) {
      return;
    }

    void clearStudentReminderStateAsync().catch((error: unknown) => {
      logReminderWarning("student-event-reminder-clear-failed", {
        studentId,
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }, [accessQuery.isLoading, isStudentSession, studentId]);

  useEffect(() => {
    if (studentId === null || !isStudentSession || eventsQuery.isLoading || eventsQuery.error !== null) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      try {
        await syncFutureReminderSchedulesAsync(studentId, reminderEvents, reminderNow, language);
        await syncImmediateReminderPresentationAsync(studentId, reminderEvents, reminderNow, language);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        logReminderWarning("student-event-reminder-sync-failed", {
          studentId,
          reminderCount: reminderEvents.length,
          reminderSignature,
          minute: nowMinute,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [
    eventsQuery.error,
    eventsQuery.isLoading,
    isStudentSession,
    language,
    nowMinute,
    reminderNow,
    reminderEvents,
    reminderSignature,
    studentId,
  ]);

  return null;
};
