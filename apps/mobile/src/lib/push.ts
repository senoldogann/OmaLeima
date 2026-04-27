import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { publicEnv } from "@/lib/env";
import type { PushPreparationResult } from "@/types/app";

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

const readProjectId = (): string | null => {
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

  const projectId = readProjectId();

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
