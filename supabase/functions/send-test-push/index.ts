import { assertPostRequest, errorResponse, getBearerToken, jsonResponse, readJsonBody } from "../_shared/http.ts";
import { readRuntimeEnv } from "../_shared/env.ts";
import { sendExpoPushMessage } from "../_shared/expoPush.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";
import { isString } from "../_shared/validation.ts";

type SendTestPushRequest = {
  title: string;
  body: string;
  data: Record<string, unknown>;
};

type DeviceTokenRow = {
  id: string;
  expo_push_token: string;
};

type NotificationRow = {
  id: string;
  status: string;
};

class ValidationError extends Error {}

const parseRequestBody = (body: Record<string, unknown>): SendTestPushRequest => {
  if (!isString(body.title)) {
    throw new ValidationError("title must be a non-empty string.");
  }

  if (!isString(body.body)) {
    throw new ValidationError("body must be a non-empty string.");
  }

  if (typeof body.data !== "undefined" && (typeof body.data !== "object" || body.data === null || Array.isArray(body.data))) {
    throw new ValidationError("data must be a JSON object when provided.");
  }

  return {
    title: body.title,
    body: body.body,
    data: (body.data as Record<string, unknown> | undefined) ?? {},
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

    let body: SendTestPushRequest;

    try {
      body = parseRequestBody(await readJsonBody(request));
    } catch (error) {
      return errorResponse(400, "VALIDATION_ERROR", "Failed to send test push.", {
        error: error instanceof Error ? error.message : "unknown error",
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

    const { data: deviceTokens, error: deviceTokensError } = await supabase
      .from("device_tokens")
      .select("id,expo_push_token")
      .eq("user_id", user.id)
      .eq("enabled", true)
      .returns<DeviceTokenRow[]>();

    if (deviceTokensError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read device tokens.", {
        userId: user.id,
        deviceTokensError: deviceTokensError.message,
        deviceTokensErrorCode: deviceTokensError.code,
      });
    }

    if (deviceTokens.length === 0) {
      return errorResponse(404, "DEVICE_TOKEN_NOT_FOUND", "No enabled device token was found for this user.", {
        userId: user.id,
      });
    }

    const targetToken = deviceTokens[0];
    const pushResult = await sendExpoPushMessage(env.expoPushApiUrl, env.expoPushAccessToken, {
      to: targetToken.expo_push_token,
      title: body.title,
      body: body.body,
      data: body.data,
    });

    const notificationPayload = {
      ...body.data,
      expoPushResponse: pushResult.responseBody,
    };

    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: user.id,
        type: "TEST_PUSH",
        title: body.title,
        body: body.body,
        payload: notificationPayload,
        channel: "PUSH",
        status: pushResult.ok ? "SENT" : "FAILED",
        sent_at: pushResult.ok ? new Date().toISOString() : null,
      })
      .select("id,status")
      .single<NotificationRow>();

    if (notificationError !== null || notification === null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to record notification send result.", {
        userId: user.id,
        notificationError: notificationError?.message,
        notificationErrorCode: notificationError?.code,
      });
    }

    if (!pushResult.ok) {
      return errorResponse(502, "PUSH_SEND_FAILED", "Expo Push API rejected the test push.", {
        notificationId: notification.id,
        pushError: pushResult.message,
        expoPushResponse: pushResult.responseBody,
      });
    }

    return jsonResponse({
      status: "SUCCESS",
      notificationId: notification.id,
      ticketId: pushResult.ticketId,
      message: "Test push sent successfully.",
    }, 200);
  } catch (error) {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to send test push.", {
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
});
