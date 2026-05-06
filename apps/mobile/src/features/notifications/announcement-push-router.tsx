import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import type * as ExpoNotifications from "expo-notifications";

import { useSessionAccessQuery } from "@/features/auth/session-access";
import { readNotificationsModuleAsync } from "@/lib/push";
import { useSession } from "@/providers/session-provider";

type AnnouncementPushPayload = {
  announcementId: string;
  type: "ANNOUNCEMENT";
};

type AnnouncementResponseKey = {
  key: string;
  recordedAt: number;
};

const duplicateResponseWindowMs = 1_500;

const readAnnouncementPushPayload = (
  response: ExpoNotifications.NotificationResponse
): AnnouncementPushPayload | null => {
  const rawData = response.notification.request.content.data;

  if (rawData === null || typeof rawData !== "object" || Array.isArray(rawData)) {
    return null;
  }

  const announcementId = typeof rawData.announcementId === "string" ? rawData.announcementId : null;

  if (announcementId === null || rawData.type !== "ANNOUNCEMENT") {
    return null;
  }

  return {
    announcementId,
    type: "ANNOUNCEMENT",
  };
};

const createHandledResponseKey = (
  response: ExpoNotifications.NotificationResponse,
  payload: AnnouncementPushPayload
): string => {
  const notificationIdentifier = response.notification.request.identifier;

  if (typeof notificationIdentifier === "string" && notificationIdentifier.length > 0) {
    return notificationIdentifier;
  }

  return `${payload.type}:${payload.announcementId}`;
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

export const AnnouncementPushRouterBridge = (): null => {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const userId = session?.user.id ?? null;
  const accessQuery = useSessionAccessQuery({
    isEnabled: userId !== null,
    userId: userId ?? "",
  });
  const [pendingPayload, setPendingPayload] = useState<AnnouncementPushPayload | null>(null);
  const handledResponseKeyRef = useRef<AnnouncementResponseKey | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    let isMounted = true;
    let cleanup = () => {};

    const queuePayload = (response: ExpoNotifications.NotificationResponse): void => {
      const payload = readAnnouncementPushPayload(response);

      if (payload === null) {
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

    void readNotificationsModuleAsync()
      .then((notificationsModule) => {
        if (!isMounted || notificationsModule === null) {
          return;
        }

        const lastResponse = notificationsModule.getLastNotificationResponse();

        if (lastResponse !== null) {
          queuePayload(lastResponse);
        }

        const responseSubscription = notificationsModule.addNotificationResponseReceivedListener((response) => {
          queuePayload(response);
        });

        cleanup = () => {
          responseSubscription.remove();
        };
      })
      .catch((error: unknown) => {
        console.warn("announcement_push_router_bridge_failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      isMounted = false;
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (pendingPayload === null || isLoading || accessQuery.isLoading) {
      return;
    }

    const area = accessQuery.data?.area ?? "unsupported";
    const pathname = resolveAnnouncementDetailPathname(area);
    const returnTo = resolveAnnouncementReturnTo(area);

    if (pathname === null || returnTo === null) {
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
  }, [accessQuery.data?.area, accessQuery.isLoading, isLoading, pendingPayload, router]);

  return null;
};
