import { useEffect, useMemo, useRef } from "react";

import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import type { RealtimePostgresChangesPayload, RealtimeChannel } from "@supabase/supabase-js";

import { studentEventDetailQueryKey } from "@/features/events/student-event-detail";
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
  studentId: string;
  isEnabled: boolean;
};

type RewardProgressEventRealtimeParams = {
  eventId: string;
  studentId: string;
  isEnabled: boolean;
};

type RewardInventoryRealtimeParams = {
  trackedEventIds: string[];
  studentId: string;
  detailEventId: string | null;
  isEnabled: boolean;
};

type RewardInventoryOverviewRealtimeParams = {
  trackedEventIds: string[];
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

type RewardTierRealtimeRow = {
  event_id: string;
};

const MAX_REALTIME_EVENT_FILTER_SIZE = 100;

const createChannelName = (scope: string, eventId: string, studentId: string): string =>
  `${scope}:${eventId}:${studentId}`;

const dedupeTrackedEventIds = (trackedEventIds: string[]): string[] => Array.from(new Set(trackedEventIds));

const chunkEventIds = (trackedEventIds: string[]): string[][] => {
  const eventIdChunks: string[][] = [];

  for (let index = 0; index < trackedEventIds.length; index += MAX_REALTIME_EVENT_FILTER_SIZE) {
    eventIdChunks.push(trackedEventIds.slice(index, index + MAX_REALTIME_EVENT_FILTER_SIZE));
  }

  return eventIdChunks;
};

const createEventFilter = (trackedEventIds: string[]): string => {
  if (trackedEventIds.length === 0) {
    throw new Error("Cannot create a realtime event filter without tracked event ids.");
  }

  if (trackedEventIds.length === 1) {
    return `event_id=eq.${trackedEventIds[0]}`;
  }

  return `event_id=in.(${trackedEventIds.join(",")})`;
};

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

const invalidateRewardOverviewAsync = async (
  queryClient: QueryClient,
  studentId: string
): Promise<void> => {
  await queryClient.invalidateQueries({
    queryKey: studentRewardOverviewQueryKey(studentId),
  });
};

const invalidateRewardProgressAsync = async (
  queryClient: QueryClient,
  studentId: string,
  eventId: string
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: studentRewardEventQueryKey(eventId, studentId),
    }),
    queryClient.invalidateQueries({
      queryKey: studentEventStampCountQueryKey(eventId, studentId),
    }),
  ]);
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

const payloadTouchesTrackedEvents = <Row extends { event_id: string }>(
  payload: RealtimePostgresChangesPayload<Row>,
  trackedEventIds: string[]
): string[] => {
  if (trackedEventIds.length === 0) {
    return [];
  }

  const trackedSet = new Set(trackedEventIds);

  return Array.from(
    new Set(
      getRealtimeRecords(payload)
        .map((record) => record.event_id)
        .filter((eventId) => trackedSet.has(eventId))
    )
  );
};

const invalidateRewardInventoryAsync = async (
  queryClient: QueryClient,
  studentId: string,
  eventIds: string[],
  detailEventId: string | null
): Promise<void> => {
  const invalidations: Promise<void>[] = [];

  eventIds.forEach((eventId) => {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: studentRewardEventQueryKey(eventId, studentId),
      })
    );
  });

  if (detailEventId !== null && eventIds.includes(detailEventId)) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: studentEventDetailQueryKey(detailEventId, studentId),
      })
    );
  }

  await Promise.all(invalidations);
};

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

export const useStudentRewardOverviewRealtime = ({
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

    if (resumedIntoForeground) {
      handleAsyncInvalidation(
        invalidateRewardOverviewAsync(queryClient, studentId),
        "student-reward-overview-catch-up",
        "all-events",
        studentId
      );
    }

    const channel = supabase
      .channel(createChannelName("student-reward-overview", "all-events", studentId))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stamps",
          filter: `student_id=eq.${studentId}`,
        },
        (payload: RealtimePostgresChangesPayload<StampRealtimeRow>) => {
          if (!stampPayloadAffectsRewardProgress(payload, null)) {
            return;
          }

          handleAsyncInvalidation(
            invalidateRewardOverviewAsync(queryClient, studentId),
            "student-reward-overview",
            "all-events",
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
          if (!rewardClaimPayloadAffectsRewardProgress(payload, null)) {
            return;
          }

          handleAsyncInvalidation(
            invalidateRewardOverviewAsync(queryClient, studentId),
            "student-reward-overview",
            "all-events",
            studentId
          );
        }
      );

    subscribeToChannel(channel, "student-reward-overview", "all-events", studentId);

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isEnabled, queryClient, studentId]);
};

export const useStudentRewardProgressRealtime = ({
  eventId,
  studentId,
  isEnabled,
}: RewardProgressEventRealtimeParams): void => {
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
        invalidateRewardProgressAsync(queryClient, studentId, eventId),
        "student-reward-progress-catch-up",
        eventId,
        studentId
      );
    }

    const channel = supabase
      .channel(createChannelName("student-reward-progress", eventId, studentId))
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
            eventId,
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
            eventId,
            studentId
          );
        }
      );

    subscribeToChannel(channel, "student-reward-progress", eventId, studentId);

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, isEnabled, queryClient, studentId]);
};

