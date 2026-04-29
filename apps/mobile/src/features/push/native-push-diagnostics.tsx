import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import * as Device from "expo-device";
import type * as ExpoNotifications from "expo-notifications";
import { AppState, Platform } from "react-native";

import {
  readNotificationsModuleAsync,
  readPushPermissionStateAsync,
  readPushProjectId,
  readPushRuntimeMode,
} from "@/lib/push";
import { useSession } from "@/providers/session-provider";
import type {
  NativePushDiagnostics,
  PushNotificationCapture,
} from "@/types/app";

type NativePushDiagnosticsContextValue = {
  diagnostics: NativePushDiagnostics;
  clearCapturedPushActivity: () => void;
  refreshPushPermissionStateAsync: () => Promise<void>;
};

const NativePushDiagnosticsContext = createContext<NativePushDiagnosticsContextValue | null>(null);

const createInitialNativePushDiagnostics = (): NativePushDiagnostics => ({
  runtime: readPushRuntimeMode(),
  permissionState: Platform.OS === "web" ? "unavailable" : "undetermined",
  isPhysicalDevice: Device.isDevice,
  projectId: readPushProjectId(),
  lastNotification: null,
  lastNotificationResponse: null,
});

const readOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return value;
};

const readNotificationDataRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  return value as Record<string, unknown>;
};

const hasTriggerType = (
  trigger: ExpoNotifications.NotificationRequest["trigger"] | null | undefined
): trigger is ExpoNotifications.NotificationRequest["trigger"] & { type: string } =>
  trigger !== null && typeof trigger !== "undefined" && "type" in trigger && typeof trigger.type === "string";

const readNotificationSource = (
  trigger: ExpoNotifications.NotificationRequest["trigger"] | null | undefined
): PushNotificationCapture["source"] => {
  if (trigger === null || typeof trigger === "undefined") {
    return "local";
  }

  if (!hasTriggerType(trigger)) {
    return "unknown";
  }

  if (trigger.type === "push") {
    return "remote";
  }

  return "local";
};

const readNotificationTriggerType = (
  trigger: ExpoNotifications.NotificationRequest["trigger"] | null | undefined
): string => {
  if (trigger === null || typeof trigger === "undefined") {
    return "immediate";
  }

  if (!hasTriggerType(trigger) || trigger.type.length === 0) {
    return "unknown";
  }

  return trigger.type;
};

const createNotificationCapture = (
  notification: ExpoNotifications.Notification,
  capturedAt: string,
  actionIdentifier: string | null
): PushNotificationCapture => {
  const data = readNotificationDataRecord(notification.request.content.data);

  return {
    identifier: notification.request.identifier,
    source: readNotificationSource(notification.request.trigger),
    triggerType: readNotificationTriggerType(notification.request.trigger),
    title: readOptionalString(notification.request.content.title),
    body: readOptionalString(notification.request.content.body),
    dataType: readOptionalString(data.type),
    eventId: readOptionalString(data.eventId),
    rewardTierId: readOptionalString(data.rewardTierId),
    actionIdentifier,
    capturedAt,
  };
};

const createNotificationResponseCapture = (
  response: ExpoNotifications.NotificationResponse,
  capturedAt: string
): PushNotificationCapture =>
  createNotificationCapture(response.notification, capturedAt, response.actionIdentifier);

const logNativePushDiagnosticsWarning = (
  code: string,
  detail: Record<string, unknown>
): void => {
  console.warn(code, detail);
};

