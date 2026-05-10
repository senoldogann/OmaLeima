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
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

type SendAnnouncementPushRequest = {
  announcementId: string;
};

type ErrorResponseCode = Parameters<typeof errorResponse>[1];

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
  event_id: string | null;
  image_url: string | null;
  starts_at: string;
  status: "ARCHIVED" | "DRAFT" | "PUBLISHED";
  target_city: string | null;
  title: string;
};

type ClubMemberRow = {
  user_id: string;
};

type BusinessStaffRow = {
  user_id: string;
};

type BusinessRow = {
  city: string | null;
  id: string;
};

type ClubRow = {
  city: string | null;
  id: string;
};

type EventRow = {
  city: string;
  id: string;
  status: "ACTIVE" | "ARCHIVED" | "COMPLETED" | "DRAFT" | "PUBLISHED";
};

type EventVenueRow = {
  business_id: string;
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

type PushTarget = {
  expoPushTokens: string[];
  userId: string;
};

type NotificationInsertRow = {
  body: string;
  channel: "PUSH";
  delivery_attempt_id: string;
  event_id: string | null;
  payload: Record<string, unknown>;
  sent_at: string | null;
  status: "FAILED" | "SENT";
  title: string;
  type: "ANNOUNCEMENT";
  user_id: string;
};

type DeliveryAttemptStatus = "FAILED" | "NO_TARGETS" | "PARTIAL" | "PENDING" | "SENT";

type DeliveryAttemptRow = {
  id: string;
};

type DeliveryAttemptUpdate = {
  completed_at?: string;
  error_code?: string;
  error_message?: string;
  expo_ticket_results?: Record<string, unknown>[];
  notifications_created?: number;
  notifications_failed?: number;
  notifications_sent?: number;
  status: DeliveryAttemptStatus;
};

type CreateDeliveryAttemptParams = {
  announcement: AnnouncementRow;
  createdBy: string;
  recipientCount: number;
  recipientsSkippedNoDeviceToken: number;
  recipientsSkippedPreferenceDisabled: number;
  targetTokenCount: number;
  targetUserCount: number;
};

type NoTargetResponseParams = {
  activeRecipientCountBeforePreferenceFilter: number;
  announcement: AnnouncementRow;
  createdBy: string;
  message: string;
  noTargetReason: string;
  recipientCountAfterPreferenceFilter: number;
  recipientCountBeforePreferenceFilter: number;
  recipientsSkippedNoDeviceToken: number;
  recipientsSkippedPreferenceDisabled: number;
  supabase: SupabaseClient;
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

const serializeAttemptTicketResults = (
  pushResults: ExpoPushSendResult[],
  pushMessageOwners: string[]
): Record<string, unknown>[] =>
  pushResults.map((result, index): Record<string, unknown> => {
    const userId = pushMessageOwners[index] ?? null;

    return result.ok
      ? {
          ok: true,
          ticketId: result.ticketId,
          userId,
        }
      : {
          ok: false,
          error: result.message,
          userId,
        };
  });

const getDeliveryAttemptStatus = (
  notificationsSent: number,
  notificationsFailed: number
): DeliveryAttemptStatus => {
  if (notificationsSent === 0 && notificationsFailed > 0) {
    return "FAILED";
  }

  if (notificationsFailed > 0) {
    return "PARTIAL";
  }

  return "SENT";
};

const unique = (values: string[]): string[] => Array.from(new Set(values));

const recipientQueryBatchSize = 500;
const announcementPushRateLimitOptions = {
  dayMaxRequests: 80,
  windowMaxRequests: 6,
  windowSeconds: 60,
};

const normalizeCityKey = (city: string | null): string =>
  (city ?? "").trim().toLowerCase();

type AuditedAnnouncementPushErrorParams = {
  actorUserId: string | null;
  announcementId: string | null;
  code: ErrorResponseCode;
  details: Record<string, unknown>;
  message: string;
  status: number;
  supabase: SupabaseClient;
};

const auditedAnnouncementPushErrorResponseAsync = async ({
  actorUserId,
  announcementId,
  code,
  details,
  message,
  status,
  supabase,
}: AuditedAnnouncementPushErrorParams): Promise<Response> => {
  const { error: auditLogError } = await supabase
    .from("audit_logs")
    .insert({
      action: "ANNOUNCEMENT_PUSH_FAILED",
      actor_user_id: actorUserId,
      metadata: {
        ...details,
        code,
        message,
        httpStatus: status,
      },
      resource_id: announcementId,
      resource_type: "announcement",
    });

  if (auditLogError !== null) {
    console.warn("announcement_push_failure_audit_failed", {
      announcementId,
      auditLogError: auditLogError.message,
      auditLogErrorCode: auditLogError.code,
      code,
    });
  }

  return errorResponse(status, code, message, details);
};

const chunkStrings = (values: string[], chunkSize: number): string[][] => {
  if (chunkSize <= 0) {
    throw new Error(`Invalid chunk size for announcement recipient query: ${chunkSize}.`);
  }

  const chunks: string[][] = [];

  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }

  return chunks;
};

const fetchClubRegistrationRecipientsAsync = async (
  supabase: SupabaseClient,
  eventIds: string[],
  announcementId: string,
  clubId: string | null
): Promise<Response | string[]> => {
  const recipients: string[] = [];

  for (const eventIdBatch of chunkStrings(eventIds, recipientQueryBatchSize)) {
    const { data: registrations, error: registrationsError } = await supabase
      .from("event_registrations")
      .select("student_id")
      .in("event_id", eventIdBatch)
      .eq("status", "REGISTERED")
      .returns<RegistrationRow[]>();

    if (registrationsError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read club event registrations.", {
        announcementId,
        clubId,
        eventBatchSize: eventIdBatch.length,
        registrationsError: registrationsError.message,
        registrationsErrorCode: registrationsError.code,
      });
    }

    recipients.push(...registrations.map((registration) => registration.student_id));
  }

  return recipients;
};

