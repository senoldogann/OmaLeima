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

export type GoogleSignInState = "idle" | "loading" | "redirecting" | "error";