export const NativePushDiagnosticsProvider = ({ children }: PropsWithChildren) => {
  const { session } = useSession();
  const [diagnostics, setDiagnostics] = useState<NativePushDiagnostics>(createInitialNativePushDiagnostics);
  const previousUserIdRef = useRef<string | null>(session?.user.id ?? null);

  const refreshPushPermissionStateAsync = useCallback(async (): Promise<void> => {
    const permissionState = await readPushPermissionStateAsync();

    setDiagnostics((currentDiagnostics) => ({
      ...currentDiagnostics,
      runtime: readPushRuntimeMode(),
      permissionState,
      isPhysicalDevice: Device.isDevice,
      projectId: readPushProjectId(),
    }));
  }, []);

  const clearCapturedPushActivity = useCallback((): void => {
    if (Platform.OS !== "web") {
      void readNotificationsModuleAsync()
        .then((notificationsModule) => {
          if (notificationsModule === null) {
            return;
          }

          notificationsModule.clearLastNotificationResponse();
        })
        .catch((error) => {
          logNativePushDiagnosticsWarning("native-push-diagnostics-clear-failed", {
            message: error instanceof Error ? error.message : String(error),
          });
        });
    }

    setDiagnostics((currentDiagnostics) => ({
      ...currentDiagnostics,
      lastNotification: null,
      lastNotificationResponse: null,
    }));
  }, []);

  useEffect(() => {
    void refreshPushPermissionStateAsync().catch((error) => {
      logNativePushDiagnosticsWarning("native-push-diagnostics-refresh-failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }, [refreshPushPermissionStateAsync]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        return;
      }

      void refreshPushPermissionStateAsync().catch((error) => {
        logNativePushDiagnosticsWarning("native-push-diagnostics-appstate-refresh-failed", {
          nextState,
          message: error instanceof Error ? error.message : String(error),
        });
      });
    });

    return () => {
      subscription.remove();
    };
  }, [refreshPushPermissionStateAsync]);

  useEffect(() => {
    const currentUserId = session?.user.id ?? null;

    if (previousUserIdRef.current === currentUserId) {
      return;
    }

    previousUserIdRef.current = currentUserId;

    if (Platform.OS !== "web") {
      void readNotificationsModuleAsync()
        .then((notificationsModule) => {
          if (notificationsModule === null) {
            return;
          }

          notificationsModule.clearLastNotificationResponse();
        })
        .catch((error) => {
          logNativePushDiagnosticsWarning("native-push-diagnostics-session-reset-failed", {
            currentUserId,
            message: error instanceof Error ? error.message : String(error),
          });
        });
    }

    setDiagnostics((currentDiagnostics) => ({
      ...currentDiagnostics,
      lastNotification: null,
      lastNotificationResponse: null,
    }));
  }, [session?.user.id]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    let isMounted = true;
    let cleanup = () => {};

    void readNotificationsModuleAsync()
      .then((notificationsModule) => {
        if (!isMounted || notificationsModule === null) {
          return;
        }

        try {
          const lastResponse = notificationsModule.getLastNotificationResponse();

          if (lastResponse !== null) {
            const responseCapture = createNotificationResponseCapture(
              lastResponse,
              new Date().toISOString()
            );

            setDiagnostics((currentDiagnostics) => ({
              ...currentDiagnostics,
              lastNotification: responseCapture,
              lastNotificationResponse: responseCapture,
            }));
          }
        } catch (error) {
          logNativePushDiagnosticsWarning("native-push-diagnostics-bootstrap-response-failed", {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        const notificationSubscription = notificationsModule.addNotificationReceivedListener((notification) => {
          setDiagnostics((currentDiagnostics) => ({
            ...currentDiagnostics,
            lastNotification: createNotificationCapture(notification, new Date().toISOString(), null),
          }));
        });

        const responseSubscription = notificationsModule.addNotificationResponseReceivedListener((response) => {
          const responseCapture = createNotificationResponseCapture(
            response,
            new Date().toISOString()
          );

          setDiagnostics((currentDiagnostics) => ({
            ...currentDiagnostics,
            lastNotification: responseCapture,
            lastNotificationResponse: responseCapture,
          }));
        });

        cleanup = () => {
          notificationSubscription.remove();
          responseSubscription.remove();
        };
      })
      .catch((error) => {
        logNativePushDiagnosticsWarning("native-push-diagnostics-module-load-failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      isMounted = false;
      cleanup();
    };
  }, []);

  const value = useMemo<NativePushDiagnosticsContextValue>(
    () => ({
      diagnostics,
      clearCapturedPushActivity,
      refreshPushPermissionStateAsync,
    }),
    [clearCapturedPushActivity, diagnostics, refreshPushPermissionStateAsync]
  );

  return (
    <NativePushDiagnosticsContext.Provider value={value}>
      {children}
    </NativePushDiagnosticsContext.Provider>
  );
};

export const useNativePushDiagnostics = (): NativePushDiagnosticsContextValue => {
  const value = useContext(NativePushDiagnosticsContext);

  if (value === null) {
    throw new Error("useNativePushDiagnostics must be used inside NativePushDiagnosticsProvider.");
  }

  return value;
};
