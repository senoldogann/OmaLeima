import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { clubDashboardQueryKey } from "@/features/club/club-dashboard";
import { clubReportQueryKey } from "@/features/club/club-reports";
import type { ClubEventFormDraft, EventRuleValue, EventRules } from "@/features/club/types";
import {
  removePublicStorageObjectByUrlAsync,
  removeReplacedPublicStorageObjectAsync,
  readPublicStoragePath,
} from "@/features/media/storage-cleanup";
import { isMediaStagingSignedUrl, mediaStagingBucketName, publishStagedMediaAsync } from "@/features/media/staged-media";
import { supabase } from "@/lib/supabase";

type ClubEventMutationResult = {
  eventId: string | null;
  message: string;
  status: string;
};

type CreateClubEventRpcPayload = {
  eventId?: string;
  eventSlug?: string;
  status?: string;
};

type ClubEventRpcPayload = {
  eventId?: string;
  status?: string;
};

type EventMediaLookupRow = {
  club_id: string;
  cover_image_staging_path: string | null;
  cover_image_url: string | null;
  id: string;
  name: string;
  status: string;
};

type ClubEventMutationVariables = {
  draft: ClubEventFormDraft;
  userId: string;
};

type ClubEventCancelVariables = {
  eventId: string;
  userId: string;
};

type ClubEventDeleteVariables = {
  eventId: string;
  userId: string;
};

const localDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const eventMediaBucketId = "event-media";

type ParsedClubEventDraft = {
  city: string;
  coverImageStagingPath: string | null;
  coverImageUrl: string;
  description: string;
  endAtIso: string;
  endAtTime: number;
  joinDeadlineAtIso: string;
  joinDeadlineAtTime: number;
  maxParticipants: number | null;
  minimumStampsRequired: number;
  name: string;
  perBusinessLimit: number;
  startAtIso: string;
  startAtTime: number;
  ticketUrl: string | null;
};

const parseLocalDateTimeOrThrow = (
  value: string,
  fieldName: string
): { isoValue: string; timeValue: number } => {
  const normalizedValue = value.trim();

  if (!localDateTimePattern.test(normalizedValue)) {
    throw new Error(`${fieldName} must use YYYY-MM-DDTHH:mm format.`);
  }

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`${fieldName} must be a valid local datetime.`);
  }

  return {
    isoValue: parsedDate.toISOString(),
    timeValue: parsedDate.getTime(),
  };
};

const parseOptionalPositiveIntegerOrThrow = (value: string, fieldName: string): number | null => {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    return null;
  }

  const parsedValue = Number.parseInt(normalizedValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0 || String(parsedValue) !== normalizedValue) {
    throw new Error(`${fieldName} must be a positive whole number.`);
  }

  return parsedValue;
};

const parseMinimumStampsOrThrow = (value: string): number => {
  const normalizedValue = value.trim();
  const parsedValue = Number.parseInt(normalizedValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 0 || String(parsedValue) !== normalizedValue) {
    throw new Error("minimumStampsRequired must be zero or a positive whole number.");
  }

  return parsedValue;
};

const defaultPerBusinessLimit = 1;
const maximumPerBusinessLimit = 5;

const normalizePerBusinessLimit = (value: string): number => {
  const normalizedValue = value.trim();
  const parsedValue = Number.parseInt(normalizedValue, 10);

  if (
    !Number.isInteger(parsedValue) ||
    String(parsedValue) !== normalizedValue
  ) {
    return 1;
  }

  return Math.min(Math.max(parsedValue, defaultPerBusinessLimit), maximumPerBusinessLimit);
};

const isReachablePublicEventCoverUrlAsync = async (publicUrl: string | null): Promise<boolean> => {
  if (
    publicUrl === null ||
    publicUrl.trim().length === 0 ||
    readPublicStoragePath({ bucketId: eventMediaBucketId, publicUrl }) === null
  ) {
    return false;
  }

  try {
    const response = await fetch(publicUrl, {
      method: "HEAD",
    });

    return response.ok;
  } catch {
    return false;
  }
};

const parseOptionalHttpUrlOrThrow = (value: string, fieldName: string): string | null => {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    return null;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalizedValue);
  } catch {
    throw new Error(`${fieldName} must be a valid absolute URL.`);
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error(`${fieldName} must use http or https.`);
  }

  if (normalizedValue.length > 500) {
    throw new Error(`${fieldName} must be 500 characters or shorter.`);
  }

  return normalizedValue;
};

