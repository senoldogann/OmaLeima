import { readRuntimeEnv } from "../_shared/env.ts";
import { type ExpoPushMessage, type ExpoPushSendResult, sendExpoPushMessages } from "../_shared/expoPush.ts";
import { assertPostRequest, errorResponse, getBearerToken, jsonResponse, readJsonBody } from "../_shared/http.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";
import { isUuid } from "../_shared/validation.ts";

type SendAnnouncementPushRequest = {
  announcementId: string;
};

type ProfileRow = {
  id: string;
  primary_role: string;
  status: string;
};

type AnnouncementRow = {
  id: string;
  audience: "ALL" | "BUSINESSES" | "CLUBS" | "STUDENTS";
  body: string;
  club_id: string | null;
  cta_label: string | null;
  cta_url: string | null;
  ends_at: string | null;
  starts_at: string;
  status: "ARCHIVED" | "DRAFT" | "PUBLISHED";
  title: string;
};

type ClubMemberRow = {
  user_id: string;
};

type BusinessStaffRow = {
  user_id: string;
};

type EventRow = {
  id: string;
};

type RegistrationRow = {
  student_id: string;
};

type ActiveProfileRow = {
  id: string;
};

type DeviceTokenRow = {
  expo_push_token: string;
  user_id: string;
};

type AnnouncementPreferenceRow = {
  push_enabled: boolean;
  user_id: string;
};

type ExistingNotificationRow = {
  payload: Record<string, unknown>;
};

type PushTarget = {
  expoPushTokens: string[];
  userId: string;
};

type NotificationInsertRow = {
  body: string;
  channel: "PUSH";
  payload: Record<string, unknown>;
  sent_at: string | null;
  status: "FAILED" | "SENT";
  title: string;
  type: "ANNOUNCEMENT";
  user_id: string;
};

const parseRequestBody = (body: Record<string, unknown>): SendAnnouncementPushRequest => {
  if (!isUuid(body.announcementId)) {
    throw new Error("announcementId must be a valid UUID.");
  }

  return {
    announcementId: body.announcementId,
  };
};

const isPlatformAdmin = (profile: ProfileRow): boolean =>
  profile.primary_role === "PLATFORM_ADMIN";

const isAnnouncementActiveNow = (announcement: AnnouncementRow): boolean => {
  if (announcement.status !== "PUBLISHED") {
    return false;
  }

  const now = Date.now();

  if (now < new Date(announcement.starts_at).getTime()) {
    return false;
  }

  if (announcement.ends_at !== null && now >= new Date(announcement.ends_at).getTime()) {
    return false;
  }

  return true;
};

