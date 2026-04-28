import { useEffect, useRef } from "react";

import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import type { RealtimePostgresChangesPayload, RealtimeChannel } from "@supabase/supabase-js";

import { eventLeaderboardQueryKey } from "@/features/leaderboard/student-leaderboard";
import { studentEventStampCountQueryKey } from "@/features/qr/student-qr";
import { studentRewardEventQueryKey, studentRewardOverviewQueryKey } from "@/features/rewards/student-rewards";
import { supabase } from "@/lib/supabase";

type RealtimeHookParams = {
  eventId: string;
  studentId: string;
  isEnabled: boolean;
};

type RewardProgressRealtimeParams = {
  eventId: string | null;
  studentId: string;
  isEnabled: boolean;
};

type StampRealtimeRow = {
  event_id: string;
  student_id: string;
  validation_status: string | null;
};

type RewardClaimRealtimeRow = {
  event_id: string;
  student_id: string;
};

const createChannelName = (scope: string, eventId: string, studentId: string): string =>
  `${scope}:${eventId}:${studentId}`;

const logRealtimeWarning = (code: string, detail: Record<string, unknown>): void => {
  console.warn(code, detail);
};

const invalidateLeaderboardAsync = async (
  queryClient: QueryClient,
  eventId: string,
  studentId: string
): Promise<void> => {
  await queryClient.invalidateQueries({
    queryKey: eventLeaderboardQueryKey(eventId, studentId),
  });
};

const invalidateRewardProgressAsync = async (
  queryClient: QueryClient,
  studentId: string,
  eventId: string | null
): Promise<void> => {
  const invalidations = [
    queryClient.invalidateQueries({
      queryKey: studentRewardOverviewQueryKey(studentId),
    }),
  ];

  if (eventId !== null) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: studentRewardEventQueryKey(eventId, studentId),
      })
    );
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: studentEventStampCountQueryKey(eventId, studentId),
      })
    );
  }

  await Promise.all(invalidations);
};

const subscribeToChannel = (
  channel: RealtimeChannel,
  scope: string,
  eventId: string,
  studentId: string
): void => {
  channel.subscribe((status, error) => {
    if (status !== "CHANNEL_ERROR" && status !== "TIMED_OUT") {
      return;
    }

    logRealtimeWarning("mobile-realtime-channel-warning", {
      scope,
      status,
      eventId,
      studentId,
      message: error?.message ?? null,
    });
  });
};

const handleAsyncInvalidation = (
  promise: Promise<void>,
  scope: string,
  eventId: string,
  studentId: string
): void => {
  void promise.catch((error) => {
    logRealtimeWarning("mobile-realtime-invalidation-failed", {
      scope,
      eventId,
      studentId,
      message: error instanceof Error ? error.message : String(error),
    });
  });
};

const getRealtimeRecords = <Row extends Record<string, unknown>>(
  payload: RealtimePostgresChangesPayload<Row>
): Row[] =>
  [payload.new, payload.old].filter(
    (value): value is Row => typeof value === "object" && value !== null && Object.keys(value).length > 0
  );

const payloadTouchesEvent = <Row extends { event_id: string }>(
  payload: RealtimePostgresChangesPayload<Row>,
  eventId: string | null
): boolean => {
  if (eventId === null) {
    return true;
  }

  return getRealtimeRecords(payload).some((record) => record.event_id === eventId);
};

const stampPayloadAffectsRewardProgress = (
  payload: RealtimePostgresChangesPayload<StampRealtimeRow>,
  eventId: string | null
): boolean =>
  payloadTouchesEvent(payload, eventId) &&
  getRealtimeRecords(payload).some((record) => record.validation_status === "VALID");

const rewardClaimPayloadAffectsRewardProgress = (
  payload: RealtimePostgresChangesPayload<RewardClaimRealtimeRow>,
  eventId: string | null
): boolean => payloadTouchesEvent(payload, eventId);

export const useStudentEventLeaderboardRealtime = ({
  eventId,
  studentId,
  isEnabled,
}: RealtimeHookParams): void => {
  const queryClient = useQueryClient();
  const hasEnabledOnce = useRef<boolean>(false);
  const previousEnabled = useRef<boolean>(false);

  useEffect(() => {
    const resumedIntoForeground = isEnabled && !previousEnabled.current && hasEnabledOnce.current;

    previousEnabled.current = isEnabled;

    if (!isEnabled) {
      return;
    }

    hasEnabledOnce.current = true;

    if (resumedIntoForeground) {
      handleAsyncInvalidation(
        invalidateLeaderboardAsync(queryClient, eventId, studentId),
        "student-leaderboard-catch-up",
        eventId,
        studentId
      );
    }

    const channel = supabase
      .channel(createChannelName("student-leaderboard", eventId, studentId))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leaderboard_updates",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          handleAsyncInvalidation(
            invalidateLeaderboardAsync(queryClient, eventId, studentId),
            "student-leaderboard",
            eventId,
            studentId
          );
        }
      );

    subscribeToChannel(channel, "student-leaderboard", eventId, studentId);

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, isEnabled, queryClient, studentId]);
};

export const useStudentRewardProgressRealtime = ({
  eventId,
  studentId,
  isEnabled,
}: RewardProgressRealtimeParams): void => {
  const queryClient = useQueryClient();
  const hasEnabledOnce = useRef<boolean>(false);
  const previousEnabled = useRef<boolean>(false);

  useEffect(() => {
    const resumedIntoForeground = isEnabled && !previousEnabled.current && hasEnabledOnce.current;

    previousEnabled.current = isEnabled;

    if (!isEnabled) {
      return;
    }

    hasEnabledOnce.current = true;

    const scopeEventId = eventId ?? "all-events";

    if (resumedIntoForeground) {
      handleAsyncInvalidation(
        invalidateRewardProgressAsync(queryClient, studentId, eventId),
        "student-reward-progress-catch-up",
        scopeEventId,
        studentId
      );
    }

    const channel = supabase
      .channel(createChannelName("student-reward-progress", scopeEventId, studentId))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stamps",
          filter: `student_id=eq.${studentId}`,
        },
        (payload: RealtimePostgresChangesPayload<StampRealtimeRow>) => {
          if (!stampPayloadAffectsRewardProgress(payload, eventId)) {
            return;
          }

          handleAsyncInvalidation(
            invalidateRewardProgressAsync(queryClient, studentId, eventId),
            "student-reward-progress",
            scopeEventId,
            studentId
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reward_claims",
          filter: `student_id=eq.${studentId}`,
        },
        (payload: RealtimePostgresChangesPayload<RewardClaimRealtimeRow>) => {
          if (!rewardClaimPayloadAffectsRewardProgress(payload, eventId)) {
            return;
          }

          handleAsyncInvalidation(
            invalidateRewardProgressAsync(queryClient, studentId, eventId),
            "student-reward-progress",
            scopeEventId,
            studentId
          );
        }
      );

    subscribeToChannel(channel, "student-reward-progress", scopeEventId, studentId);

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, isEnabled, queryClient, studentId]);
};
