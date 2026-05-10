import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import type * as ExpoNotifications from "expo-notifications";
import { useQueryClient } from "@tanstack/react-query";

import {
  activeAnnouncementsQueryKey,
  announcementDetailQueryKey,
  announcementFeedQueryKey,
} from "@/features/announcements/announcements";
import { useSessionAccessQuery } from "@/features/auth/session-access";
import { useIsScannerProvisioningActive } from "@/features/scanner/scanner-provisioning-state";
import { readNotificationsModuleAsync } from "@/lib/push";
import { useSession } from "@/providers/session-provider";

type AnnouncementPushPayload = {
  announcementId: string;
  recipientUserId: string | null;
  type: "ANNOUNCEMENT";
};

type RewardUnlockedPushPayload = {
  eventId: string | null;
  recipientUserId: string | null;
  rewardTierId: string | null;
  type: "REWARD_STOCK_CHANGED_LOCAL" | "REWARD_UNLOCKED" | "REWARD_UNLOCKED_LOCAL";
};

type EventReminderPushPayload = {
  eventId: string | null;
  recipientUserId: string | null;
  type: "EVENT_REMINDER" | "EVENT_REMINDER_LOCAL";
};

type SupportReplyPushPayload = {
  area: "BUSINESS" | "CLUB" | "STUDENT" | null;
  recipientUserId: string | null;
  supportRequestId: string | null;
  type: "SUPPORT_REPLY";
};

type PromotionPushPayload = {
  eventId: string | null;
  promotionId: string | null;
  recipientUserId: string | null;
  type: "PROMOTION";
};

type RoutedPushPayload =
  | AnnouncementPushPayload
  | RewardUnlockedPushPayload
  | EventReminderPushPayload
  | SupportReplyPushPayload
  | PromotionPushPayload;

type PushResponseKey = {
  key: string;
  recordedAt: number;
};

const duplicateResponseWindowMs = 1_500;

const readStringField = (record: Record<string, unknown>, field: string): string | null =>
  typeof record[field] === "string" && record[field].length > 0 ? record[field] : null;

const readSupportArea = (value: unknown): SupportReplyPushPayload["area"] => {
  if (value === "BUSINESS" || value === "CLUB" || value === "STUDENT") {
    return value;
  }

  return null;
};

const readRoutedPushPayloadFromData = (rawData: unknown): RoutedPushPayload | null => {
  if (rawData === null || typeof rawData !== "object" || Array.isArray(rawData)) {
    return null;
  }

  const record = rawData as Record<string, unknown>;
  const type = record.type;

  if (type === "ANNOUNCEMENT") {
    const announcementId = readStringField(record, "announcementId");

    if (announcementId === null) {
      return null;
    }

    return {
      announcementId,
      recipientUserId: readStringField(record, "recipientUserId"),
      type,
    };
  }

  if (type === "REWARD_UNLOCKED" || type === "REWARD_UNLOCKED_LOCAL" || type === "REWARD_STOCK_CHANGED_LOCAL") {
    return {
      eventId: readStringField(record, "eventId"),
      recipientUserId: readStringField(record, "recipientUserId") ?? readStringField(record, "studentId"),
      rewardTierId: readStringField(record, "rewardTierId"),
      type,
    };
  }

  if (type === "EVENT_REMINDER" || type === "EVENT_REMINDER_LOCAL") {
    return {
      eventId: readStringField(record, "eventId"),
      recipientUserId: readStringField(record, "recipientUserId") ?? readStringField(record, "studentId"),
      type,
    };
  }

  if (type === "SUPPORT_REPLY") {
    return {
      area: readSupportArea(record.area),
      recipientUserId: readStringField(record, "recipientUserId") ?? readStringField(record, "userId"),
      supportRequestId: readStringField(record, "supportRequestId"),
      type,
    };
  }

  if (type === "PROMOTION") {
    return {
      eventId: readStringField(record, "eventId"),
      promotionId: readStringField(record, "promotionId"),
      recipientUserId: readStringField(record, "recipientUserId") ?? readStringField(record, "studentId"),
      type,
    };
  }

  return null;
};

const readRoutedPushPayload = (
  response: ExpoNotifications.NotificationResponse
): RoutedPushPayload | null => readRoutedPushPayloadFromData(response.notification.request.content.data);

const isPersonalizedPushPayload = (payload: RoutedPushPayload): boolean =>
  payload.type !== "ANNOUNCEMENT";

