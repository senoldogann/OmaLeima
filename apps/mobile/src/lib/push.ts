import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { publicEnv } from "@/lib/env";
import type {
  PushPermissionState,
  PushPreparationResult,
  PushRuntimeMode,
} from "@/types/app";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const ensureAndroidNotificationChannelAsync = async (): Promise<void> => {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
};

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

const hasGrantedNotificationPermission = (status: Notifications.NotificationPermissionsStatus): boolean =>
  status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

const readPermissionState = (status: Notifications.NotificationPermissionsStatus): PushPermissionState => {
  if (status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
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
    if (Constants.expoGoConfig !== null || Constants.appOwnership === "expo") {
      return "expo-go";
    }

    return "development-build";
  }

  return "bare";
};

export const hasGrantedNotificationPermissionAsync = async (): Promise<boolean> => {
  if (Platform.OS === "web") {
    return false;
  }

  const permissions = await Notifications.getPermissionsAsync();

  return hasGrantedNotificationPermission(permissions);
};

export const presentLocalNotificationAsync = async (
  content: Notifications.NotificationContentInput
): Promise<string | null> => {
  const hasPermission = await hasGrantedNotificationPermissionAsync();

  if (!hasPermission) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content,
    trigger: null,
  });
};

export const readPushPermissionStateAsync = async (): Promise<PushPermissionState> => {
  if (Platform.OS === "web") {
    return "unavailable";
  }

  const permissions = await Notifications.getPermissionsAsync();

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

  const permissions = await Notifications.getPermissionsAsync();
  let finalStatus = permissions.status;

  if (finalStatus !== "granted") {
    const request = await Notifications.requestPermissionsAsync();
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

  const pushToken = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return {
    status: "granted",
    expoPushToken: pushToken.data,
    detail: "Expo push token is ready for register-device-token.",
  };
};