export const useStudentRewardOverviewInventoryRealtime = ({
  trackedEventIds,
  studentId,
  isEnabled,
}: RewardInventoryOverviewRealtimeParams): void => {
  const queryClient = useQueryClient();
  const hasEnabledOnce = useRef<boolean>(false);
  const previousEnabled = useRef<boolean>(false);
  const normalizedTrackedEventIds = useMemo(() => dedupeTrackedEventIds(trackedEventIds), [trackedEventIds]);
  const trackedIdsKey = normalizedTrackedEventIds.join(",");

  useEffect(() => {
    const resumedIntoForeground = isEnabled && !previousEnabled.current && hasEnabledOnce.current;

    previousEnabled.current = isEnabled;

    if (!isEnabled || normalizedTrackedEventIds.length === 0) {
      return;
    }

    hasEnabledOnce.current = true;

    if (resumedIntoForeground) {
      handleAsyncInvalidation(
        invalidateRewardOverviewAsync(queryClient, studentId),
        "student-reward-overview-inventory-catch-up",
        trackedIdsKey,
        studentId
      );
    }

    const trackedEventIdChunks = chunkEventIds(normalizedTrackedEventIds);
    const channels = trackedEventIdChunks.map((eventIds, index) => {
      const channel = supabase.channel(
        createChannelName("student-reward-overview-inventory", `${trackedIdsKey}:${index}`, studentId)
      );

      channel.on(
        "postgres_changes",
        {
          event: "*" as const,
          schema: "public" as const,
          table: "reward_tiers" as const,
          filter: createEventFilter(eventIds),
        },
        (payload: RealtimePostgresChangesPayload<RewardTierRealtimeRow>) => {
          const affectedEventIds = payloadTouchesTrackedEvents(payload, normalizedTrackedEventIds);

          if (affectedEventIds.length === 0) {
            return;
          }

          handleAsyncInvalidation(
            invalidateRewardOverviewAsync(queryClient, studentId),
            "student-reward-overview-inventory",
            affectedEventIds.join(","),
            studentId
          );
        }
      );

      subscribeToChannel(
        channel,
        "student-reward-overview-inventory",
        `${trackedIdsKey}:${index}`,
        studentId
      );

      return channel;
    });

    return () => {
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [isEnabled, normalizedTrackedEventIds, queryClient, studentId, trackedIdsKey]);
};

export const useStudentRewardInventoryRealtime = ({
  trackedEventIds,
  studentId,
  detailEventId,
  isEnabled,
}: RewardInventoryRealtimeParams): void => {
  const queryClient = useQueryClient();
  const hasEnabledOnce = useRef<boolean>(false);
  const previousEnabled = useRef<boolean>(false);
  const normalizedTrackedEventIds = useMemo(() => dedupeTrackedEventIds(trackedEventIds), [trackedEventIds]);
  const trackedIdsKey = normalizedTrackedEventIds.join(",");

  useEffect(() => {
    const resumedIntoForeground = isEnabled && !previousEnabled.current && hasEnabledOnce.current;

    previousEnabled.current = isEnabled;

    if (!isEnabled || normalizedTrackedEventIds.length === 0) {
      return;
    }

    hasEnabledOnce.current = true;

    if (resumedIntoForeground) {
      handleAsyncInvalidation(
        invalidateRewardInventoryAsync(queryClient, studentId, normalizedTrackedEventIds, detailEventId),
        "student-reward-inventory-catch-up",
        detailEventId ?? trackedIdsKey,
        studentId
      );
    }

    const trackedEventIdChunks = chunkEventIds(normalizedTrackedEventIds);
    const channels = trackedEventIdChunks.map((eventIds, index) => {
      const channel = supabase.channel(
        createChannelName("student-reward-inventory", `${detailEventId ?? trackedIdsKey}:${index}`, studentId)
      );

      channel.on(
        "postgres_changes",
        {
          event: "*" as const,
          schema: "public" as const,
          table: "reward_tiers" as const,
          filter: createEventFilter(eventIds),
        },
        (payload: RealtimePostgresChangesPayload<RewardTierRealtimeRow>) => {
          const affectedEventIds = payloadTouchesTrackedEvents(payload, normalizedTrackedEventIds);

          if (affectedEventIds.length === 0) {
            return;
          }

          handleAsyncInvalidation(
            invalidateRewardInventoryAsync(queryClient, studentId, affectedEventIds, detailEventId),
            "student-reward-inventory",
            affectedEventIds.join(","),
            studentId
          );
        }
      );

      subscribeToChannel(channel, "student-reward-inventory", `${detailEventId ?? trackedIdsKey}:${index}`, studentId);

      return channel;
    });

    return () => {
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [detailEventId, isEnabled, normalizedTrackedEventIds, queryClient, studentId, trackedIdsKey]);
};