const createHandledResponseKey = (
  response: ExpoNotifications.NotificationResponse,
  payload: RoutedPushPayload
): string => {
  const notificationIdentifier = response.notification.request.identifier;

  if (typeof notificationIdentifier === "string" && notificationIdentifier.length > 0) {
    return notificationIdentifier;
  }

  if (payload.type === "ANNOUNCEMENT") {
    return `${payload.type}:${payload.announcementId}`;
  }

  if (
    payload.type === "REWARD_UNLOCKED" ||
    payload.type === "REWARD_UNLOCKED_LOCAL" ||
    payload.type === "REWARD_STOCK_CHANGED_LOCAL"
  ) {
    return `${payload.type}:${payload.eventId ?? "no-event"}:${payload.rewardTierId ?? "no-tier"}`;
  }

  if (payload.type === "EVENT_REMINDER" || payload.type === "EVENT_REMINDER_LOCAL") {
    return `${payload.type}:${payload.eventId ?? "no-event"}`;
  }

  if (payload.type === "SUPPORT_REPLY") {
    return `${payload.type}:${payload.supportRequestId ?? "no-request"}`;
  }

  if (payload.type === "PROMOTION") {
    return `${payload.type}:${payload.promotionId ?? "no-promotion"}:${payload.eventId ?? "no-event"}`;
  }

  return payload.type;
};

const resolveAnnouncementDetailPathname = (
  area: "business" | "club" | "student" | "unsupported"
): "/business/announcement-detail" | "/club/announcement-detail" | "/student/announcement-detail" | null => {
  if (area === "business") {
    return "/business/announcement-detail";
  }

  if (area === "club") {
    return "/club/announcement-detail";
  }

  if (area === "student") {
    return "/student/announcement-detail";
  }

  return null;
};

const resolveAnnouncementReturnTo = (
  area: "business" | "club" | "student" | "unsupported"
): "/business/updates" | "/club/announcements" | "/student/updates" | null => {
  if (area === "business") {
    return "/business/updates";
  }

  if (area === "club") {
    return "/club/announcements";
  }

  if (area === "student") {
    return "/student/updates";
  }

  return null;
};

const resolveProfilePathname = (
  area: "business" | "club" | "student" | "unsupported"
): "/business/profile" | "/club/profile" | "/student/profile" | null => {
  if (area === "business") {
    return "/business/profile";
  }

  if (area === "club") {
    return "/club/profile";
  }

  if (area === "student") {
    return "/student/profile";
  }

  return null;
};