const fetchClubBusinessRecipientsAsync = async (
  supabase: SupabaseClient,
  eventIds: string[],
  announcementId: string,
  clubId: string | null
): Promise<Response | string[]> => {
  const businessIds: string[] = [];

  for (const eventIdBatch of chunkStrings(eventIds, recipientQueryBatchSize)) {
    const { data: venues, error: venuesError } = await supabase
      .from("event_venues")
      .select("business_id")
      .in("event_id", eventIdBatch)
      .eq("status", "JOINED")
      .returns<EventVenueRow[]>();

    if (venuesError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read club event business recipients.", {
        announcementId,
        clubId,
        eventBatchSize: eventIdBatch.length,
        venuesError: venuesError.message,
        venuesErrorCode: venuesError.code,
      });
    }

    businessIds.push(...venues.map((venue) => venue.business_id));
  }

  const uniqueBusinessIds = unique(businessIds);
  const recipients: string[] = [];

  for (const businessIdBatch of chunkStrings(uniqueBusinessIds, recipientQueryBatchSize)) {
    const { data: businessStaff, error: businessStaffError } = await supabase
      .from("business_staff")
      .select("user_id")
      .in("business_id", businessIdBatch)
      .eq("status", "ACTIVE")
      .returns<BusinessStaffRow[]>();

    if (businessStaffError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read club event business staff recipients.", {
        announcementId,
        businessBatchSize: businessIdBatch.length,
        clubId,
        businessStaffError: businessStaffError.message,
        businessStaffErrorCode: businessStaffError.code,
      });
    }

    recipients.push(...businessStaff.map((row) => row.user_id));
  }

  return recipients;
};

const fetchBusinessRecipientsByCityAsync = async (
  supabase: SupabaseClient,
  city: string,
  announcementId: string
): Promise<Response | string[]> => {
  const { data: businesses, error: businessesError } = await supabase
    .from("businesses")
    .select("id,city")
    .eq("status", "ACTIVE")
    .returns<BusinessRow[]>();

  if (businessesError !== null) {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to read city business recipients.", {
      announcementId,
      businessesError: businessesError.message,
      businessesErrorCode: businessesError.code,
      city,
    });
  }

  const targetCityKey = normalizeCityKey(city);
  const businessIds = businesses
    .filter((business) => normalizeCityKey(business.city) === targetCityKey)
    .map((business) => business.id);

  if (businessIds.length === 0) {
    return [];
  }

  const recipients: string[] = [];

  for (const businessIdBatch of chunkStrings(businessIds, recipientQueryBatchSize)) {
    const { data: businessStaff, error: businessStaffError } = await supabase
      .from("business_staff")
      .select("user_id")
      .in("business_id", businessIdBatch)
      .eq("status", "ACTIVE")
      .returns<BusinessStaffRow[]>();

    if (businessStaffError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read city business staff recipients.", {
        announcementId,
        businessBatchSize: businessIdBatch.length,
        businessStaffError: businessStaffError.message,
        businessStaffErrorCode: businessStaffError.code,
        city,
      });
    }

    recipients.push(...businessStaff.map((row) => row.user_id));
  }

  return recipients;
};

