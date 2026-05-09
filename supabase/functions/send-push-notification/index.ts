import { assertPostRequest, errorResponse, getBearerToken, jsonResponse, readJsonBody } from "../_shared/http.ts";
import { readRuntimeEnv } from "../_shared/env.ts";
import { type ExpoPushMessage, type ExpoPushSendResult, sendExpoPushMessages } from "../_shared/expoPush.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";
import { isUuid } from "../_shared/validation.ts";

type SendPushNotificationRequest = {
  type: "PROMOTION";
  promotionId: string;
};

type ProfileRow = {
  id: string;
  status: string;
  primary_role: string;
};

type PromotionRow = {
  id: string;
  business_id: string;
  event_id: string | null;
  title: string;
  description: string | null;
  terms: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
};

type BusinessStaffRow = {
  user_id: string;
};

type EventVenueRow = {
  event_id: string;
};

type RegistrationRow = {
  student_id: string;
};

type ActiveProfileRow = {
  id: string;
};

type DeviceTokenRow = {
  user_id: string;
  expo_push_token: string;
};

type ExistingPromotionNotificationRow = {
  payload: Record<string, unknown>;
};

type PushTarget = {
  userId: string;
  expoPushTokens: string[];
};

type NotificationInsertRow = {
  user_id: string;
  business_id: string;
  event_id: string | null;
  type: "PROMOTION";
  title: string;
  body: string;
  payload: Record<string, unknown>;
  channel: "PUSH";
  status: "SENT" | "FAILED";
  sent_at: string | null;
};

const isRequestType = (value: unknown): value is "PROMOTION" => value === "PROMOTION";

const parseRequestBody = (body: Record<string, unknown>): SendPushNotificationRequest => {
  if (!isRequestType(body.type)) {
    throw new Error("type must be PROMOTION.");
  }

  if (!isUuid(body.promotionId)) {
    throw new Error("promotionId must be a valid UUID.");
  }

  return {
    type: body.type,
    promotionId: body.promotionId,
  };
};

const isPlatformAdmin = (profile: ProfileRow): boolean =>
  profile.primary_role === "PLATFORM_ADMIN";

const isPromotionActiveNow = (promotion: PromotionRow): boolean => {
  if (promotion.status !== "ACTIVE") {
    return false;
  }

  const now = Date.now();

  if (promotion.starts_at !== null && now < new Date(promotion.starts_at).getTime()) {
    return false;
  }

  if (promotion.ends_at !== null && now > new Date(promotion.ends_at).getTime()) {
    return false;
  }

  return true;
};

const groupTokensByUser = (rows: DeviceTokenRow[]): Map<string, string[]> => {
  const grouped = new Map<string, string[]>();

  for (const row of rows) {
    const tokens = grouped.get(row.user_id) ?? [];
    tokens.push(row.expo_push_token);
    grouped.set(row.user_id, tokens);
  }

  return grouped;
};

const readPromotionId = (payload: Record<string, unknown>): string | null => {
  const value = payload.promotionId;

  return typeof value === "string" ? value : null;
};