export const AnnouncementPushRouterBridge = (): null => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, isLoading } = useSession();
  const userId = session?.user.id ?? null;
  const userIdRef = useRef<string | null>(userId);
  const previousUserIdRef = useRef<string | null>(userId);
  const isScannerProvisioningActive = useIsScannerProvisioningActive();
  const accessQuery = useSessionAccessQuery({
    isEnabled: userId !== null && !isScannerProvisioningActive,
    userId: userId ?? "",
  });
  const [pendingPayload, setPendingPayload] = useState<RoutedPushPayload | null>(null);
  const handledResponseKeyRef = useRef<PushResponseKey | null>(null);

  useEffect(() => {
    if (previousUserIdRef.current !== userId) {
      setPendingPayload(null);
      handledResponseKeyRef.current = null;
      previousUserIdRef.current = userId;
    }

    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    let isMounted = true;
    let cleanup = () => {};

    const queuePayload = (response: ExpoNotifications.NotificationResponse): void => {
      const payload = readRoutedPushPayload(response);

      if (payload === null) {
        return;
      }

      const currentUserId = userIdRef.current;

      if (isPersonalizedPushPayload(payload)) {
        if (payload.recipientUserId === null) {
          return;
        }

        if (currentUserId !== null && payload.recipientUserId !== currentUserId) {
          return;
        }
      }

      if (
        payload.type === "ANNOUNCEMENT" &&
        payload.recipientUserId !== null &&
        currentUserId !== null &&
        payload.recipientUserId !== currentUserId
      ) {
        return;
      }

      const responseKey = createHandledResponseKey(response, payload);
      const now = Date.now();
      const lastHandledResponse = handledResponseKeyRef.current;

      if (
        lastHandledResponse !== null &&
        lastHandledResponse.key === responseKey &&
        now - lastHandledResponse.recordedAt < duplicateResponseWindowMs
      ) {
        return;
      }

      handledResponseKeyRef.current = {
        key: responseKey,
        recordedAt: now,
      };
      setPendingPayload(payload);
    };

    const invalidateAnnouncementQueries = (targetUserId: string, announcementId: string): void => {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: activeAnnouncementsQueryKey(targetUserId),
        }),
        queryClient.invalidateQueries({
          queryKey: announcementFeedQueryKey(targetUserId),
        }),
        queryClient.invalidateQueries({
          queryKey: announcementDetailQueryKey(targetUserId, announcementId),
        }),
      ]);
    };

    void readNotificationsModuleAsync()
      .then((notificationsModule) => {
        if (!isMounted || notificationsModule === null) {
          return;
        }

        const lastResponse = notificationsModule.getLastNotificationResponse();

        if (lastResponse !== null) {
          queuePayload(lastResponse);
        }

        const notificationSubscription = notificationsModule.addNotificationReceivedListener((notification) => {
          const payload = readRoutedPushPayloadFromData(notification.request.content.data);
          const currentUserId = userIdRef.current;

          if (payload?.type === "ANNOUNCEMENT" && currentUserId !== null) {
            invalidateAnnouncementQueries(currentUserId, payload.announcementId);
          }
        });

        const responseSubscription = notificationsModule.addNotificationResponseReceivedListener((response) => {
          queuePayload(response);
        });

        cleanup = () => {
          notificationSubscription.remove();
          responseSubscription.remove();
        };
      })
      .catch((error: unknown) => {
        console.warn("notification_push_router_bridge_failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [queryClient]);

  useEffect(() => {
    if (pendingPayload === null || isLoading || accessQuery.isLoading || isScannerProvisioningActive) {
      return;
    }

    if (accessQuery.data?.isBusinessScannerOnly === true) {
      setPendingPayload(null);
      return;
    }

    const area = accessQuery.data?.area ?? "unsupported";

    if (isPersonalizedPushPayload(pendingPayload) && pendingPayload.recipientUserId !== userId) {
      setPendingPayload(null);
      return;
    }

    if (pendingPayload.type === "ANNOUNCEMENT") {
      if (
        pendingPayload.recipientUserId !== null &&
        userId !== null &&
        pendingPayload.recipientUserId !== userId
      ) {
        setPendingPayload(null);
        return;
      }

      const pathname = resolveAnnouncementDetailPathname(area);
      const returnTo = resolveAnnouncementReturnTo(area);

      if (pathname === null || returnTo === null) {
        setPendingPayload(null);
        return;
      }

      router.push({
        pathname,
        params: {
          announcementId: pendingPayload.announcementId,
          returnTo,
        },
      });
      setPendingPayload(null);
      return;
    }

    if (
      pendingPayload.type === "REWARD_UNLOCKED" ||
      pendingPayload.type === "REWARD_UNLOCKED_LOCAL" ||
      pendingPayload.type === "REWARD_STOCK_CHANGED_LOCAL"
    ) {
      if (area !== "student") {
        setPendingPayload(null);
        return;
      }

      if (pendingPayload.recipientUserId !== null && pendingPayload.recipientUserId !== userId) {
        setPendingPayload(null);
        return;
      }

      if (pendingPayload.eventId !== null) {
        router.push({
          pathname: "/student/events/[eventId]",
          params: { eventId: pendingPayload.eventId },
        });
      } else {
        router.push("/student/events");
      }
      setPendingPayload(null);
      return;
    }

    if (pendingPayload.type === "EVENT_REMINDER" || pendingPayload.type === "EVENT_REMINDER_LOCAL") {
      if (area !== "student") {
        setPendingPayload(null);
        return;
      }

      if (pendingPayload.recipientUserId !== null && pendingPayload.recipientUserId !== userId) {
        setPendingPayload(null);
        return;
      }

      if (pendingPayload.eventId !== null) {
        router.push({
          pathname: "/student/events/[eventId]",
          params: { eventId: pendingPayload.eventId },
        });
      } else {
        router.push("/student/events");
      }
      setPendingPayload(null);
      return;
    }

    if (pendingPayload.type === "PROMOTION") {
      if (area !== "student") {
        setPendingPayload(null);
        return;
      }

      if (pendingPayload.recipientUserId !== null && pendingPayload.recipientUserId !== userId) {
        setPendingPayload(null);
        return;
      }

      if (pendingPayload.eventId !== null) {
        router.push({
          pathname: "/student/events/[eventId]",
          params: { eventId: pendingPayload.eventId },
        });
      } else {
        router.push("/student/updates");
      }
      setPendingPayload(null);
      return;
    }

    const supportAreaPath = resolveProfilePathname(area);

    if (pendingPayload.type === "SUPPORT_REPLY") {
      if (pendingPayload.recipientUserId !== null && pendingPayload.recipientUserId !== userId) {
        setPendingPayload(null);
        return;
      }
    }

    if (supportAreaPath === null) {
      setPendingPayload(null);
      return;
    }

    router.push(supportAreaPath);
    setPendingPayload(null);
  }, [
    accessQuery.data?.area,
    accessQuery.data?.isBusinessScannerOnly,
    accessQuery.isLoading,
    isLoading,
    isScannerProvisioningActive,
    pendingPayload,
    router,
    userId,
  ]);

  return null;
};