const parseOptionalText = (value: string): string | null => {
  const normalizedValue = value.trim();

  return normalizedValue.length === 0 ? null : normalizedValue;
};

const readStorageExtension = (path: string): string => {
  const extension = path.split(".").pop()?.toLowerCase();

  if (extension === "jpeg" || extension === "jpg" || extension === "png" || extension === "webp") {
    return extension;
  }

  throw new Error(`Unsupported event cover staging path extension: ${path}`);
};

const createPublishedEventCoverPath = ({
  clubId,
  eventId,
  stagingPath,
}: {
  clubId: string;
  eventId: string;
  stagingPath: string;
}): string => `clubs/${clubId}/events/${eventId}/cover-${Date.now()}.${readStorageExtension(stagingPath)}`;

const deleteStagedEventCoverAsync = async ({
  context,
  stagingPath,
}: {
  context: string;
  stagingPath: string | null;
}): Promise<void> => {
  if (stagingPath === null) {
    return;
  }

  const { error } = await supabase.storage.from(mediaStagingBucketName).remove([stagingPath]);

  if (error !== null) {
    throw new Error(`Failed to remove ${context} staged cover ${stagingPath}: ${error.message}`);
  }
};

const isEventRulesObject = (value: EventRuleValue | undefined): value is EventRules =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const buildEventRules = (existingRules: EventRules, perBusinessLimit: number): EventRules => {
  const existingStampPolicy = isEventRulesObject(existingRules.stampPolicy) ? existingRules.stampPolicy : {};

  return {
    ...existingRules,
    stampPolicy: {
      ...existingStampPolicy,
      perBusinessLimit,
    },
  };
};

const assertDraftFields = (draft: ClubEventFormDraft): void => {
  if (draft.name.trim().length < 3) {
    throw new Error("Event name must contain at least 3 characters.");
  }

  if (draft.clubId.trim().length === 0) {
    throw new Error("A club must be selected before saving the event.");
  }

  if (draft.city.trim().length < 2) {
    throw new Error("Event city must contain at least 2 characters.");
  }
};

const parseDraft = (draft: ClubEventFormDraft): ParsedClubEventDraft => {
  assertDraftFields(draft);
  const startAt = parseLocalDateTimeOrThrow(draft.startAt, "startAt");
  const endAt = parseLocalDateTimeOrThrow(draft.endAt, "endAt");
  const joinDeadlineAt = parseLocalDateTimeOrThrow(draft.joinDeadlineAt, "joinDeadlineAt");

  if (endAt.timeValue <= startAt.timeValue) {
    throw new Error("endAt must be after startAt.");
  }

  if (joinDeadlineAt.timeValue > startAt.timeValue) {
    throw new Error("joinDeadlineAt must be before or equal to startAt.");
  }

  return {
    city: draft.city.trim(),
    coverImageStagingPath: parseOptionalText(draft.coverImageStagingPath),
    coverImageUrl: draft.coverImageUrl.trim(),
    description: draft.description.trim(),
    endAtIso: endAt.isoValue,
    endAtTime: endAt.timeValue,
    joinDeadlineAtIso: joinDeadlineAt.isoValue,
    joinDeadlineAtTime: joinDeadlineAt.timeValue,
    maxParticipants: parseOptionalPositiveIntegerOrThrow(draft.maxParticipants, "maxParticipants"),
    minimumStampsRequired: parseMinimumStampsOrThrow(draft.minimumStampsRequired),
    name: draft.name.trim(),
    perBusinessLimit: normalizePerBusinessLimit(draft.perBusinessLimit),
    startAtIso: startAt.isoValue,
    startAtTime: startAt.timeValue,
    ticketUrl: parseOptionalHttpUrlOrThrow(draft.ticketUrl, "ticketUrl"),
  };
};

