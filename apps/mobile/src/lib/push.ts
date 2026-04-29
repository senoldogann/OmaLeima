import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import type * as ExpoNotifications from "expo-notifications";

import { publicEnv } from "@/lib/env";
import type {
  PushPermissionState,
  PushPreparationResult,
  PushRuntimeMode,
} from "@/types/app";

type NotificationsModule = typeof ExpoNotifications;

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;
const IOS_PROVISIONAL_STATUS = 3;

const createExpoGoAndroidDetail = (): string =>
  "Expo Go on Android SDK 53+ does not expose expo-notifications remote APIs. Use the emulator for app-flow smoke or install a development build for push checks.";

const loadNotificationsModuleAsync = async (): Promise<NotificationsModule | null> => {
  if (Platform.OS === "web") {
    return null;
  }

  if (Platform.OS === "android" && isExpoGoRuntime()) {
    return null;
  }

  if (notificationsModulePromise !== null) {
    return notificationsModulePromise;
  }

  notificationsModulePromise = import("expo-notifications")
    .then((module) => {
      module.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      return module;
    })
    .catch((error: unknown) => {
      if (Platform.OS === "android" && isExpoGoRuntime()) {
        console.warn("push-notifications-module-unavailable", {
          platform: Platform.OS,
          runtime: readPushRuntimeMode(),
          message: error instanceof Error ? error.message : String(error),
        });

        return null;
      }

      throw error;
    });

  return notificationsModulePromise;
};

const ensureAndroidNotificationChannelAsync = async (): Promise<void> => {
  if (Platform.OS !== "android") {
    return;
  }

  const notificationsModule = await loadNotificationsModuleAsync();

  if (notificationsModule === null) {
    return;
  }

  await notificationsModule.setNotificationChannelAsync("default", {
    name: "default",
    importance: notificationsModule.AndroidImportance.DEFAULT,
  });
};

const hasExpoMetroHostUri = (): boolean => {
  const hostUri = Constants.expoConfig?.hostUri;

  return typeof hostUri === "string" && hostUri.length > 0;
};

const isExpoGoRuntime = (): boolean =>
  Constants.expoGoConfig !== null || Constants.appOwnership === "expo";

const hasDevelopmentBuildSignals = (): boolean =>
  __DEV__ && Device.isDevice && hasExpoMetroHostUri() && readPushProjectId() !== null && !isExpoGoRuntime();

export const readPushProjectId = (): string | null => {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    publicEnv.EXPO_PUBLIC_EAS_PROJECT_ID ??
    null;

  if (typeof projectId !== "string" || projectId.length === 0) {
    return null;
  }

  return projectId;
};

const hasGrantedNotificationPermission = (status: ExpoNotifications.NotificationPermissionsStatus): boolean =>
  status.granted || status.ios?.status === IOS_PROVISIONAL_STATUS;

const readPermissionState = (status: ExpoNotifications.NotificationPermissionsStatus): PushPermissionState => {
  if (status.ios?.status === IOS_PROVISIONAL_STATUS) {
    return "provisional";
  }

  if (status.status === "granted") {
    return "granted";
  }

  if (status.status === "denied") {
    return "denied";
  }

  return "undetermined";
};

export const readPushRuntimeMode = (): PushRuntimeMode => {
  if (Platform.OS === "web") {
    return "web";
  }

  if (Constants.executionEnvironment === ExecutionEnvironment.Standalone) {
    return "standalone";
  }

  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    if (isExpoGoRuntime()) {
      return "expo-go";
    }

    return "development-build";
  }

  if (Constants.executionEnvironment === ExecutionEnvironment.Bare && hasDevelopmentBuildSignals()) {
    return "development-build";
  }

  return "bare";
};

export const hasGrantedNotificationPermissionAsync = async (): Promise<boolean> => {
  if (Platform.OS === "web") {
    return false;
  }

  const notificationsModule = await loadNotificationsModuleAsync();

  if (notificationsModule === null) {
    return false;
  }

  const permissions = await notificationsModule.getPermissionsAsync();

  return hasGrantedNotificationPermission(permissions);
};

export const presentLocalNotificationAsync = async (
  content: ExpoNotifications.NotificationContentInput
): Promise<string | null> => {
  const hasPermission = await hasGrantedNotificationPermissionAsync();

  if (!hasPermission) {
    return null;
  }

  const notificationsModule = await loadNotificationsModuleAsync();

  if (notificationsModule === null) {
    return null;
  }

  return notificationsModule.scheduleNotificationAsync({
    content,
    trigger: null,
  });
};

export const readPushPermissionStateAsync = async (): Promise<PushPermissionState> => {
  if (Platform.OS === "web") {
    return "unavailable";
  }

  const notificationsModule = await loadNotificationsModuleAsync();

  if (notificationsModule === null) {
    return "unavailable";
  }

  const permissions = await notificationsModule.getPermissionsAsync();

  return readPermissionState(permissions);
};

export const preparePushTokenAsync = async (): Promise<PushPreparationResult> => {
  if (Platform.OS === "web") {
    return {
      status: "unavailable",
      expoPushToken: null,
      detail: "Expo push notifications are only prepared on native devices.",
    };
  }

  if (!Device.isDevice) {
    return {
      status: "unavailable",
      expoPushToken: null,
      detail: "Push notifications require a physical device.",
    };
  }

  await ensureAndroidNotificationChannelAsync();

  const notificationsModule = await loadNotificationsModuleAsync();

  if (notificationsModule === null) {
    return {
      status: "unavailable",
      expoPushToken: null,
      detail: createExpoGoAndroidDetail(),
    };
  }

  const permissions = await notificationsModule.getPermissionsAsync();
  let finalStatus = permissions.status;

  if (finalStatus !== "granted") {
    const request = await notificationsModule.requestPermissionsAsync();
    finalStatus = request.status;
  }

  if (finalStatus !== "granted") {
    return {
      status: "denied",
      expoPushToken: null,
      detail: "Notification permission was not granted.",
    };
  }

  const projectId = readPushProjectId();

  if (projectId === null) {
    return {
      status: "misconfigured",
      expoPushToken: null,
      detail: "EAS project ID is missing from the app configuration.",
    };
  }

  const pushToken = await notificationsModule.getExpoPushTokenAsync({
    projectId,
  });

  return {
    status: "granted",
    expoPushToken: pushToken.data,
    detail: "Expo push token is ready for register-device-token.",
  };
};

export const readNotificationsModuleAsync = async (): Promise<NotificationsModule | null> =>
  loadNotificationsModuleAsync();
