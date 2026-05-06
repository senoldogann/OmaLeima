import { assertPostRequest, errorResponse, getBearerToken, jsonResponse, readJsonBody } from "../_shared/http.ts";
import { readRuntimeEnv } from "../_shared/env.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";
import { isExpoPushToken, isString } from "../_shared/validation.ts";

type RegisterDeviceTokenRequest = {
  expoPushToken: string;
  platform: "IOS" | "ANDROID";
  deviceId: string | null;
};

type DeviceTokenRow = {
  id: string;
  user_id: string;
  expo_push_token: string;
  platform: string | null;
  device_id: string | null;
  enabled: boolean;
};

type ProfileRow = {
  id: string;
  status: string;
};

class ValidationError extends Error {}

const isPlatform = (value: unknown): value is "IOS" | "ANDROID" =>
  value === "IOS" || value === "ANDROID";

const parseRequestBody = (body: Record<string, unknown>): RegisterDeviceTokenRequest => {
  if (!isExpoPushToken(body.expoPushToken)) {
    throw new ValidationError("expoPushToken must be a valid Expo push token.");
  }

  if (!isPlatform(body.platform)) {
    throw new ValidationError("platform must be IOS or ANDROID.");
  }

  if (typeof body.deviceId !== "undefined" && body.deviceId !== null && !isString(body.deviceId)) {
    throw new ValidationError("deviceId must be a non-empty string when provided.");
  }

  return {
    expoPushToken: body.expoPushToken,
    platform: body.platform,
    deviceId: body.deviceId ?? null,
  };
};

Deno.serve(async (request: Request): Promise<Response> => {
  const methodResponse = assertPostRequest(request);

  if (methodResponse !== null) {
    return methodResponse;
  }

  try {
    const env = readRuntimeEnv();
    const authToken = getBearerToken(request);

    if (authToken === null) {
      return errorResponse(401, "UNAUTHORIZED", "Missing or invalid Authorization bearer token.", {});
    }

    let body: RegisterDeviceTokenRequest;

    try {
      body = parseRequestBody(await readJsonBody(request));
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      const code = message.includes("Expo push token") ? "INVALID_EXPO_PUSH_TOKEN" : "VALIDATION_ERROR";

      return errorResponse(400, code, "Failed to register device token.", {
        error: message,
      });
    }

    const supabase = createServiceClient(env);
    const authResult = await getAuthenticatedUser(supabase, authToken);

    if (!authResult.ok) {
      return errorResponse(401, "UNAUTHORIZED", "Invalid Supabase access token.", {
        authError: authResult.message,
      });
    }

    const { user } = authResult.value;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,status")
      .eq("id", user.id)
      .single<ProfileRow>();

    if (profileError !== null || profile === null) {
      return errorResponse(403, "PROFILE_NOT_FOUND", "Device token registration requires a profile.", {
        userId: user.id,
        profileError: profileError?.message,
        profileErrorCode: profileError?.code,
      });
    }

    if (profile.status !== "ACTIVE") {
      return errorResponse(403, "PROFILE_NOT_ACTIVE", "Device token registration requires an active profile.", {
        userId: user.id,
        profileStatus: profile.status,
      });
    }

    if (body.deviceId !== null) {
      const { error: disableError } = await supabase
        .from("device_tokens")
        .update({
          enabled: false,
        })
        .eq("user_id", user.id)
        .eq("device_id", body.deviceId)
        .neq("expo_push_token", body.expoPushToken);

      if (disableError !== null) {
        return errorResponse(500, "INTERNAL_ERROR", "Failed to disable older device tokens.", {
          userId: user.id,
          deviceId: body.deviceId,
          disableError: disableError.message,
          disableErrorCode: disableError.code,
        });
      }
    }

    const upsertPayload = {
      user_id: user.id,
      expo_push_token: body.expoPushToken,
      platform: body.platform,
      device_id: body.deviceId,
      enabled: true,
      last_seen_at: new Date().toISOString(),
    };

    const { data: deviceToken, error: upsertError } = await supabase
      .from("device_tokens")
      .upsert(upsertPayload, {
        onConflict: "expo_push_token",
      })
      .select("id,user_id,expo_push_token,platform,device_id,enabled")
      .single<DeviceTokenRow>();

    if (upsertError !== null || deviceToken === null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to register device token.", {
        userId: user.id,
        expoPushToken: body.expoPushToken,
        upsertError: upsertError?.message,
        upsertErrorCode: upsertError?.code,
      });
    }

    return jsonResponse({
      status: "SUCCESS",
      deviceToken,
      message: "Device token registered successfully.",
    }, 200);
  } catch (error) {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to register device token.", {
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
});