const buildCreateMessage = (status: string): string => {
  const messages: Record<string, string> = {
    ACTOR_NOT_ALLOWED: "The authenticated session does not match the organizer account.",
    AUTH_REQUIRED: "Sign in again before creating an event.",
    CLUB_EVENT_CREATOR_NOT_ALLOWED: "Only organizers or owners can create events for this club.",
    CLUB_MEMBERSHIP_NOT_ALLOWED: "This account does not have an active membership for the selected club.",
    CLUB_CITY_REQUIRED: "The selected club is missing a city. Update the organizer profile before creating events.",
    CLUB_NOT_ACTIVE: "The selected club is not active anymore.",
    EVENT_CITY_REQUIRED: "City is required.",
    EVENT_CITY_OUT_OF_SCOPE: "Organizer events must use the selected club city.",
    EVENT_END_BEFORE_START: "End time must be after the start time.",
    EVENT_JOIN_DEADLINE_INVALID: "Join deadline must be before the event start.",
    EVENT_MAX_PARTICIPANTS_INVALID: "Max participants must be a positive number when provided.",
    EVENT_MINIMUM_STAMPS_INVALID: "Minimum stamps must be zero or greater.",
    EVENT_ACTIVE_NAME_LOCKED: "Active event names cannot be changed after the event goes live.",
    EVENT_NAME_REQUIRED: "Event name is required.",
    EVENT_SLUG_CONFLICT: "Event slug creation collided unexpectedly. Try again.",
    EVENT_STATUS_INVALID: "Event status must be draft, published, or active.",
    EVENT_VISIBILITY_INVALID: "Visibility must be public, private, or unlisted.",
    FUNCTION_ERROR: "Club event creation failed unexpectedly.",
    PROFILE_NOT_ACTIVE: "Only active organizer accounts can create events.",
    PROFILE_NOT_FOUND: "The organizer profile could not be found.",
    SUCCESS: "Event draft created successfully.",
  };

  return messages[status] ?? "Club event creation request completed.";
};

const createClubEventDatabaseErrorMessage = ({
  action,
  eventId,
  message,
  userId,
}: {
  action: string;
  eventId: string;
  message: string;
  userId: string;
}): string => {
  if (message.includes("EVENT_CITY_OUT_OF_SCOPE") || message.includes("CLUB_CITY_REQUIRED")) {
    return `Failed to ${action} club event ${eventId} for ${userId}: organizer events must use the selected club city. Database message: ${message}`;
  }

  if (message.includes("events_check") || message.includes("violates check constraint")) {
    return [
      `Failed to ${action} club event ${eventId} for ${userId}: event timing is invalid.`,
      "Make sure the end time is after the start time and the join deadline is not after the start time.",
      `Database message: ${message}`,
    ].join(" ");
  }

  return `Failed to ${action} club event ${eventId} for ${userId}: ${message}`;
};

const updateCreatedEventAfterCreateAsync = async ({
  city,
  coverImageUrl,
  coverImageStagingPath,
  description,
  endAtIso,
  eventId,
  joinDeadlineAtIso,
  maxParticipants,
  minimumStampsRequired,
  name,
  rules,
  startAtIso,
  status,
  ticketUrl,
  userId,
  visibility,
}: {
  city: string;
  coverImageUrl: string | null;
  coverImageStagingPath: string | null;
  description: string;
  endAtIso: string;
  eventId: string;
  joinDeadlineAtIso: string;
  maxParticipants: number | null;
  minimumStampsRequired: number;
  name: string;
  rules: EventRules;
  startAtIso: string;
  status: ClubEventFormDraft["status"];
  ticketUrl: string | null;
  userId: string;
  visibility: ClubEventFormDraft["visibility"];
}): Promise<void> => {
  const { data, error } = await supabase.rpc("update_club_event_atomic", {
    p_actor_user_id: userId,
    p_city: city,
    p_cover_image_staging_path: coverImageStagingPath,
    p_cover_image_url: coverImageUrl,
    p_description: description,
    p_end_at: endAtIso,
    p_event_id: eventId,
    p_join_deadline_at: joinDeadlineAtIso,
    p_max_participants: maxParticipants,
    p_minimum_stamps_required: minimumStampsRequired,
    p_name: name,
    p_rules: rules,
    p_start_at: startAtIso,
    p_status: status,
    p_ticket_url: ticketUrl,
    p_visibility: visibility,
  });

  if (error !== null) {
    throw new Error(
      createClubEventDatabaseErrorMessage({
        action: "set created",
        eventId,
        message: error.message,
        userId,
      })
    );
  }

  const responsePayload = data as ClubEventRpcPayload | null;
  const rpcStatus = typeof responsePayload?.status === "string" ? responsePayload.status : "FUNCTION_ERROR";

  if (rpcStatus !== "SUCCESS") {
    throw new Error(`Created club event ${eventId} status could not be updated for ${userId}: ${buildCreateMessage(rpcStatus)}`);
  }
};

