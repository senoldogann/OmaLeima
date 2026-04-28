import {
  errorResponse,
  getBearerToken,
  getClientIp,
  jsonResponse,
  readJsonBody,
  assertPostRequest,
} from "../_shared/http.ts";
import { readRuntimeEnv } from "../_shared/env.ts";
import { type ExpoPushMessage, type ExpoPushSendResult, sendExpoPushMessages } from "../_shared/expoPush.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";
import { verifyQrToken } from "../_shared/qrJwt.ts";
import { isOptionalLatitude, isOptionalLongitude, isOptionalUuid, isString } from "../_shared/validation.ts";

type ScannerLocation = {
  latitude: number | null;
  longitude: number | null;
};

type ScanQrRequest = {
  qrToken: string;
  businessId: string | undefined;
  scannerDeviceId: string | null;
  scannerLocation: ScannerLocation;
};

type BusinessStaffRow = {
  business_id: string;
};

type DeviceTokenRow = {
  expo_push_token: string;
};

type NotificationInsertRow = {
  user_id: string;
  event_id: string;
  type: "REWARD_UNLOCKED";
  title: string;
  body: string;
  payload: Record<string, unknown>;
  channel: "PUSH";
  status: "SENT" | "FAILED";
  sent_at: string | null;
};

type UnlockedRewardTier = {
  rewardTierId: string;
  title: string;
  requiredStampCount: number;
};

type ScanStampResult = {
  status: string;
  stampId?: string;
  stampCount?: number;
  eventName?: string;
  unlockedRewardTiers?: UnlockedRewardTier[];
};

type RewardUnlockPushSummary = {
  status: "NONE" | "QUEUED" | "FAILED";
  unlockedRewardCount: number;
  notificationsCreated: number;
  notificationsSent: number;
  notificationsFailed: number;
  notificationRecorded: boolean;
};

const responseMessages: Record<string, string> = {
  SUCCESS: "Leima added successfully.",
  EVENT_NOT_FOUND: "Event was not found.",
  EVENT_NOT_ACTIVE: "Event is not active.",
  STUDENT_NOT_REGISTERED: "Student is not registered for this event.",
  VENUE_NOT_IN_EVENT: "Venue is not part of this event.",
  VENUE_JOINED_TOO_LATE: "Venue joined this event too late.",
  BUSINESS_STAFF_NOT_ALLOWED: "Scanner is not allowed to scan for this business.",
  QR_ALREADY_USED_OR_REPLAYED: "QR code was already used.",
  ALREADY_STAMPED: "This student already has a leima from this venue for this event.",
};

const serializeTokenResults = (results: ExpoPushSendResult[]): Record<string, unknown>[] =>
  results.map((result): Record<string, unknown> =>
    result.ok
      ? {
          ok: true,
          ticketId: result.ticketId,
        }
      : {
          ok: false,
          error: result.message,
        }
  );

const createRewardUnlockPushSummary = (
  status: RewardUnlockPushSummary["status"],
  unlockedRewardCount: number,
  notificationsCreated: number,
  notificationsSent: number,
  notificationsFailed: number,
  notificationRecorded: boolean
): RewardUnlockPushSummary => ({
  status,
  unlockedRewardCount,
  notificationsCreated,
  notificationsSent,
  notificationsFailed,
  notificationRecorded,
});

const buildRewardUnlockTitle = (unlockedRewardTiers: UnlockedRewardTier[]): string =>
  unlockedRewardTiers.length === 1 ? "Reward unlocked" : `${unlockedRewardTiers.length} rewards unlocked`;

const buildRewardUnlockBody = (eventName: string, unlockedRewardTiers: UnlockedRewardTier[]): string => {
  const [firstRewardTier] = unlockedRewardTiers;

  if (typeof firstRewardTier === "undefined") {
    return `You reached a reward stamp threshold in ${eventName}. Check the app for current availability.`;
  }

  if (unlockedRewardTiers.length === 1) {
    return `You reached the stamp threshold for ${firstRewardTier.title} in ${eventName}. Check the app for current availability.`;
  }

  return `You reached the stamp threshold for ${firstRewardTier.title} and ${unlockedRewardTiers.length - 1} more rewards in ${eventName}. Check the app for current availability.`;
};

const createRewardUnlockNotificationRow = (
  studentId: string,
  eventId: string,
  title: string,
  body: string,
  payload: Record<string, unknown>,
  status: "SENT" | "FAILED"
): NotificationInsertRow => ({
  user_id: studentId,
  event_id: eventId,
  type: "REWARD_UNLOCKED",
  title,
  body,
  payload,
  channel: "PUSH",
  status,
  sent_at: status === "SENT" ? new Date().toISOString() : null,
});

