export type AppReadinessState = "ready" | "loading" | "pending" | "warning" | "error";

export type PushPreparationStatus =
  | "granted"
  | "denied"
  | "unavailable"
  | "misconfigured";

export type PushPreparationResult = {
  status: PushPreparationStatus;
  expoPushToken: string | null;
  detail: string;
};

export type PushRuntimeMode =
  | "web"
  | "expo-go"
  | "development-build"
  | "standalone"
  | "bare";

export type PushPermissionState =
  | "granted"
  | "denied"
  | "undetermined"
  | "provisional"
  | "unavailable";

export type PushNotificationCapture = {
  identifier: string;
  source: "remote" | "local" | "unknown";
  triggerType: string;
  title: string | null;
  body: string | null;
  dataType: string | null;
  eventId: string | null;
  rewardTierId: string | null;
  actionIdentifier: string | null;
  capturedAt: string;
};

export type NativePushDiagnostics = {
  runtime: PushRuntimeMode;
  permissionState: PushPermissionState;
  isPhysicalDevice: boolean;
  projectId: string | null;
  lastNotification: PushNotificationCapture | null;
  lastNotificationResponse: PushNotificationCapture | null;
};

export type GoogleSignInState = "idle" | "loading" | "redirecting" | "error";