const createClubEventAsync = async ({
  draft,
  userId,
}: ClubEventMutationVariables): Promise<ClubEventMutationResult> => {
  const parsedDraft = parseDraft(draft);
  const { data, error } = await supabase.rpc("create_club_event_atomic", {
    p_city: parsedDraft.city,
    p_club_id: draft.clubId,
    p_country: "Finland",
    p_cover_image_url: "",
    p_created_by: userId,
    p_description: parsedDraft.description,
    p_end_at: parsedDraft.endAtIso,
    p_join_deadline_at: parsedDraft.joinDeadlineAtIso,
    p_max_participants: parsedDraft.maxParticipants,
    p_minimum_stamps_required: parsedDraft.minimumStampsRequired,
    p_name: parsedDraft.name,
    p_rules: buildEventRules(draft.rules, parsedDraft.perBusinessLimit),
    p_start_at: parsedDraft.startAtIso,
    p_visibility: draft.visibility,
  });

  if (error !== null) {
    throw new Error(`Failed to create club event for ${userId}: ${error.message}`);
  }

  const responsePayload = data as CreateClubEventRpcPayload | null;
  const status = typeof responsePayload?.status === "string" ? responsePayload.status : "FUNCTION_ERROR";
  const eventId = typeof responsePayload?.eventId === "string" ? responsePayload.eventId : null;

  if (status === "SUCCESS" && eventId !== null) {
    const publishedCoverImageUrl =
      draft.status === "DRAFT"
        ? null
        : await publishStagedMediaAsync({
          context: `event ${eventId} cover`,
          destinationBucketId: eventMediaBucketId,
          destinationPath:
            parsedDraft.coverImageStagingPath === null
              ? ""
              : createPublishedEventCoverPath({
                clubId: draft.clubId,
                eventId,
                stagingPath: parsedDraft.coverImageStagingPath,
              }),
          stagingPath: parsedDraft.coverImageStagingPath,
        });
    const existingPublicCoverImageUrl =
      parsedDraft.coverImageUrl.length === 0 || isMediaStagingSignedUrl(parsedDraft.coverImageUrl)
        ? null
        : parsedDraft.coverImageUrl;
    const nextCoverImageUrl =
      draft.status === "DRAFT"
        ? null
        : publishedCoverImageUrl ?? existingPublicCoverImageUrl;
    const nextCoverImageStagingPath = draft.status === "DRAFT" ? parsedDraft.coverImageStagingPath : null;

    try {
      await updateCreatedEventAfterCreateAsync({
        city: parsedDraft.city,
        coverImageStagingPath: nextCoverImageStagingPath,
        coverImageUrl: nextCoverImageUrl,
        description: parsedDraft.description,
        endAtIso: parsedDraft.endAtIso,
        eventId,
        joinDeadlineAtIso: parsedDraft.joinDeadlineAtIso,
        maxParticipants: parsedDraft.maxParticipants,
        minimumStampsRequired: parsedDraft.minimumStampsRequired,
        name: parsedDraft.name,
        rules: buildEventRules(draft.rules, parsedDraft.perBusinessLimit),
        startAtIso: parsedDraft.startAtIso,
        status: draft.status,
        ticketUrl: parsedDraft.ticketUrl,
        userId,
        visibility: draft.visibility,
      });
    } catch (error) {
      await removePublicStorageObjectByUrlAsync({
        bucketId: eventMediaBucketId,
        context: `failed event ${eventId} cover publish rollback`,
        publicUrl: publishedCoverImageUrl,
      });
      throw error;
    }
  }

  return {
    eventId,
    message:
      status === "SUCCESS" && draft.status !== "DRAFT"
        ? "Event created and published successfully."
        : buildCreateMessage(status),
    status,
  };
};