const persistRewardUnlockNotificationAsync = async (
  supabase: ReturnType<typeof createServiceClient>,
  notificationRow: NotificationInsertRow,
  warningContext: Record<string, unknown>
): Promise<boolean> => {
  const { error } = await supabase.from("notifications").insert(notificationRow);

  if (error === null) {
    return true;
  }

  console.warn("reward_unlock_notification_record_failed", {
    ...warningContext,
    notificationError: error.message,
    notificationErrorCode: error.code,
  });

  return false;
};

const sendRewardUnlockPushAsync = async (
  supabase: ReturnType<typeof createServiceClient>,
  expoPushApiUrl: string,
  expoPushAccessToken: string | null,
  studentId: string,
  eventId: string,
  eventName: string,
  unlockedRewardTiers: UnlockedRewardTier[]
): Promise<void> => {
  if (unlockedRewardTiers.length === 0) {
    return;
  }

  const title = buildRewardUnlockTitle(unlockedRewardTiers);
  const body = buildRewardUnlockBody(eventName, unlockedRewardTiers);
  const basePayload = {
    type: "REWARD_UNLOCKED",
    eventId,
    eventName,
    rewardTierIds: unlockedRewardTiers.map((rewardTier) => rewardTier.rewardTierId),
    unlockedRewardTiers,
  };
  const { data: deviceTokens, error: deviceTokensError } = await supabase
    .from("device_tokens")
    .select("expo_push_token")
    .eq("user_id", studentId)
    .eq("enabled", true)
    .returns<DeviceTokenRow[]>();

  if (deviceTokensError !== null) {
    await persistRewardUnlockNotificationAsync(
      supabase,
      createRewardUnlockNotificationRow(
        studentId,
        eventId,
        title,
        body,
        {
          ...basePayload,
          deliveryError: "DEVICE_TOKEN_LOOKUP_FAILED",
          deliveryErrorMessage: deviceTokensError.message,
          deliveryResults: [],
          deviceTokenCount: 0,
        },
        "FAILED"
      ),
      {
        studentId,
        eventId,
        deliveryError: "DEVICE_TOKEN_LOOKUP_FAILED",
      }
    );

    return;
  }

  if (deviceTokens.length === 0) {
    await persistRewardUnlockNotificationAsync(
      supabase,
      createRewardUnlockNotificationRow(
        studentId,
        eventId,
        title,
        body,
        {
          ...basePayload,
          deliveryError: "NO_ENABLED_DEVICE_TOKEN",
          deliveryResults: [],
          deviceTokenCount: 0,
        },
        "FAILED"
      ),
      {
        studentId,
        eventId,
        deliveryError: "NO_ENABLED_DEVICE_TOKEN",
      }
    );

    return;
  }

  const pushMessages: ExpoPushMessage[] = deviceTokens.map((deviceToken): ExpoPushMessage => ({
    to: deviceToken.expo_push_token,
    title,
    body,
    data: basePayload,
  }));
  const pushResults = await sendExpoPushMessages(expoPushApiUrl, expoPushAccessToken, pushMessages);
  const notificationsSent = pushResults.some((result) => result.ok) ? 1 : 0;
  await persistRewardUnlockNotificationAsync(
    supabase,
    createRewardUnlockNotificationRow(
      studentId,
      eventId,
      title,
      body,
      {
        ...basePayload,
        deliveryResults: serializeTokenResults(pushResults),
        deviceTokenCount: deviceTokens.length,
      },
      notificationsSent === 1 ? "SENT" : "FAILED"
    ),
    {
      studentId,
      eventId,
      deliveryError: notificationsSent === 1 ? null : "EXPO_PUSH_REJECTED",
    }
  );

  return;
};

const parseScannerLocation = (value: unknown): ScannerLocation => {
  if (typeof value === "undefined" || value === null) {
    return {
      latitude: null,
      longitude: null,
    };
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("scannerLocation must be an object when provided.");
  }

  const location = value as Record<string, unknown>;

  if (!isOptionalLatitude(location.latitude)) {
    throw new Error("scannerLocation.latitude must be between -90 and 90.");
  }

  if (!isOptionalLongitude(location.longitude)) {
    throw new Error("scannerLocation.longitude must be between -180 and 180.");
  }

  return {
    latitude: location.latitude ?? null,
    longitude: location.longitude ?? null,
  };
};

const parseRequestBody = (body: Record<string, unknown>): ScanQrRequest => {
  if (!isString(body.qrToken)) {
    throw new Error("qrToken must be a non-empty string.");
  }

  if (!isOptionalUuid(body.businessId)) {
    throw new Error("businessId must be a valid UUID when provided.");
  }

  if (typeof body.scannerDeviceId !== "undefined" && body.scannerDeviceId !== null && !isString(body.scannerDeviceId)) {
    throw new Error("scannerDeviceId must be a non-empty string when provided.");
  }

  return {
    qrToken: body.qrToken,
    businessId: body.businessId,
    scannerDeviceId: body.scannerDeviceId ?? null,
    scannerLocation: parseScannerLocation(body.scannerLocation),
  };
};