const readAnnouncementId = (payload: Record<string, unknown>): string | null => {
  const value = payload.announcementId;

  return typeof value === "string" ? value : null;
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

const unique = (values: string[]): string[] => Array.from(new Set(values));

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

    let body: SendAnnouncementPushRequest;

    try {
      body = parseRequestBody(await readJsonBody(request));
    } catch (error) {
      return errorResponse(400, "VALIDATION_ERROR", "Failed to send announcement push.", {
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
        profileError: profileError?.message,
        userId: user.id,
      });
    }

    if (profile.status !== "ACTIVE") {
      return errorResponse(403, "PROFILE_NOT_ACTIVE", "User profile is not active.", {
        profileStatus: profile.status,
        userId: user.id,
      });
    }

    const { data: announcement, error: announcementError } = await supabase
      .from("announcements")
      .select("id,club_id,audience,title,body,cta_label,cta_url,status,starts_at,ends_at")
      .eq("id", body.announcementId)
      .maybeSingle<AnnouncementRow>();

    if (announcementError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read announcement.", {
        announcementError: announcementError.message,
        announcementErrorCode: announcementError.code,
        announcementId: body.announcementId,
      });
    }

    if (announcement === null) {
      return errorResponse(404, "ANNOUNCEMENT_NOT_FOUND", "Announcement was not found.", {
        announcementId: body.announcementId,
      });
    }

    if (!isAnnouncementActiveNow(announcement)) {
      return errorResponse(400, "ANNOUNCEMENT_NOT_ACTIVE", "Announcement is not active for push delivery.", {
        announcementEndsAt: announcement.ends_at,
        announcementId: announcement.id,
        announcementStartsAt: announcement.starts_at,
        announcementStatus: announcement.status,
      });
    }

    if (!isPlatformAdmin(profile)) {
      if (announcement.club_id === null) {
        return errorResponse(403, "ANNOUNCEMENT_PUSH_NOT_ALLOWED", "Only platform admins can send platform announcements.", {
          announcementId: announcement.id,
          userId: user.id,
        });
      }

      const { data: clubMember, error: clubMemberError } = await supabase
        .from("club_members")
        .select("user_id")
        .eq("club_id", announcement.club_id)
        .eq("user_id", user.id)
        .eq("status", "ACTIVE")
        .in("role", ["OWNER", "ORGANIZER"])
        .maybeSingle<ClubMemberRow>();

      if (clubMemberError !== null) {
        return errorResponse(500, "INTERNAL_ERROR", "Failed to verify club organizer access.", {
          announcementId: announcement.id,
          clubId: announcement.club_id,
          clubMemberError: clubMemberError.message,
          clubMemberErrorCode: clubMemberError.code,
          userId: user.id,
        });
      }

      if (clubMember === null) {
        return errorResponse(403, "ANNOUNCEMENT_PUSH_NOT_ALLOWED", "User cannot send this club announcement.", {
          announcementId: announcement.id,
          clubId: announcement.club_id,
          userId: user.id,
        });
      }
    }

    const { data: existingNotifications, error: existingNotificationsError } = await supabase
      .from("notifications")
      .select("payload")
      .eq("type", "ANNOUNCEMENT")
      .in("status", ["SENT", "READ"])
      .returns<ExistingNotificationRow[]>();

    if (existingNotificationsError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read existing announcement notifications.", {
        announcementId: announcement.id,
        existingNotificationsError: existingNotificationsError.message,
        existingNotificationsErrorCode: existingNotificationsError.code,
      });
    }

    const wasAlreadySent = existingNotifications.some((row) => readAnnouncementId(row.payload) === announcement.id);

    if (wasAlreadySent) {
      return errorResponse(409, "ANNOUNCEMENT_ALREADY_SENT", "Announcement push was already sent.", {
        announcementId: announcement.id,
      });
    }

    let recipientUserIds: string[] = [];

    if (announcement.club_id === null) {
      if (announcement.audience === "BUSINESSES") {
        const { data, error } = await supabase
          .from("business_staff")
          .select("user_id")
          .eq("status", "ACTIVE")
          .returns<BusinessStaffRow[]>();

        if (error !== null) {
          return errorResponse(500, "INTERNAL_ERROR", "Failed to read business staff recipients.", {
            announcementId: announcement.id,
            error: error.message,
          });
        }

        recipientUserIds = data.map((row) => row.user_id);
      } else if (announcement.audience === "CLUBS") {
        const { data, error } = await supabase
          .from("club_members")
          .select("user_id")
          .eq("status", "ACTIVE")
          .returns<ClubMemberRow[]>();

        if (error !== null) {
          return errorResponse(500, "INTERNAL_ERROR", "Failed to read club staff recipients.", {
            announcementId: announcement.id,
            error: error.message,
          });
        }

        recipientUserIds = data.map((row) => row.user_id);
      } else {
        let query = supabase
          .from("profiles")
          .select("id")
          .eq("status", "ACTIVE");

        if (announcement.audience === "STUDENTS") {
          query = query.eq("primary_role", "STUDENT");
        }

        const { data, error } = await query.returns<ActiveProfileRow[]>();

        if (error !== null) {
          return errorResponse(500, "INTERNAL_ERROR", "Failed to read profile recipients.", {
            announcementId: announcement.id,
            error: error.message,
          });
        }

        recipientUserIds = data.map((row) => row.id);
      }
    } else if (announcement.audience === "CLUBS") {
      const { data, error } = await supabase
        .from("club_members")
        .select("user_id")
        .eq("club_id", announcement.club_id)
        .eq("status", "ACTIVE")
        .returns<ClubMemberRow[]>();

      if (error !== null) {
        return errorResponse(500, "INTERNAL_ERROR", "Failed to read club member recipients.", {
          announcementId: announcement.id,
          clubId: announcement.club_id,
          error: error.message,
        });
      }

      recipientUserIds = data.map((row) => row.user_id);
    } else {
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id")
        .eq("club_id", announcement.club_id)
        .returns<EventRow[]>();

      if (eventsError !== null) {
        return errorResponse(500, "INTERNAL_ERROR", "Failed to read club events for announcement recipients.", {
          announcementId: announcement.id,
          clubId: announcement.club_id,
          eventsError: eventsError.message,
          eventsErrorCode: eventsError.code,
        });
      }

      const eventIds = events.map((event) => event.id);

      if (eventIds.length > 0) {
        const { data: registrations, error: registrationsError } = await supabase
          .from("event_registrations")
          .select("student_id")
          .in("event_id", eventIds)
          .eq("status", "REGISTERED")
          .returns<RegistrationRow[]>();

        if (registrationsError !== null) {
          return errorResponse(500, "INTERNAL_ERROR", "Failed to read club event registrations.", {
            announcementId: announcement.id,
            clubId: announcement.club_id,
            registrationsError: registrationsError.message,
            registrationsErrorCode: registrationsError.code,
          });
        }

        recipientUserIds = registrations.map((registration) => registration.student_id);
      }

      if (announcement.audience === "ALL") {
        const { data: clubMembers, error: clubMembersError } = await supabase
          .from("club_members")
          .select("user_id")
          .eq("club_id", announcement.club_id)
          .eq("status", "ACTIVE")
          .returns<ClubMemberRow[]>();

        if (clubMembersError !== null) {
          return errorResponse(500, "INTERNAL_ERROR", "Failed to read club staff recipients.", {
            announcementId: announcement.id,
            clubId: announcement.club_id,
            clubMembersError: clubMembersError.message,
            clubMembersErrorCode: clubMembersError.code,
          });
        }

        recipientUserIds = recipientUserIds.concat(clubMembers.map((row) => row.user_id));
      }
    }

    recipientUserIds = unique(recipientUserIds);

    if (recipientUserIds.length === 0) {
      return errorResponse(404, "NOTIFICATION_RECIPIENTS_NOT_FOUND", "No announcement recipients were found.", {
        announcementId: announcement.id,
      });
    }

    const { data: activeProfiles, error: activeProfilesError } = await supabase
      .from("profiles")
      .select("id")
      .in("id", recipientUserIds)
      .eq("status", "ACTIVE")
      .returns<ActiveProfileRow[]>();

    if (activeProfilesError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to filter active announcement recipients.", {
        activeProfilesError: activeProfilesError.message,
        activeProfilesErrorCode: activeProfilesError.code,
        announcementId: announcement.id,
      });
    }

    const activeProfileIds = new Set(activeProfiles.map((activeProfile) => activeProfile.id));
    recipientUserIds = recipientUserIds.filter((recipientUserId) => activeProfileIds.has(recipientUserId));

    let recipientsSkippedPreferenceDisabled = 0;

    if (recipientUserIds.length > 0) {
      let preferenceQuery = supabase
        .from("announcement_notification_preferences")
        .select("user_id,push_enabled")
        .in("user_id", recipientUserIds);

      if (announcement.club_id === null) {
        preferenceQuery = preferenceQuery.eq("source_type", "PLATFORM").is("club_id", null);
      } else {
        preferenceQuery = preferenceQuery.eq("source_type", "CLUB").eq("club_id", announcement.club_id);
      }

      const { data: preferenceRows, error: preferenceError } =
        await preferenceQuery.returns<AnnouncementPreferenceRow[]>();

      if (preferenceError !== null) {
        return errorResponse(500, "INTERNAL_ERROR", "Failed to read announcement notification preferences.", {
          announcementId: announcement.id,
          announcementSourceClubId: announcement.club_id,
          preferenceError: preferenceError.message,
          preferenceErrorCode: preferenceError.code,
        });
      }

      const disabledUserIds = new Set(
        preferenceRows
          .filter((preference) => !preference.push_enabled)
          .map((preference) => preference.user_id)
      );

      recipientsSkippedPreferenceDisabled = recipientUserIds.filter((recipientUserId) =>
        disabledUserIds.has(recipientUserId)
      ).length;
      recipientUserIds = recipientUserIds.filter((recipientUserId) => !disabledUserIds.has(recipientUserId));
    }

    if (recipientUserIds.length === 0) {
      return errorResponse(404, "NOTIFICATION_RECIPIENTS_NOT_FOUND", "All announcement recipients have disabled this push source.", {
        announcementId: announcement.id,
        recipientsSkippedPreferenceDisabled,
      });
    }

    const { data: deviceTokens, error: deviceTokensError } = await supabase
      .from("device_tokens")
      .select("user_id,expo_push_token")
      .in("user_id", recipientUserIds)
      .eq("enabled", true)
      .returns<DeviceTokenRow[]>();

    if (deviceTokensError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read announcement recipient device tokens.", {
        announcementId: announcement.id,
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
        expoPushTokens,
        userId: recipientUserId,
      });
    }

    if (pushTargets.length === 0) {
      return errorResponse(404, "NOTIFICATION_RECIPIENTS_NOT_FOUND", "No enabled device tokens were found for announcement recipients.", {
        announcementId: announcement.id,
        recipientsSkippedNoDeviceToken,
      });
    }

    const pushMessages: ExpoPushMessage[] = [];
    const pushMessageOwners: string[] = [];

    for (const pushTarget of pushTargets) {
      for (const expoPushToken of pushTarget.expoPushTokens) {
        pushMessages.push({
          to: expoPushToken,
          title: announcement.title,
          body: announcement.body,
          data: {
            type: "ANNOUNCEMENT",
            announcementId: announcement.id,
            clubId: announcement.club_id,
            ctaUrl: announcement.cta_url,
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
        body: announcement.body,
        channel: "PUSH",
        payload: {
          announcementId: announcement.id,
          clubId: announcement.club_id,
          ctaLabel: announcement.cta_label,
          ctaUrl: announcement.cta_url,
          deliveryResults: serializeTokenResults(tokenResults),
          deviceTokenCount: pushTarget.expoPushTokens.length,
        },
        sent_at: hasSuccessfulDelivery ? new Date().toISOString() : null,
        status: hasSuccessfulDelivery ? "SENT" : "FAILED",
        title: announcement.title,
        type: "ANNOUNCEMENT",
        user_id: pushTarget.userId,
      };
    });

    const { error: insertNotificationsError } = await supabase
      .from("notifications")
      .insert(notificationRows);

    if (insertNotificationsError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to record announcement notifications.", {
        announcementId: announcement.id,
        insertNotificationsError: insertNotificationsError.message,
        insertNotificationsErrorCode: insertNotificationsError.code,
      });
    }

    const notificationsSent = notificationRows.filter((row) => row.status === "SENT").length;
    const notificationsFailed = notificationRows.length - notificationsSent;

    const { error: auditLogError } = await supabase
      .from("audit_logs")
      .insert({
        action: "ANNOUNCEMENT_PUSH_SENT",
        actor_user_id: user.id,
        metadata: {
          announcementAudience: announcement.audience,
          announcementClubId: announcement.club_id,
          notificationsCreated: notificationRows.length,
          notificationsFailed,
          notificationsSent,
          recipientsSkippedPreferenceDisabled,
          recipientsSkippedNoDeviceToken,
        },
        resource_id: announcement.id,
        resource_type: "announcement",
      });

    if (auditLogError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to write announcement push audit log.", {
        announcementId: announcement.id,
        auditLogError: auditLogError.message,
        auditLogErrorCode: auditLogError.code,
      });
    }

    return jsonResponse({
      announcementId: announcement.id,
      message: notificationsFailed > 0
        ? "Announcement push sent with partial delivery failures."
        : "Announcement push sent successfully.",
      notificationsCreated: notificationRows.length,
      notificationsFailed,
      notificationsSent,
      recipientsSkippedPreferenceDisabled,
      recipientsSkippedNoDeviceToken,
      status: notificationsFailed > 0 ? "PARTIAL_SUCCESS" : "SUCCESS",
      type: "ANNOUNCEMENT",
    }, 200);
  } catch (error) {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to send announcement push.", {
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
});