const updateClubEventAsync = async ({
  draft,
  userId,
}: ClubEventMutationVariables): Promise<ClubEventMutationResult> => {
  if (draft.eventId === null) {
    throw new Error("eventId is required before updating a club event.");
  }

  const parsedDraft = parseDraft(draft);
  const { data: existingEvent, error: existingError } = await supabase
    .from("events")
    .select("id,club_id,cover_image_url,cover_image_staging_path,name,status")
    .eq("id", draft.eventId)
    .in("status", ["DRAFT", "PUBLISHED", "ACTIVE"])
    .maybeSingle<EventMediaLookupRow>();

  if (existingError !== null) {
    throw new Error(
      createClubEventDatabaseErrorMessage({
        action: "load current cover for",
        eventId: draft.eventId,
        message: existingError.message,
        userId,
      })
    );
  }

  if (existingEvent === null) {
    return {
      eventId: null,
      message: "Event was not updated. It may be completed, cancelled, or outside this organizer account.",
      status: "EVENT_UPDATE_NOT_ALLOWED",
    };
  }

  const nextEventName = existingEvent.status === "ACTIVE" ? existingEvent.name : parsedDraft.name;
  const publishedCoverImageUrl =
    draft.status === "DRAFT"
      ? null
      : await publishStagedMediaAsync({
        context: `event ${draft.eventId} cover`,
        destinationBucketId: eventMediaBucketId,
        destinationPath:
          parsedDraft.coverImageStagingPath === null
            ? ""
            : createPublishedEventCoverPath({
              clubId: existingEvent.club_id,
              eventId: draft.eventId,
              stagingPath: parsedDraft.coverImageStagingPath,
            }),
        stagingPath: parsedDraft.coverImageStagingPath,
      });
  const existingPublicCoverImageUrl =
    parsedDraft.coverImageUrl.length === 0 || isMediaStagingSignedUrl(parsedDraft.coverImageUrl)
      ? null
      : parsedDraft.coverImageUrl;
  const verifiedExistingCoverImageUrl =
    existingPublicCoverImageUrl !== null && (await isReachablePublicEventCoverUrlAsync(existingPublicCoverImageUrl))
      ? existingPublicCoverImageUrl
      : null;
  const nextCoverImageUrl =
    draft.status === "DRAFT"
      ? null
      : publishedCoverImageUrl ?? verifiedExistingCoverImageUrl;
  const nextCoverImageStagingPath = draft.status === "DRAFT" ? parsedDraft.coverImageStagingPath : null;

  const { data, error } = await supabase.rpc("update_club_event_atomic", {
    p_actor_user_id: userId,
    p_city: parsedDraft.city,
    p_cover_image_staging_path: nextCoverImageStagingPath,
    p_cover_image_url: nextCoverImageUrl,
    p_description: parsedDraft.description,
    p_end_at: parsedDraft.endAtIso,
    p_event_id: draft.eventId,
    p_join_deadline_at: parsedDraft.joinDeadlineAtIso,
    p_max_participants: parsedDraft.maxParticipants,
    p_minimum_stamps_required: parsedDraft.minimumStampsRequired,
    p_name: nextEventName,
    p_rules: buildEventRules(draft.rules, parsedDraft.perBusinessLimit),
    p_start_at: parsedDraft.startAtIso,
    p_status: draft.status,
    p_ticket_url: parsedDraft.ticketUrl,
    p_visibility: draft.visibility,
  });

  if (error !== null) {
    await removePublicStorageObjectByUrlAsync({
      bucketId: eventMediaBucketId,
      context: `failed event ${draft.eventId} cover publish rollback`,
      publicUrl: publishedCoverImageUrl,
    });

    throw new Error(
      createClubEventDatabaseErrorMessage({
        action: "update",
        eventId: draft.eventId,
        message: error.message,
        userId,
      })
    );
  }

  const responsePayload = data as ClubEventRpcPayload | null;
  const status = typeof responsePayload?.status === "string" ? responsePayload.status : "FUNCTION_ERROR";
  const updatedEventId = typeof responsePayload?.eventId === "string" ? responsePayload.eventId : null;

  if (status !== "SUCCESS" || updatedEventId === null) {
    await removePublicStorageObjectByUrlAsync({
      bucketId: eventMediaBucketId,
      context: `not-updated event ${draft.eventId} cover publish rollback`,
      publicUrl: publishedCoverImageUrl,
    });

    return {
      eventId: null,
      message:
        status === "EVENT_UPDATE_NOT_ALLOWED"
          ? "Event was not updated. It may be completed, cancelled, or outside this organizer account."
          : buildCreateMessage(status),
      status,
    };
  }

  await removeReplacedPublicStorageObjectAsync({
    bucketId: eventMediaBucketId,
    context: `event ${draft.eventId} cover`,
    newPublicUrl: nextCoverImageUrl,
    oldPublicUrl: existingEvent.cover_image_url,
  });

  if (existingEvent.cover_image_staging_path !== null && existingEvent.cover_image_staging_path !== nextCoverImageStagingPath) {
    await deleteStagedEventCoverAsync({
      context: `event ${draft.eventId}`,
      stagingPath: existingEvent.cover_image_staging_path,
    });
  }

  return {
    eventId: updatedEventId,
    message: "Event updated successfully.",
    status: "SUCCESS",
  };
};

