import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { Platform } from "react-native";

import { preparePushTokenAsync } from "@/lib/push";
import { publicEnv } from "@/lib/env";
import type { PushPreparationStatus, PushPreparationResult } from "@/types/app";

type RegisterDeviceTokenResponse = {
  status: "SUCCESS";
  deviceToken: {
    id: string;
    user_id: string;
    expo_push_token: string;
    platform: "IOS" | "ANDROID" | null;
    device_id: string | null;
    enabled: boolean;
  };
  message: string;
};

type RegisterDeviceTokenErrorResponse = {
  status: string;
  message: string;
};

type PushRegistrationState =
  | PushPreparationStatus
  | "registered"
  | "error";

export type PushDeviceRegistrationResult = PushPreparationResult & {
  backendDeviceTokenId: string | null;
  backendStatus: string | null;
  state: PushRegistrationState;
};

type RegisterPushDeviceParams = {
  accessToken: string;
};

const mapNativePlatform = (): "IOS" | "ANDROID" | null => {
  if (Platform.OS === "ios") {
    return "IOS";
  }

  if (Platform.OS === "android") {
    return "ANDROID";
  }

  return null;
};

const readRegisterErrorResponseAsync = async (
  response: Response
): Promise<RegisterDeviceTokenErrorResponse> => {
  const data = (await response.json()) as unknown;

  if (typeof data !== "object" || data === null) {
    return {
      status: "UNKNOWN_ERROR",
      message: `Function returned HTTP ${response.status}.`,
    };
  }

  const record = data as Record<string, unknown>;

  return {
    status: typeof record.status === "string" ? record.status : "UNKNOWN_ERROR",
    message:
      typeof record.message === "string"
        ? record.message
        : `Function returned HTTP ${response.status}.`,
  };
};

const registerDeviceTokenAsync = async (
  accessToken: string,
  preparation: PushPreparationResult
): Promise<PushDeviceRegistrationResult> => {
  const platform = mapNativePlatform();

  if (preparation.status !== "granted" || preparation.expoPushToken === null || platform === null) {
    return {
      ...preparation,
      backendDeviceTokenId: null,
      backendStatus: null,
      state: preparation.status,
    };
  }

  const response = await fetch(`${publicEnv.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/register-device-token`, {
    method: "POST",
    headers: {
      apikey: publicEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      expoPushToken: preparation.expoPushToken,
      platform,
      deviceId: null,
    }),
  });

  if (!response.ok) {
    const errorPayload = await readRegisterErrorResponseAsync(response);

    return {
      ...preparation,
      backendDeviceTokenId: null,
      backendStatus: errorPayload.status,
      state: "error",
      detail: `${errorPayload.status}: ${errorPayload.message}`,
    };
  }

  const result = (await response.json()) as RegisterDeviceTokenResponse;

  return {
    ...preparation,
    backendDeviceTokenId: result.deviceToken.id,
    backendStatus: result.status,
    state: "registered",
    detail: "Notification permission granted and device token registered with the backend.",
  };
};

export const registerPushDeviceAsync = async ({
  accessToken,
}: RegisterPushDeviceParams): Promise<PushDeviceRegistrationResult> => {
  try {
    const preparation = await preparePushTokenAsync();

    if (accessToken.length === 0) {
      return {
        ...preparation,
        backendDeviceTokenId: null,
        backendStatus: "UNAUTHORIZED",
        state: "error",
        detail: "A valid session is required before registering device notifications.",
      };
    }

    return registerDeviceTokenAsync(accessToken, preparation);
  } catch (error) {
    return {
      status: "misconfigured",
      expoPushToken: null,
      backendDeviceTokenId: null,
      backendStatus: "CLIENT_ERROR",
      state: "error",
      detail:
        error instanceof Error
          ? error.message
          : "Push notification registration failed unexpectedly on the client.",
    };
  }
};

export const useRegisterPushDeviceMutation = (): UseMutationResult<
  PushDeviceRegistrationResult,
  Error,
  RegisterPushDeviceParams
> =>
  useMutation({
    mutationFn: async (params: RegisterPushDeviceParams) => registerPushDeviceAsync(params),
  });
