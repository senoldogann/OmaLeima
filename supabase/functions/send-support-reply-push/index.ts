import { readRuntimeEnv } from "../_shared/env.ts";
import { type ExpoPushMessage, type ExpoPushSendResult, sendExpoPushMessages } from "../_shared/expoPush.ts";
import {
  assertPostRequest,
  enforceEdgeActorRateLimitAsync,
  errorResponse,
  getBearerToken,
  jsonResponse,
  readJsonBody,
} from "../_shared/http.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";
import { isUuid } from "../_shared/validation.ts";

type SendSupportReplyPushRequest = {
  supportRequestId: string;
};

type ProfileRow = {
  id: string;
  primary_role: string;
  status: string;
};

type SupportRequestRow = {
  admin_reply: string | null;
  area: "BUSINESS" | "CLUB" | "STUDENT";
  business_id: string | null;
  club_id: string | null;
  id: string;
  status: string;
  subject: string;
  user_id: string;
};

type DeviceTokenRow = {
  expo_push_token: string;
};

type NotificationInsertRow = {
  body: string;
  channel: "PUSH";
  payload: Record<string, unknown>;
  sent_at: string | null;
  status: "FAILED" | "SENT";
  title: string;
  type: "SUPPORT_REPLY";
  user_id: string;
};

const supportReplyPushRateLimitOptions = {
  dayMaxRequests: 120,
  windowMaxRequests: 10,
  windowSeconds: 60,
};

const parseRequestBody = (body: Record<string, unknown>): SendSupportReplyPushRequest => {
  if (!isUuid(body.supportRequestId)) {
    throw new Error("supportRequestId must be a valid UUID.");
  }

  return {
    supportRequestId: body.supportRequestId,
  };
};

const isActivePlatformAdmin = (profile: ProfileRow): boolean =>
  profile.primary_role === "PLATFORM_ADMIN" && profile.status === "ACTIVE";

const serializeTokenResults = (results: ExpoPushSendResult[]): Record<string, unknown>[] =>
  results.map((result): Record<string, unknown> =>
    result.ok
      ? {
          ok: true,
          ticketId: result.ticketId,
        }
      : {
          error: result.message,
          ok: false,
        }
  );