const resolveBusinessId = (rows: BusinessStaffRow[], requestedBusinessId: string | undefined): string | null => {
  if (typeof requestedBusinessId === "string") {
    const match = rows.find((row: BusinessStaffRow): boolean => row.business_id === requestedBusinessId);
    return typeof match === "undefined" ? null : match.business_id;
  }

  if (rows.length === 1) {
    return rows[0].business_id;
  }

  return null;
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

    const body = parseRequestBody(await readJsonBody(request));
    const supabase = createServiceClient(env);
    const authResult = await getAuthenticatedUser(supabase, authToken);

    if (!authResult.ok) {
      return errorResponse(401, "UNAUTHORIZED", "Invalid Supabase access token.", {
        authError: authResult.message,
      });
    }

    const { user } = authResult.value;
    const verifiedQrToken = await verifyQrToken(env.qrSigningSecret, body.qrToken);

    if (!verifiedQrToken.ok) {
      return errorResponse(400, verifiedQrToken.status, verifiedQrToken.message, {});
    }

    const { data: businessStaffRows, error: businessStaffError } = await supabase
      .from("business_staff")
      .select("business_id")
      .eq("user_id", user.id)
      .eq("status", "ACTIVE")
      .returns<BusinessStaffRow[]>();

    if (businessStaffError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read business staff membership.", {
        scannerUserId: user.id,
        businessStaffError: businessStaffError.message,
      });
    }

    if (businessStaffRows.length === 0) {
      return errorResponse(403, "NOT_BUSINESS_STAFF", "Authenticated user is not active business staff.", {
        scannerUserId: user.id,
      });
    }

    const businessId = resolveBusinessId(businessStaffRows, body.businessId);

    if (businessId === null) {
      return errorResponse(400, "BUSINESS_CONTEXT_REQUIRED", "Business context is required or not allowed.", {
        scannerUserId: user.id,
        requestedBusinessId: body.businessId,
        activeBusinessCount: businessStaffRows.length,
      });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc("scan_stamp_atomic", {
      p_event_id: verifiedQrToken.payload.eventId,
      p_student_id: verifiedQrToken.payload.sub,
      p_qr_jti: verifiedQrToken.payload.jti,
      p_business_id: businessId,
      p_scanner_user_id: user.id,
      p_scanner_device_id: body.scannerDeviceId,
      p_scanner_latitude: body.scannerLocation.latitude,
      p_scanner_longitude: body.scannerLocation.longitude,
      p_ip: getClientIp(request),
      p_user_agent: request.headers.get("user-agent"),
    });

    if (rpcError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to scan QR token.", {
        rpcError: rpcError.message,
        rpcErrorCode: rpcError.code,
      });
    }

    const result = rpcResult as ScanStampResult;
    const unlockedRewardTiers = result.unlockedRewardTiers ?? [];
    let rewardUnlockPush = createRewardUnlockPushSummary(
      unlockedRewardTiers.length === 0 || result.status !== "SUCCESS" ? "NONE" : "QUEUED",
      unlockedRewardTiers.length,
      0,
      0,
      0,
      unlockedRewardTiers.length === 0 || result.status !== "SUCCESS"
    );

    if (result.status === "SUCCESS" && unlockedRewardTiers.length > 0) {
      try {
        EdgeRuntime.waitUntil((async (): Promise<void> => {
          try {
            await sendRewardUnlockPushAsync(
              supabase,
              env.expoPushApiUrl,
              env.expoPushAccessToken,
              verifiedQrToken.payload.sub,
              verifiedQrToken.payload.eventId,
              result.eventName ?? "this event",
              unlockedRewardTiers
            );
          } catch (error) {
            console.warn("reward_unlock_push_background_failed", {
              studentId: verifiedQrToken.payload.sub,
              eventId: verifiedQrToken.payload.eventId,
              unlockedRewardCount: unlockedRewardTiers.length,
              message: error instanceof Error ? error.message : String(error),
            });
          }
        })());
      } catch (error) {
        console.warn("reward_unlock_push_schedule_failed", {
          studentId: verifiedQrToken.payload.sub,
          eventId: verifiedQrToken.payload.eventId,
          unlockedRewardCount: unlockedRewardTiers.length,
          message: error instanceof Error ? error.message : String(error),
        });
        rewardUnlockPush = createRewardUnlockPushSummary("FAILED", unlockedRewardTiers.length, 0, 0, 0, false);
      }
    }

    return jsonResponse({
      ...result,
      rewardUnlockPush,
      message: responseMessages[result.status] ?? "QR scan completed.",
    }, 200);
  } catch (error) {
    return errorResponse(400, "VALIDATION_ERROR", "Failed to scan QR token.", {
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
});