const fetchClubRecipientsByCityAsync = async (
  supabase: SupabaseClient,
  city: string,
  announcementId: string
): Promise<Response | string[]> => {
  const { data: clubs, error: clubsError } = await supabase
    .from("clubs")
    .select("id,city")
    .eq("status", "ACTIVE")
    .returns<ClubRow[]>();

  if (clubsError !== null) {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to read city club recipients.", {
      announcementId,
      city,
      clubsError: clubsError.message,
      clubsErrorCode: clubsError.code,
    });
  }

  const targetCityKey = normalizeCityKey(city);
  const clubIds = clubs
    .filter((club) => normalizeCityKey(club.city) === targetCityKey)
    .map((club) => club.id);

  if (clubIds.length === 0) {
    return [];
  }

  const recipients: string[] = [];

  for (const clubIdBatch of chunkStrings(clubIds, recipientQueryBatchSize)) {
    const { data: clubMembers, error: clubMembersError } = await supabase
      .from("club_members")
      .select("user_id")
      .in("club_id", clubIdBatch)
      .eq("status", "ACTIVE")
      .returns<ClubMemberRow[]>();

    if (clubMembersError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read city club staff recipients.", {
        announcementId,
        city,
        clubBatchSize: clubIdBatch.length,
        clubMembersError: clubMembersError.message,
        clubMembersErrorCode: clubMembersError.code,
      });
    }

    recipients.push(...clubMembers.map((row) => row.user_id));
  }

  return recipients;
};

const fetchActiveProfileIdsAsync = async (
  supabase: SupabaseClient,
  recipientUserIds: string[],
  announcementId: string
): Promise<Response | Set<string>> => {
  const activeProfileIds = new Set<string>();

  for (const recipientUserIdBatch of chunkStrings(recipientUserIds, recipientQueryBatchSize)) {
    const { data: activeProfiles, error: activeProfilesError } = await supabase
      .from("profiles")
      .select("id")
      .in("id", recipientUserIdBatch)
      .eq("status", "ACTIVE")
      .returns<ActiveProfileRow[]>();

    if (activeProfilesError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to filter active announcement recipients.", {
        activeProfilesError: activeProfilesError.message,
        activeProfilesErrorCode: activeProfilesError.code,
        announcementId,
        recipientBatchSize: recipientUserIdBatch.length,
      });
    }

    activeProfiles.forEach((activeProfile) => activeProfileIds.add(activeProfile.id));
  }

  return activeProfileIds;
};

const fetchAnnouncementPreferenceRowsAsync = async (
  supabase: SupabaseClient,
  recipientUserIds: string[],
  announcement: AnnouncementRow
): Promise<Response | AnnouncementPreferenceRow[]> => {
  const preferenceRows: AnnouncementPreferenceRow[] = [];

  for (const recipientUserIdBatch of chunkStrings(recipientUserIds, recipientQueryBatchSize)) {
    const query = supabase
      .from("announcement_notification_preferences")
      .select("user_id,push_enabled")
      .in("user_id", recipientUserIdBatch);

    const filteredQuery =
      announcement.club_id === null
        ? query.eq("source_type", "PLATFORM").is("club_id", null)
        : query.eq("source_type", "CLUB").eq("club_id", announcement.club_id);

    const { data, error } = await filteredQuery.returns<AnnouncementPreferenceRow[]>();

    if (error !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read announcement notification preferences.", {
        announcementId: announcement.id,
        announcementSourceClubId: announcement.club_id,
        preferenceBatchSize: recipientUserIdBatch.length,
        preferenceError: error.message,
        preferenceErrorCode: error.code,
      });
    }

    preferenceRows.push(...data);
  }

  return preferenceRows;
};