const createSupportReplyPushMessage = (
  supportRequest: SupportRequestRow,
  expoPushToken: string
): ExpoPushMessage => ({
  body: `We replied to your support request: ${supportRequest.subject}`,
  data: {
    area: supportRequest.area,
    supportRequestId: supportRequest.id,
    type: "SUPPORT_REPLY",
  },
  title: "OmaLeima support",
  to: expoPushToken,
});

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

    let body: SendSupportReplyPushRequest;

    try {
      body = parseRequestBody(await readJsonBody(request));
    } catch (error) {
      return errorResponse(400, "VALIDATION_ERROR", "Failed to send support reply push.", {
        error: error instanceof Error ? error.message : "unknown error",
      });
    }

    const supabase = createServiceClient(env);
    const authResult = await getAuthenticatedUser(supabase, authToken);

    if (!authResult.ok) {
      return errorResponse(401, "UNAUTHORIZED", "Invalid authenticated user token.", {
        authError: authResult.message,
      });
    }

    const { data: adminProfile, error: adminProfileError } = await supabase
      .from("profiles")
      .select("id,primary_role,status")
      .eq("id", authResult.value.user.id)
      .maybeSingle<ProfileRow>();

    if (adminProfileError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read admin profile.", {
        adminProfileError: adminProfileError.message,
        adminProfileErrorCode: adminProfileError.code,
      });
    }

    if (adminProfile === null || !isActivePlatformAdmin(adminProfile)) {
      return errorResponse(403, "FORBIDDEN", "Only active platform admins can send support reply push notifications.", {});
    }

    const rateLimitResponse = await enforceEdgeActorRateLimitAsync(
      supabase,
      adminProfile.id,
      "edge-send-support-reply-push",
      supportReplyPushRateLimitOptions,
    );

    if (rateLimitResponse !== null) {
      return rateLimitResponse;
    }

    const { data: supportRequest, error: supportRequestError } = await supabase
      .from("support_requests")
      .select("id,user_id,business_id,club_id,area,subject,status,admin_reply")
      .eq("id", body.supportRequestId)
      .maybeSingle<SupportRequestRow>();

    if (supportRequestError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read support request.", {
        supportRequestError: supportRequestError.message,
        supportRequestErrorCode: supportRequestError.code,
      });
    }

    if (supportRequest === null) {
      return errorResponse(404, "SUPPORT_REQUEST_NOT_FOUND", "Support request was not found.", {
        supportRequestId: body.supportRequestId,
      });
    }

    if (supportRequest.admin_reply === null || supportRequest.admin_reply.trim().length === 0) {
      return errorResponse(400, "VALIDATION_ERROR", "Support request has no saved admin reply.", {
        supportRequestId: body.supportRequestId,
      });
    }

    const { data: targetProfile, error: targetProfileError } = await supabase
      .from("profiles")
      .select("id,primary_role,status")
      .eq("id", supportRequest.user_id)
      .maybeSingle<ProfileRow>();

    if (targetProfileError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read support requester profile.", {
        targetProfileError: targetProfileError.message,
        targetProfileErrorCode: targetProfileError.code,
      });
    }

    if (targetProfile === null || targetProfile.status !== "ACTIVE") {
      return jsonResponse({
        message: "Support reply saved, but requester profile is not active.",
        notificationsCreated: 0,
        notificationsFailed: 0,
        notificationsSent: 0,
        status: "REQUESTER_NOT_ACTIVE",
        supportRequestId: supportRequest.id,
      }, 200);
    }

    const { data: deviceTokens, error: deviceTokensError } = await supabase
      .from("device_tokens")
      .select("expo_push_token")
      .eq("user_id", supportRequest.user_id)
      .eq("enabled", true)
      .returns<DeviceTokenRow[]>();

    if (deviceTokensError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read support requester device tokens.", {
        deviceTokensError: deviceTokensError.message,
        deviceTokensErrorCode: deviceTokensError.code,
      });
    }

    if (deviceTokens.length === 0) {
      return jsonResponse({
        message: "Support reply saved, but the requester has no enabled device token.",
        notificationsCreated: 0,
        notificationsFailed: 0,
        notificationsSent: 0,
        status: "NO_DEVICE_TOKENS",
        supportRequestId: supportRequest.id,
      }, 200);
    }

    const messages = deviceTokens.map((deviceToken) =>
      createSupportReplyPushMessage(supportRequest, deviceToken.expo_push_token)
    );
    const pushResults = await sendExpoPushMessages(env.expoPushApiUrl, env.expoPushAccessToken, messages);
    const notificationsSent = pushResults.filter((result) => result.ok).length > 0 ? 1 : 0;
    const notificationsFailed = notificationsSent === 1 ? 0 : 1;
    const notificationStatus = notificationsSent === 1 ? "SENT" : "FAILED";
    const notificationRow: NotificationInsertRow = {
      body: `We replied to your support request: ${supportRequest.subject}`,
      channel: "PUSH",
      payload: {
        area: supportRequest.area,
        businessId: supportRequest.business_id,
        clubId: supportRequest.club_id,
        supportRequestId: supportRequest.id,
        tokenResults: serializeTokenResults(pushResults),
        type: "SUPPORT_REPLY",
      },
      sent_at: notificationsSent === 1 ? new Date().toISOString() : null,
      status: notificationStatus,
      title: "OmaLeima support",
      type: "SUPPORT_REPLY",
      user_id: supportRequest.user_id,
    };

    const { error: insertNotificationError } = await supabase
      .from("notifications")
      .insert(notificationRow);

    if (insertNotificationError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to record support reply notification.", {
        insertNotificationError: insertNotificationError.message,
        insertNotificationErrorCode: insertNotificationError.code,
      });
    }

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        action: "SUPPORT_REPLY_PUSH_SENT",
        actor_user_id: adminProfile.id,
        metadata: {
          notificationStatus,
          notificationsFailed,
          notificationsSent,
          supportRequestId: supportRequest.id,
          userId: supportRequest.user_id,
        },
        resource_id: supportRequest.id,
        resource_type: "support_requests",
      });

    if (auditError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to record support reply push audit log.", {
        auditError: auditError.message,
        auditErrorCode: auditError.code,
      });
    }

    return jsonResponse({
      message:
        notificationsFailed > 0
          ? "Support reply saved, but push delivery failed."
          : "Support reply push sent.",
      notificationsCreated: 1,
      notificationsFailed,
      notificationsSent,
      status: notificationsFailed > 0 ? "PARTIAL_SUCCESS" : "SUCCESS",
      supportRequestId: supportRequest.id,
    }, 200);
  } catch (error) {
    return errorResponse(500, "INTERNAL_ERROR", "Unexpected support reply push error.", {
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
});