const deleteDraftClubEventAsync = async ({
  eventId,
  userId,
}: ClubEventDeleteVariables): Promise<ClubEventMutationResult> => {
  const { data: existingEvent, error: selectError } = await supabase
    .from("events")
    .select("id,club_id,cover_image_url,cover_image_staging_path,status")
    .eq("id", eventId)
    .maybeSingle<EventMediaLookupRow>();

  if (selectError !== null) {
    throw new Error(
      createClubEventDatabaseErrorMessage({
        action: "load before deleting",
        eventId,
        message: selectError.message,
        userId,
      })
    );
  }

  if (existingEvent === null) {
    return {
      eventId: null,
      message: "Event was not deleted. It may already be gone or outside this organizer account.",
      status: "EVENT_DELETE_NOT_ALLOWED",
    };
  }

  if (existingEvent.status !== "DRAFT") {
    return {
      eventId: null,
      message: "Only draft events can be permanently deleted. Cancel published or active events to preserve history.",
      status: "EVENT_DELETE_NOT_ALLOWED",
    };
  }

  const { data, error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("status", "DRAFT")
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error !== null) {
    throw new Error(
      createClubEventDatabaseErrorMessage({
        action: "delete draft",
        eventId,
        message: error.message,
        userId,
      })
    );
  }

  if (data === null) {
    return {
      eventId: null,
      message: "Event was not deleted. It may already be gone or outside this organizer account.",
      status: "EVENT_DELETE_NOT_ALLOWED",
    };
  }

  await removePublicStorageObjectByUrlAsync({
    bucketId: eventMediaBucketId,
    context: `event ${eventId} cover`,
    publicUrl: existingEvent.cover_image_url,
  });
  await deleteStagedEventCoverAsync({
    context: `event ${eventId}`,
    stagingPath: existingEvent.cover_image_staging_path,
  });

  return {
    eventId: data.id,
    message: "Draft event deleted successfully.",
    status: "SUCCESS",
  };
};

const cancelClubEventAsync = async ({
  eventId,
  userId,
}: ClubEventCancelVariables): Promise<ClubEventMutationResult> => {
  const { data, error } = await supabase.rpc("cancel_club_event_atomic", {
    p_actor_user_id: userId,
    p_event_id: eventId,
  });

  if (error !== null) {
    throw new Error(
      createClubEventDatabaseErrorMessage({
        action: "cancel",
        eventId,
        message: error.message,
        userId,
      })
    );
  }

  const responsePayload = data as ClubEventRpcPayload | null;
  const status = typeof responsePayload?.status === "string" ? responsePayload.status : "FUNCTION_ERROR";
  const cancelledEventId = typeof responsePayload?.eventId === "string" ? responsePayload.eventId : null;

  if (status !== "SUCCESS" || cancelledEventId === null) {
    return {
      eventId: null,
      message:
        status === "EVENT_CANCEL_NOT_ALLOWED"
          ? "Event was not cancelled. It may already be completed, cancelled, or outside this organizer account."
          : buildCreateMessage(status),
      status,
    };
  }

  return {
    eventId: cancelledEventId,
    message: "Event cancelled without deleting operational history.",
    status: "SUCCESS",
  };
};

export const useCreateClubEventMutation = (): UseMutationResult<
  ClubEventMutationResult,
  Error,
  ClubEventMutationVariables
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClubEventAsync,
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: clubDashboardQueryKey(variables.userId),
      });
      await queryClient.invalidateQueries({
        queryKey: clubReportQueryKey(variables.userId),
      });
    },
  });
};

export const useUpdateClubEventMutation = (): UseMutationResult<
  ClubEventMutationResult,
  Error,
  ClubEventMutationVariables
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateClubEventAsync,
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: clubDashboardQueryKey(variables.userId),
      });
      await queryClient.invalidateQueries({
        queryKey: clubReportQueryKey(variables.userId),
      });
    },
  });
};

export const useCancelClubEventMutation = (): UseMutationResult<
  ClubEventMutationResult,
  Error,
  ClubEventCancelVariables
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelClubEventAsync,
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: clubDashboardQueryKey(variables.userId),
      });
      await queryClient.invalidateQueries({
        queryKey: clubReportQueryKey(variables.userId),
      });
    },
  });
};

export const useDeleteDraftClubEventMutation = (): UseMutationResult<
  ClubEventMutationResult,
  Error,
  ClubEventDeleteVariables
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDraftClubEventAsync,
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: clubDashboardQueryKey(variables.userId),
      });
      await queryClient.invalidateQueries({
        queryKey: clubReportQueryKey(variables.userId),
      });
    },
  });
};
