import { assertPostRequest, errorResponse, jsonResponse } from "../_shared/http.ts";
import { readRuntimeEnv } from "../_shared/env.ts";
import { assertScheduledJobRequest } from "../_shared/scheduled.ts";
import { createServiceClient } from "../_shared/supabase.ts";

type EventRow = {
  id: string;
  status: string;
  end_at: string;
};

type StampRow = {
  event_id: string;
  latest_scanned_at: string;
};

type LeaderboardUpdateRow = {
  event_id: string;
  updated_at: string;
};

const completedEventRefreshLookbackDays = 7;

const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const toTimestampMs = (value: string, fieldName: string): number => {
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid timestamp in scheduled leaderboard refresh for ${fieldName}.`);
  }

  return parsed;
};

const latestStampByEvent = (rows: StampRow[]): Map<string, number> => {
  const latest = new Map<string, number>();

  for (const row of rows) {
    latest.set(row.event_id, toTimestampMs(row.latest_scanned_at, "latest_valid_stamp.latest_scanned_at"));
  }

  return latest;
};

const leaderboardUpdatedAtByEvent = (rows: LeaderboardUpdateRow[]): Map<string, number> =>
  new Map(rows.map((row) => [row.event_id, toTimestampMs(row.updated_at, "leaderboard_updates.updated_at")]));

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
    const completedEventCutoffIso = addDays(new Date(), -completedEventRefreshLookbackDays).toISOString();

    const { data: candidateEvents, error: candidateEventsError } = await supabase
      .from("events")
      .select("id,status,end_at")
      .in("status", ["PUBLISHED", "ACTIVE", "COMPLETED"])
      .gte("end_at", completedEventCutoffIso)
      .returns<EventRow[]>();

    if (candidateEventsError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read candidate events.", {
        candidateEventsError: candidateEventsError.message,
      });
    }

    if (candidateEvents.length === 0) {
      return jsonResponse({
        status: "SUCCESS",
        candidateEvents: 0,
        dirtyEvents: 0,
        updatedEvents: 0,
        skippedNoValidStamps: 0,
        skippedAlreadyFresh: 0,
        failedEvents: 0,
      }, 200);
    }

    const candidateEventIds = candidateEvents.map((event) => event.id);
    const [{ data: validStamps, error: validStampsError }, { data: leaderboardUpdates, error: leaderboardUpdatesError }] =
      await Promise.all([
        supabase.rpc("get_latest_valid_stamp_by_events", {
          p_event_ids: candidateEventIds,
        }).returns<StampRow[]>(),
        supabase
          .from("leaderboard_updates")
          .select("event_id,updated_at")
          .in("event_id", candidateEventIds)
          .returns<LeaderboardUpdateRow[]>(),
      ]);

    if (validStampsError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read valid stamps.", {
        validStampsError: validStampsError.message,
      });
    }

    if (leaderboardUpdatesError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read leaderboard updates.", {
        leaderboardUpdatesError: leaderboardUpdatesError.message,
      });
    }

    const latestStampMap = latestStampByEvent(validStamps);
    const leaderboardUpdatedAtMap = leaderboardUpdatedAtByEvent(leaderboardUpdates);

    let skippedNoValidStamps = 0;
    let skippedAlreadyFresh = 0;
    const dirtyEventIds: string[] = [];

    for (const event of candidateEvents) {
      const latestValidStampAt = latestStampMap.get(event.id);

      if (typeof latestValidStampAt === "undefined") {
        skippedNoValidStamps += 1;
        continue;
      }

      const lastLeaderboardRefreshAt = leaderboardUpdatedAtMap.get(event.id);
      if (typeof lastLeaderboardRefreshAt !== "undefined" && latestValidStampAt <= lastLeaderboardRefreshAt) {
        skippedAlreadyFresh += 1;
        continue;
      }

      dirtyEventIds.push(event.id);
    }

    if (dirtyEventIds.length === 0) {
      return jsonResponse({
        status: "SUCCESS",
        candidateEvents: candidateEvents.length,
        dirtyEvents: 0,
        updatedEvents: 0,
        skippedNoValidStamps,
        skippedAlreadyFresh,
        failedEvents: 0,
      }, 200);
    }

    const updatedEventIds: string[] = [];
    const failedEventIds: string[] = [];

    for (const eventId of dirtyEventIds) {
      const { error: refreshError } = await supabase.rpc("update_event_leaderboard", {
        p_event_id: eventId,
      });

      if (refreshError !== null) {
        console.error("leaderboard_refresh_failed", {
          eventId,
          message: refreshError.message,
          code: refreshError.code,
        });
        failedEventIds.push(eventId);
        continue;
      }

      updatedEventIds.push(eventId);
    }

    return jsonResponse({
      status: failedEventIds.length > 0 ? "PARTIAL_SUCCESS" : "SUCCESS",
      candidateEvents: candidateEvents.length,
      dirtyEvents: dirtyEventIds.length,
      updatedEvents: updatedEventIds.length,
      skippedNoValidStamps,
      skippedAlreadyFresh,
      failedEvents: failedEventIds.length,
      updatedEventIds,
      failedEventIds,
    }, 200);
  } catch (error) {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to run scheduled leaderboard refresh.", {
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
});