const fetchDeviceTokensAsync = async (
  supabase: SupabaseClient,
  recipientUserIds: string[],
  announcementId: string
): Promise<Response | DeviceTokenRow[]> => {
  const deviceTokens: DeviceTokenRow[] = [];

  for (const recipientUserIdBatch of chunkStrings(recipientUserIds, recipientQueryBatchSize)) {
    const { data, error } = await supabase
      .from("device_tokens")
      .select("user_id,expo_push_token")
      .in("user_id", recipientUserIdBatch)
      .eq("enabled", true)
      .returns<DeviceTokenRow[]>();

    if (error !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read announcement recipient device tokens.", {
        announcementId,
        deviceTokensBatchSize: recipientUserIdBatch.length,
        deviceTokensError: error.message,
        deviceTokensErrorCode: error.code,
      });
    }

    deviceTokens.push(...data);
  }

  return deviceTokens;
};

const createDeliveryAttemptAsync = async (
  supabase: SupabaseClient,
  params: CreateDeliveryAttemptParams
): Promise<Response | string> => {
  const { data, error } = await supabase
    .from("announcement_push_delivery_attempts")
    .insert({
      announcement_id: params.announcement.id,
      created_by: params.createdBy,
      metadata: {
        announcementAudience: params.announcement.audience,
        announcementClubId: params.announcement.club_id,
        announcementEventId: params.announcement.event_id,
      },
      recipient_count: params.recipientCount,
      recipients_skipped_no_device_token: params.recipientsSkippedNoDeviceToken,
      recipients_skipped_preference_disabled: params.recipientsSkippedPreferenceDisabled,
      status: "PENDING",
      target_token_count: params.targetTokenCount,
      target_user_count: params.targetUserCount,
    })
    .select("id")
    .single<DeliveryAttemptRow>();

  if (error !== null || data === null) {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to create announcement push delivery attempt.", {
      announcementId: params.announcement.id,
      deliveryAttemptError: error?.message,
      deliveryAttemptErrorCode: error?.code,
      targetTokenCount: params.targetTokenCount,
      targetUserCount: params.targetUserCount,
    });
  }

  return data.id;
};

const updateDeliveryAttemptAsync = async (
  supabase: SupabaseClient,
  deliveryAttemptId: string,
  update: DeliveryAttemptUpdate,
  announcementId: string
): Promise<Response | null> => {
  const { error } = await supabase
    .from("announcement_push_delivery_attempts")
    .update(update)
    .eq("id", deliveryAttemptId);

  if (error !== null) {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to update announcement push delivery attempt.", {
      announcementId,
      deliveryAttemptError: error.message,
      deliveryAttemptErrorCode: error.code,
      deliveryAttemptId,
      deliveryAttemptStatus: update.status,
    });
  }

  return null;
};