const buildPromotionBody = (promotion: PromotionRow): string =>
  promotion.description ?? "A new event promotion is available.";

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

    let body: SendPushNotificationRequest;

    try {
      body = parseRequestBody(await readJsonBody(request));
    } catch (error) {
      return errorResponse(400, "VALIDATION_ERROR", "Failed to send push notification.", {
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,status,primary_role")
      .eq("id", user.id)
      .single<ProfileRow>();

    if (profileError !== null || profile === null) {
      return errorResponse(403, "FORBIDDEN", "User profile was not found.", {
        userId: user.id,
        profileError: profileError?.message,
      });
    }

    if (profile.status !== "ACTIVE") {
      return errorResponse(403, "PROFILE_NOT_ACTIVE", "User profile is not active.", {
        userId: user.id,
        profileStatus: profile.status,
      });
    }

    const { data: promotion, error: promotionError } = await supabase
      .from("promotions")
      .select("id,business_id,event_id,title,description,terms,starts_at,ends_at,status")
      .eq("id", body.promotionId)
      .maybeSingle<PromotionRow>();

    if (promotionError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read promotion.", {
        promotionId: body.promotionId,
        promotionError: promotionError.message,
        promotionErrorCode: promotionError.code,
      });
    }

    if (promotion === null) {
      return errorResponse(404, "PROMOTION_NOT_FOUND", "Promotion was not found.", {
        promotionId: body.promotionId,
      });
    }

    if (promotion.event_id === null) {
      return errorResponse(400, "PROMOTION_EVENT_REQUIRED", "Promotion must be linked to an event.", {
        promotionId: promotion.id,
      });
    }

    if (!isPromotionActiveNow(promotion)) {
      return errorResponse(400, "PROMOTION_NOT_ACTIVE", "Promotion is not active for push delivery.", {
        promotionId: promotion.id,
        promotionStatus: promotion.status,
        promotionStartsAt: promotion.starts_at,
        promotionEndsAt: promotion.ends_at,
      });
    }

    if (!isPlatformAdmin(profile)) {
      const { data: businessStaff, error: businessStaffError } = await supabase
        .from("business_staff")
        .select("user_id")
        .eq("business_id", promotion.business_id)
        .eq("user_id", user.id)
        .eq("status", "ACTIVE")
        .maybeSingle<BusinessStaffRow>();

      if (businessStaffError !== null) {
        return errorResponse(500, "INTERNAL_ERROR", "Failed to verify business staff access.", {
          userId: user.id,
          businessId: promotion.business_id,
          businessStaffError: businessStaffError.message,
          businessStaffErrorCode: businessStaffError.code,
        });
      }

      if (businessStaff === null) {
        return errorResponse(403, "NOTIFICATION_NOT_ALLOWED", "User is not allowed to send this promotion push.", {
          userId: user.id,
          businessId: promotion.business_id,
          promotionId: promotion.id,
        });
      }
    }

    const { data: eventVenue, error: eventVenueError } = await supabase
      .from("event_venues")
      .select("event_id")
      .eq("event_id", promotion.event_id)
      .eq("business_id", promotion.business_id)
      .eq("status", "JOINED")
      .maybeSingle<EventVenueRow>();

    if (eventVenueError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to verify joined venue access.", {
        eventId: promotion.event_id,
        businessId: promotion.business_id,
        eventVenueError: eventVenueError.message,
        eventVenueErrorCode: eventVenueError.code,
      });
    }

    if (eventVenue === null) {
      return errorResponse(400, "PROMOTION_NOT_JOINED_EVENT", "Promotion business is not joined to the linked event.", {
        promotionId: promotion.id,
        eventId: promotion.event_id,
        businessId: promotion.business_id,
      });
    }

    const { data: successfulPromotionNotifications, error: promotionNotificationsError } = await supabase
      .from("notifications")
      .select("payload")
      .eq("type", "PROMOTION")
      .eq("event_id", promotion.event_id)
      .eq("business_id", promotion.business_id)
      .in("status", ["SENT", "READ"])
      .returns<ExistingPromotionNotificationRow[]>();

    if (promotionNotificationsError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read existing promotion notifications.", {
        promotionId: promotion.id,
        promotionNotificationsError: promotionNotificationsError.message,
        promotionNotificationsErrorCode: promotionNotificationsError.code,
      });
    }

    const sentPromotionIds = new Set<string>();

    for (const row of successfulPromotionNotifications) {
      const promotionId = readPromotionId(row.payload);

      if (promotionId !== null) {
        sentPromotionIds.add(promotionId);
      }
    }

    if (sentPromotionIds.has(promotion.id)) {
      return errorResponse(409, "PROMOTION_ALREADY_SENT", "Promotion push was already sent for this promotion.", {
        promotionId: promotion.id,
        eventId: promotion.event_id,
        businessId: promotion.business_id,
      });
    }

    if (sentPromotionIds.size >= 2) {
      return errorResponse(409, "PROMOTION_LIMIT_REACHED", "Promotion push limit reached for this event and business.", {
        promotionId: promotion.id,
        eventId: promotion.event_id,
        businessId: promotion.business_id,
        sentPromotionCount: sentPromotionIds.size,
      });
    }

    const { data: registrations, error: registrationsError } = await supabase
      .from("event_registrations")
      .select("student_id")
      .eq("event_id", promotion.event_id)
      .eq("status", "REGISTERED")
      .returns<RegistrationRow[]>();

    if (registrationsError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read event registrations.", {
        promotionId: promotion.id,
        eventId: promotion.event_id,
        registrationsError: registrationsError.message,
        registrationsErrorCode: registrationsError.code,
      });
    }

    const registeredUserIds = Array.from(new Set(registrations.map((registration) => registration.student_id)));

    if (registeredUserIds.length === 0) {
      return errorResponse(404, "NOTIFICATION_RECIPIENTS_NOT_FOUND", "No registered event participants were found for this promotion.", {
        promotionId: promotion.id,
        eventId: promotion.event_id,
      });
    }

    const { data: activeProfiles, error: activeProfilesError } = await supabase
      .from("profiles")
      .select("id")
      .in("id", registeredUserIds)
      .eq("status", "ACTIVE")
      .returns<ActiveProfileRow[]>();

    if (activeProfilesError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read participant profiles.", {
        promotionId: promotion.id,
        activeProfilesError: activeProfilesError.message,
        activeProfilesErrorCode: activeProfilesError.code,
      });
    }

    const activeProfileIds = new Set(activeProfiles.map((activeProfile) => activeProfile.id));
    const recipientUserIds = registeredUserIds.filter((userId) => activeProfileIds.has(userId));

    if (recipientUserIds.length === 0) {
      return errorResponse(404, "NOTIFICATION_RECIPIENTS_NOT_FOUND", "No active event participants were found for this promotion.", {
        promotionId: promotion.id,
        eventId: promotion.event_id,
      });
    }

    const { data: deviceTokens, error: deviceTokensError } = await supabase
      .from("device_tokens")
      .select("user_id,expo_push_token")
      .in("user_id", recipientUserIds)
      .eq("enabled", true)
      .returns<DeviceTokenRow[]>();

    if (deviceTokensError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read recipient device tokens.", {
        promotionId: promotion.id,
        deviceTokensError: deviceTokensError.message,
        deviceTokensErrorCode: deviceTokensError.code,
      });
    }

    const tokensByUser = groupTokensByUser(deviceTokens);
    const pushTargets: PushTarget[] = [];
    let recipientsSkippedNoDeviceToken = 0;

    for (const recipientUserId of recipientUserIds) {
      const expoPushTokens = tokensByUser.get(recipientUserId) ?? [];

      if (expoPushTokens.length === 0) {
        recipientsSkippedNoDeviceToken += 1;
        continue;
      }

      pushTargets.push({
        userId: recipientUserId,
        expoPushTokens,
      });
    }

    if (pushTargets.length === 0) {
      return errorResponse(404, "NOTIFICATION_RECIPIENTS_NOT_FOUND", "No enabled device tokens were found for registered participants.", {
        promotionId: promotion.id,
        eventId: promotion.event_id,
        recipientsSkippedNoDeviceToken,
      });
    }

    const title = promotion.title;
    const bodyText = buildPromotionBody(promotion);
    const pushMessages: ExpoPushMessage[] = [];
    const pushMessageOwners: string[] = [];

    for (const pushTarget of pushTargets) {
      for (const expoPushToken of pushTarget.expoPushTokens) {
        pushMessages.push({
          to: expoPushToken,
          title,
          body: bodyText,
          data: {
            type: "PROMOTION",
            promotionId: promotion.id,
            eventId: promotion.event_id,
            businessId: promotion.business_id,
          },
        });
        pushMessageOwners.push(pushTarget.userId);
      }
    }

    const pushResults = await sendExpoPushMessages(
      env.expoPushApiUrl,
      env.expoPushAccessToken,
      pushMessages,
    );

    const resultsByUser = new Map<string, ExpoPushSendResult[]>();

    pushResults.forEach((pushResult, index) => {
      const ownerUserId = pushMessageOwners[index];

      if (typeof ownerUserId === "undefined") {
        return;
      }

      const existingResults = resultsByUser.get(ownerUserId) ?? [];
      existingResults.push(pushResult);
      resultsByUser.set(ownerUserId, existingResults);
    });

    const notificationRows: NotificationInsertRow[] = pushTargets.map((pushTarget): NotificationInsertRow => {
      const tokenResults = resultsByUser.get(pushTarget.userId) ?? [];
      const hasSuccessfulDelivery = tokenResults.some((result) => result.ok);

      return {
        user_id: pushTarget.userId,
        business_id: promotion.business_id,
        event_id: promotion.event_id,
        type: "PROMOTION",
        title,
        body: bodyText,
        payload: {
          promotionId: promotion.id,
          promotionTitle: promotion.title,
          promotionTerms: promotion.terms,
          deviceTokenCount: pushTarget.expoPushTokens.length,
          deliveryResults: serializeTokenResults(tokenResults),
        },
        channel: "PUSH",
        status: hasSuccessfulDelivery ? "SENT" : "FAILED",
        sent_at: hasSuccessfulDelivery ? new Date().toISOString() : null,
      };
    });

    const { error: insertNotificationsError } = await supabase
      .from("notifications")
      .insert(notificationRows);

    if (insertNotificationsError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to record promotion notifications.", {
        promotionId: promotion.id,
        insertNotificationsError: insertNotificationsError.message,
        insertNotificationsErrorCode: insertNotificationsError.code,
      });
    }

    const notificationsSent = notificationRows.filter((row) => row.status === "SENT").length;
    const notificationsFailed = notificationRows.length - notificationsSent;

    const { error: auditLogError } = await supabase
      .from("audit_logs")
      .insert({
        actor_user_id: user.id,
        action: "PROMOTION_PUSH_SENT",
        resource_type: "promotion",
        resource_id: promotion.id,
        metadata: {
          eventId: promotion.event_id,
          businessId: promotion.business_id,
          notificationsCreated: notificationRows.length,
          notificationsSent,
          notificationsFailed,
          recipientsSkippedNoDeviceToken,
        },
      });

    if (auditLogError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to write promotion audit log.", {
        promotionId: promotion.id,
        auditLogError: auditLogError.message,
        auditLogErrorCode: auditLogError.code,
      });
    }

    return jsonResponse({
      status: notificationsFailed > 0 ? "PARTIAL_SUCCESS" : "SUCCESS",
      type: body.type,
      promotionId: promotion.id,
      businessId: promotion.business_id,
      eventId: promotion.event_id,
      notificationsCreated: notificationRows.length,
      notificationsSent,
      notificationsFailed,
      recipientsSkippedNoDeviceToken,
      message: notificationsFailed > 0
        ? "Promotion push sent with partial delivery failures."
        : "Promotion push sent successfully.",
    }, 200);
  } catch (error) {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to send push notification.", {
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
});