const completeNoTargetAttemptAsync = async (params: NoTargetResponseParams): Promise<Response> => {
  const deliveryAttemptId = await createDeliveryAttemptAsync(params.supabase, {
    announcement: params.announcement,
    createdBy: params.createdBy,
    recipientCount: params.recipientCountBeforePreferenceFilter,
    recipientsSkippedNoDeviceToken: params.recipientsSkippedNoDeviceToken,
    recipientsSkippedPreferenceDisabled: params.recipientsSkippedPreferenceDisabled,
    targetTokenCount: 0,
    targetUserCount: 0,
  });

  if (deliveryAttemptId instanceof Response) {
    return deliveryAttemptId;
  }

  const updateAttemptError = await updateDeliveryAttemptAsync(
    params.supabase,
    deliveryAttemptId,
    {
      completed_at: new Date().toISOString(),
      notifications_created: 0,
      notifications_failed: 0,
      notifications_sent: 0,
      status: "NO_TARGETS",
    },
    params.announcement.id
  );

  if (updateAttemptError !== null) {
    return updateAttemptError;
  }

  const { error: auditLogError } = await params.supabase
    .from("audit_logs")
    .insert({
      action: "ANNOUNCEMENT_PUSH_SENT",
      actor_user_id: params.createdBy,
      metadata: {
        activeRecipientCountBeforePreferenceFilter: params.activeRecipientCountBeforePreferenceFilter,
        announcementAudience: params.announcement.audience,
        announcementClubId: params.announcement.club_id,
        deliveryAttemptId,
        noTargetReason: params.noTargetReason,
        notificationsCreated: 0,
        notificationsFailed: 0,
        notificationsSent: 0,
        recipientCountAfterPreferenceFilter: params.recipientCountAfterPreferenceFilter,
        recipientCountBeforePreferenceFilter: params.recipientCountBeforePreferenceFilter,
        recipientsSkippedNoDeviceToken: params.recipientsSkippedNoDeviceToken,
        recipientsSkippedPreferenceDisabled: params.recipientsSkippedPreferenceDisabled,
      },
      resource_id: params.announcement.id,
      resource_type: "announcement",
    });

  if (auditLogError !== null) {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to write announcement push audit log.", {
      announcementId: params.announcement.id,
      auditLogError: auditLogError.message,
      auditLogErrorCode: auditLogError.code,
      deliveryAttemptId,
    });
  }

  return jsonResponse({
    announcementId: params.announcement.id,
    deliveryAttemptId,
    message: params.message,
    notificationsCreated: 0,
    notificationsFailed: 0,
    notificationsSent: 0,
    recipientsSkippedNoDeviceToken: params.recipientsSkippedNoDeviceToken,
    recipientsSkippedPreferenceDisabled: params.recipientsSkippedPreferenceDisabled,
    status: "SUCCESS",
    type: "ANNOUNCEMENT",
  }, 200);
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
      return await auditedAnnouncementPushErrorResponseAsync({
        actorUserId: user.id,
        announcementId: body.announcementId,
        code: "PROFILE_NOT_ACTIVE",
        details: {
          profileStatus: profile.status,
          userId: user.id,
        },
        message: "User profile is not active.",
        status: 403,
        supabase,
      });
    }

    const rateLimitResponse = await enforceEdgeActorRateLimitAsync(
      supabase,
      user.id,
      "edge-send-announcement-push",
      announcementPushRateLimitOptions,
    );

    if (rateLimitResponse !== null) {
      return rateLimitResponse;
    }

    const { data: announcement, error: announcementError } = await supabase
      .from("announcements")
      .select("id,club_id,audience,title,body,cta_label,cta_url,image_url,status,starts_at,ends_at,event_id,target_city")
      .eq("id", body.announcementId)
      .maybeSingle<AnnouncementRow>();

    if (announcementError !== null) {
      return await auditedAnnouncementPushErrorResponseAsync({
        actorUserId: user.id,
        announcementId: body.announcementId,
        code: "INTERNAL_ERROR",
        details: {
          announcementError: announcementError.message,
          announcementErrorCode: announcementError.code,
          announcementId: body.announcementId,
        },
        message: "Failed to read announcement.",
        status: 500,
        supabase,
      });
    }

    if (announcement === null) {
      return await auditedAnnouncementPushErrorResponseAsync({
        actorUserId: user.id,
        announcementId: body.announcementId,
        code: "ANNOUNCEMENT_NOT_FOUND",
        details: {
          announcementId: body.announcementId,
        },
        message: "Announcement was not found.",
        status: 404,
        supabase,
      });
    }

    if (!isAnnouncementActiveNow(announcement)) {
      return await auditedAnnouncementPushErrorResponseAsync({
        actorUserId: user.id,
        announcementId: announcement.id,
        code: "ANNOUNCEMENT_NOT_ACTIVE",
        details: {
          announcementEndsAt: announcement.ends_at,
          announcementId: announcement.id,
          announcementStartsAt: announcement.starts_at,
          announcementStatus: announcement.status,
        },
        message: "Announcement is not active for push delivery.",
        status: 400,
        supabase,
      });
    }

    if (!isPlatformAdmin(profile)) {
      if (announcement.club_id === null) {
        return await auditedAnnouncementPushErrorResponseAsync({
          actorUserId: user.id,
          announcementId: announcement.id,
          code: "ANNOUNCEMENT_PUSH_NOT_ALLOWED",
          details: {
            announcementId: announcement.id,
            userId: user.id,
          },
          message: "Only platform admins can send platform announcements.",
          status: 403,
          supabase,
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
        return await auditedAnnouncementPushErrorResponseAsync({
          actorUserId: user.id,
          announcementId: announcement.id,
          code: "INTERNAL_ERROR",
          details: {
            announcementId: announcement.id,
            clubId: announcement.club_id,
            clubMemberError: clubMemberError.message,
            clubMemberErrorCode: clubMemberError.code,
            userId: user.id,
          },
          message: "Failed to verify club organizer access.",
          status: 500,
          supabase,
        });
      }

      if (clubMember === null) {
        return await auditedAnnouncementPushErrorResponseAsync({
          actorUserId: user.id,
          announcementId: announcement.id,
          code: "ANNOUNCEMENT_PUSH_NOT_ALLOWED",
          details: {
            announcementId: announcement.id,
            clubId: announcement.club_id,
            userId: user.id,
          },
          message: "User cannot send this club announcement.",
          status: 403,
          supabase,
        });
      }
    }

    let recipientUserIds: string[] = [];

    if (announcement.club_id === null) {
      if (announcement.audience === "BUSINESSES") {
        if (announcement.target_city !== null) {
          const businessRecipients = await fetchBusinessRecipientsByCityAsync(
            supabase,
            announcement.target_city,
            announcement.id
          );

          if (businessRecipients instanceof Response) {
            return businessRecipients;
          }

          recipientUserIds = businessRecipients;
        } else {
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
        }
      } else if (announcement.audience === "CLUBS") {
        if (announcement.target_city !== null) {
          const clubRecipients = await fetchClubRecipientsByCityAsync(
            supabase,
            announcement.target_city,
            announcement.id
          );

          if (clubRecipients instanceof Response) {
            return clubRecipients;
          }

          recipientUserIds = clubRecipients;
        } else {
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
        }
      } else {
        if (announcement.target_city !== null) {
          const { data: cityEvents, error: cityEventsError } = await supabase
            .from("events")
            .select("id,status,city")
            .in("status", ["PUBLISHED", "ACTIVE"])
            .returns<EventRow[]>();

          if (cityEventsError !== null) {
            return errorResponse(500, "INTERNAL_ERROR", "Failed to read city events for announcement recipients.", {
              announcementId: announcement.id,
              city: announcement.target_city,
              cityEventsError: cityEventsError.message,
              cityEventsErrorCode: cityEventsError.code,
            });
          }

          const targetCityKey = normalizeCityKey(announcement.target_city);
          const cityEventIds = cityEvents
            .filter((event) => normalizeCityKey(event.city) === targetCityKey)
            .map((event) => event.id);

          if (cityEventIds.length > 0 && (announcement.audience === "ALL" || announcement.audience === "STUDENTS")) {
            const registrationRecipients = await fetchClubRegistrationRecipientsAsync(
              supabase,
              cityEventIds,
              announcement.id,
              announcement.club_id
            );

            if (registrationRecipients instanceof Response) {
              return registrationRecipients;
            }

            recipientUserIds = registrationRecipients;
          }

          if (announcement.audience === "ALL") {
            const businessRecipients = await fetchBusinessRecipientsByCityAsync(
              supabase,
              announcement.target_city,
              announcement.id
            );

            if (businessRecipients instanceof Response) {
              return businessRecipients;
            }

            const clubRecipients = await fetchClubRecipientsByCityAsync(
              supabase,
              announcement.target_city,
              announcement.id
            );

            if (clubRecipients instanceof Response) {
              return clubRecipients;
            }

            recipientUserIds = recipientUserIds.concat(businessRecipients, clubRecipients);
          }
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
      }
    } else if (announcement.event_id !== null) {
      if (announcement.audience === "ALL" || announcement.audience === "STUDENTS") {
        const { data: registrations, error: registrationsError } = await supabase
          .from("event_registrations")
          .select("student_id")
          .eq("event_id", announcement.event_id)
          .eq("status", "REGISTERED")
          .returns<RegistrationRow[]>();

        if (registrationsError !== null) {
          return errorResponse(500, "INTERNAL_ERROR", "Failed to read event-scoped announcement registrations.", {
            announcementId: announcement.id,
            clubId: announcement.club_id,
            eventId: announcement.event_id,
            registrationsError: registrationsError.message,
            registrationsErrorCode: registrationsError.code,
          });
        }

        recipientUserIds = registrations.map((registration) => registration.student_id);
      }

      if (announcement.audience === "ALL" || announcement.audience === "BUSINESSES") {
        const businessRecipients = await fetchClubBusinessRecipientsAsync(
          supabase,
          [announcement.event_id],
          announcement.id,
          announcement.club_id
        );

        if (businessRecipients instanceof Response) {
          return businessRecipients;
        }

        recipientUserIds = recipientUserIds.concat(businessRecipients);
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
      let eventsQuery = supabase
        .from("events")
        .select("id,status,city")
        .eq("club_id", announcement.club_id)
        .in("status", ["PUBLISHED", "ACTIVE"]);

      const { data: events, error: eventsError } = await eventsQuery.returns<EventRow[]>();

      if (eventsError !== null) {
        return errorResponse(500, "INTERNAL_ERROR", "Failed to read club events for announcement recipients.", {
          announcementId: announcement.id,
          clubId: announcement.club_id,
          eventsError: eventsError.message,
          eventsErrorCode: eventsError.code,
        });
      }

      const targetCityKey = normalizeCityKey(announcement.target_city);
      const eventIds = events
        .filter((event) => announcement.target_city === null || normalizeCityKey(event.city) === targetCityKey)
        .map((event) => event.id);

      if (eventIds.length > 0 && (announcement.audience === "ALL" || announcement.audience === "STUDENTS")) {
        const registrationRecipients = await fetchClubRegistrationRecipientsAsync(
          supabase,
          eventIds,
          announcement.id,
          announcement.club_id
        );

        if (registrationRecipients instanceof Response) {
          return registrationRecipients;
        }

        recipientUserIds = registrationRecipients;
      }

      if (eventIds.length > 0 && (announcement.audience === "ALL" || announcement.audience === "BUSINESSES")) {
        const businessRecipients = await fetchClubBusinessRecipientsAsync(
          supabase,
          eventIds,
          announcement.id,
          announcement.club_id
        );

        if (businessRecipients instanceof Response) {
          return businessRecipients;
        }

        recipientUserIds = recipientUserIds.concat(businessRecipients);
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

    const recipientCountBeforePreferenceFilter = recipientUserIds.length;

    if (recipientUserIds.length === 0) {
      return completeNoTargetAttemptAsync({
        activeRecipientCountBeforePreferenceFilter: 0,
        announcement,
        createdBy: user.id,
        message: "Announcement push completed. No announcement recipients were found.",
        noTargetReason: "NO_RECIPIENTS",
        recipientCountAfterPreferenceFilter: 0,
        recipientCountBeforePreferenceFilter,
        recipientsSkippedNoDeviceToken: 0,
        recipientsSkippedPreferenceDisabled: 0,
        supabase,
      });
    }

    const activeProfileIdsResult = await fetchActiveProfileIdsAsync(supabase, recipientUserIds, announcement.id);

    if (activeProfileIdsResult instanceof Response) {
      return activeProfileIdsResult;
    }

    recipientUserIds = recipientUserIds.filter((recipientUserId) => activeProfileIdsResult.has(recipientUserId));

    let recipientsSkippedPreferenceDisabled = 0;
    const activeRecipientCountBeforePreferenceFilter = recipientUserIds.length;

    if (recipientUserIds.length > 0) {
      const preferenceRows = await fetchAnnouncementPreferenceRowsAsync(supabase, recipientUserIds, announcement);

      if (preferenceRows instanceof Response) {
        return preferenceRows;
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
      return completeNoTargetAttemptAsync({
        activeRecipientCountBeforePreferenceFilter,
        announcement,
        createdBy: user.id,
        message: "Announcement push completed. Every resolved active recipient has disabled notifications for this announcement source.",
        noTargetReason: "PREFERENCES_DISABLED",
        recipientCountAfterPreferenceFilter: 0,
        recipientCountBeforePreferenceFilter,
        recipientsSkippedNoDeviceToken: 0,
        recipientsSkippedPreferenceDisabled,
        supabase,
      });
    }

    const deviceTokens = await fetchDeviceTokensAsync(supabase, recipientUserIds, announcement.id);

    if (deviceTokens instanceof Response) {
      return deviceTokens;
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
      return completeNoTargetAttemptAsync({
        activeRecipientCountBeforePreferenceFilter,
        announcement,
        createdBy: user.id,
        message: "Announcement push completed. No currently enabled mobile device tokens were available.",
        noTargetReason: "NO_DEVICE_TOKENS",
        recipientCountAfterPreferenceFilter: recipientUserIds.length,
        recipientCountBeforePreferenceFilter,
        recipientsSkippedNoDeviceToken,
        recipientsSkippedPreferenceDisabled,
        supabase,
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
            eventId: announcement.event_id,
            imageUrl: announcement.image_url,
            recipientUserId: pushTarget.userId,
          },
        });
        pushMessageOwners.push(pushTarget.userId);
      }
    }

    const deliveryAttemptId = await createDeliveryAttemptAsync(supabase, {
      announcement,
      createdBy: user.id,
      recipientCount: recipientUserIds.length,
      recipientsSkippedNoDeviceToken,
      recipientsSkippedPreferenceDisabled,
      targetTokenCount: pushMessages.length,
      targetUserCount: pushTargets.length,
    });

    if (deliveryAttemptId instanceof Response) {
      return deliveryAttemptId;
    }

    let pushResults: ExpoPushSendResult[];

    try {
      pushResults = await sendExpoPushMessages(
        env.expoPushApiUrl,
        env.expoPushAccessToken,
        pushMessages,
      );
    } catch (error) {
      const updateAttemptError = await updateDeliveryAttemptAsync(
        supabase,
        deliveryAttemptId,
        {
          completed_at: new Date().toISOString(),
          error_code: "EXPO_PUSH_SEND_FAILED",
          error_message: error instanceof Error ? error.message : "unknown error",
          notifications_created: 0,
          notifications_failed: 0,
          notifications_sent: 0,
          status: "FAILED",
        },
        announcement.id
      );

      if (updateAttemptError !== null) {
        return updateAttemptError;
      }

      return errorResponse(502, "PUSH_SEND_FAILED", "Expo Push API send failed.", {
        announcementId: announcement.id,
        deliveryAttemptId,
        error: error instanceof Error ? error.message : "unknown error",
        targetTokenCount: pushMessages.length,
        targetUserCount: pushTargets.length,
      });
    }

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
        event_id: announcement.event_id,
        payload: {
          announcementId: announcement.id,
          clubId: announcement.club_id,
          ctaLabel: announcement.cta_label,
          ctaUrl: announcement.cta_url,
          deliveryResults: serializeTokenResults(tokenResults),
          deviceTokenCount: pushTarget.expoPushTokens.length,
          eventId: announcement.event_id,
          recipientUserId: pushTarget.userId,
        },
        delivery_attempt_id: deliveryAttemptId,
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
      const updateAttemptError = await updateDeliveryAttemptAsync(
        supabase,
        deliveryAttemptId,
        {
          completed_at: new Date().toISOString(),
          error_code: "NOTIFICATION_RECORDING_FAILED",
          error_message: insertNotificationsError.message,
          expo_ticket_results: serializeAttemptTicketResults(pushResults, pushMessageOwners),
          notifications_created: 0,
          notifications_failed: 0,
          notifications_sent: 0,
          status: "FAILED",
        },
        announcement.id
      );

      if (updateAttemptError !== null) {
        return updateAttemptError;
      }

      return errorResponse(500, "INTERNAL_ERROR", "Failed to record announcement notifications.", {
        announcementId: announcement.id,
        deliveryAttemptId,
        insertNotificationsError: insertNotificationsError.message,
        insertNotificationsErrorCode: insertNotificationsError.code,
      });
    }

    const notificationsSent = notificationRows.filter((row) => row.status === "SENT").length;
    const notificationsFailed = notificationRows.length - notificationsSent;
    const completedAt = new Date().toISOString();
    const deliveryAttemptStatus = getDeliveryAttemptStatus(notificationsSent, notificationsFailed);
    const updateAttemptError = await updateDeliveryAttemptAsync(
      supabase,
      deliveryAttemptId,
      {
        completed_at: completedAt,
        expo_ticket_results: serializeAttemptTicketResults(pushResults, pushMessageOwners),
        notifications_created: notificationRows.length,
        notifications_failed: notificationsFailed,
        notifications_sent: notificationsSent,
        status: deliveryAttemptStatus,
      },
      announcement.id
    );

    if (updateAttemptError !== null) {
      return updateAttemptError;
    }

    const { error: auditLogError } = await supabase
      .from("audit_logs")
      .insert({
        action: "ANNOUNCEMENT_PUSH_SENT",
        actor_user_id: user.id,
        metadata: {
          announcementAudience: announcement.audience,
          announcementClubId: announcement.club_id,
          deliveryAttemptId,
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
        deliveryAttemptId,
      });
    }

    return jsonResponse({
      announcementId: announcement.id,
      deliveryAttemptId,
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
