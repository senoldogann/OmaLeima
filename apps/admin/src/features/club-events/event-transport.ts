import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchClubEventContextAsync } from "@/features/club-events/context";
import type { ClubEventMutationResponse, EventRules } from "@/features/club-events/types";
import {
  removePublicStorageObjectByUrlAsync,
  removeReplacedPublicStorageObjectAsync,
} from "@/features/media/storage-cleanup";
import { mediaStagingBucketName, publishStagedMediaAsync } from "@/features/media/staged-media";

type ClubEventTransportResult = {
  response: ClubEventMutationResponse;
  status: number;
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
  status: "ACTIVE" | "DRAFT" | "PUBLISHED";
};

const eventMediaBucketId = "event-media";

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

const resolveExistingEventCoverUrl = ({
  existingCoverUrl,
  submittedCoverUrl,
}: {
  existingCoverUrl: string | null;
  submittedCoverUrl: string;
}): string | null => {
  if (submittedCoverUrl.trim().length === 0) {
    return null;
  }

  return existingCoverUrl;
};

const deleteStagedEventCoverAsync = async ({
  context,
  stagingPath,
  supabase,
}: {
  context: string;
  stagingPath: string | null;
  supabase: SupabaseClient;
}): Promise<void> => {
  if (stagingPath === null) {
    return;
  }

  const { error } = await supabase.storage.from(mediaStagingBucketName).remove([stagingPath]);

  if (error !== null) {
    throw new Error(`Failed to remove ${context} staged cover ${stagingPath}: ${error.message}`);
  }
};

const buildClubEventMessage = (status: string | null): string => {
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

  return status === null ? "Club event creation request completed." : messages[status] ?? "Club event creation request completed.";
};

export const requireClubEventCreatorAccessAsync = async (
  supabase: SupabaseClient
): Promise<ClubEventTransportResult | null> => {
  const context = await fetchClubEventContextAsync(supabase);

  if (context.access.area !== "club") {
    return {
      response: {
        message: "Only club organizers can create events.",
        status: "CLUB_NOT_ALLOWED",
      },
      status: 403,
    };
  }

  if (context.access.userId === null) {
    return {
      response: {
        message: "Sign in again before creating an event.",
        status: "AUTH_REQUIRED",
      },
      status: 401,
    };
  }

  return null;
};

export const invokeCreateClubEventRpcAsync = async (
  supabase: SupabaseClient,
  payload: {
    city: string;
    clubId: string;
    country: string;
    coverImageStagingPath: string;
    coverImageUrl: string;
    createdBy: string;
    description: string;
    endAtIso: string;
    joinDeadlineAtIso: string;
    maxParticipants: number | null;
    minimumStampsRequired: number;
    name: string;
    rules: EventRules;
    startAtIso: string;
    ticketUrl: string;
    visibility: "PRIVATE" | "PUBLIC" | "UNLISTED";
  }
): Promise<ClubEventTransportResult> => {
  const { data, error } = await supabase.rpc("create_club_event_atomic", {
    p_city: payload.city,
    p_club_id: payload.clubId,
    p_country: payload.country,
    p_cover_image_url: "",
    p_created_by: payload.createdBy,
    p_description: payload.description,
    p_end_at: payload.endAtIso,
    p_join_deadline_at: payload.joinDeadlineAtIso,
    p_max_participants: payload.maxParticipants,
    p_minimum_stamps_required: payload.minimumStampsRequired,
    p_name: payload.name,
    p_rules: payload.rules,
    p_start_at: payload.startAtIso,
    p_visibility: payload.visibility,
  });

  if (error !== null) {
    return {
      response: {
        message: error.message,
        status: "FUNCTION_ERROR",
      },
      status: 502,
    };
  }

  const responsePayload = data as CreateClubEventRpcPayload | null;
  const status = typeof responsePayload?.status === "string" ? responsePayload.status : null;
  const eventId = typeof responsePayload?.eventId === "string" ? responsePayload.eventId : null;

  if (status === "SUCCESS" && eventId !== null) {
    const normalizedTicketUrl = payload.ticketUrl.trim();
    const normalizedStagingPath = payload.coverImageStagingPath.trim();

    if (normalizedTicketUrl.length > 0 || normalizedStagingPath.length > 0) {
      const { data: updateData, error: ticketUrlError } = await supabase.rpc("update_club_event_atomic", {
        p_actor_user_id: payload.createdBy,
        p_city: payload.city,
        p_cover_image_staging_path: normalizedStagingPath.length === 0 ? null : normalizedStagingPath,
        p_cover_image_url: null,
        p_description: payload.description,
        p_end_at: payload.endAtIso,
        p_event_id: eventId,
        p_join_deadline_at: payload.joinDeadlineAtIso,
        p_max_participants: payload.maxParticipants,
        p_minimum_stamps_required: payload.minimumStampsRequired,
        p_name: payload.name,
        p_rules: payload.rules,
        p_start_at: payload.startAtIso,
        p_status: "DRAFT",
        p_ticket_url: normalizedTicketUrl.length === 0 ? null : normalizedTicketUrl,
        p_visibility: payload.visibility,
      });

      if (ticketUrlError !== null) {
        return {
          response: {
            message: ticketUrlError.message,
            status: "TICKET_URL_UPDATE_ERROR",
          },
          status: 502,
        };
      }

      const updatePayload = updateData as ClubEventRpcPayload | null;
      const updateStatus = typeof updatePayload?.status === "string" ? updatePayload.status : "FUNCTION_ERROR";

      if (updateStatus !== "SUCCESS") {
        return {
          response: {
            message: buildClubEventMessage(updateStatus),
            status: updateStatus,
          },
          status: updateStatus === "EVENT_UPDATE_NOT_ALLOWED" ? 403 : 200,
        };
      }
    }
  }

  return {
    response: {
      message: buildClubEventMessage(status),
      status,
    },
    status: 200,
  };
};

export const updateClubEventAsync = async (
  supabase: SupabaseClient,
  payload: {
    city: string;
    coverImageStagingPath: string;
    coverImageUrl: string;
    description: string;
    endAtIso: string;
    eventId: string;
    actorUserId: string;
    joinDeadlineAtIso: string;
    maxParticipants: number | null;
    minimumStampsRequired: number;
    name: string;
    rules: EventRules;
    startAtIso: string;
    status: "ACTIVE" | "DRAFT" | "PUBLISHED";
    ticketUrl: string;
    visibility: "PRIVATE" | "PUBLIC" | "UNLISTED";
  }
): Promise<ClubEventTransportResult> => {
  const { data: existingEvent, error: existingError } = await supabase
    .from("events")
    .select("id,club_id,cover_image_url,cover_image_staging_path,name,status")
    .eq("id", payload.eventId)
    .in("status", ["DRAFT", "PUBLISHED", "ACTIVE"])
    .maybeSingle<EventMediaLookupRow>();

  if (existingError !== null) {
    return {
      response: {
        message: existingError.message,
        status: "UPDATE_LOOKUP_ERROR",
      },
      status: 502,
    };
  }

  if (existingEvent === null) {
    return {
      response: {
        message: "Event was not updated. It may be completed, cancelled, or outside this organizer account.",
        status: "EVENT_UPDATE_NOT_ALLOWED",
      },
      status: 403,
    };
  }

  const normalizedStagingPath =
    payload.coverImageStagingPath.trim().length === 0 ? null : payload.coverImageStagingPath.trim();
  const publishedCoverImageUrl =
    payload.status === "DRAFT"
      ? null
      : await publishStagedMediaAsync({
        context: `event ${payload.eventId} cover`,
        destinationBucketId: eventMediaBucketId,
        destinationPath:
          normalizedStagingPath === null
            ? ""
            : createPublishedEventCoverPath({
              clubId: existingEvent.club_id,
              eventId: payload.eventId,
              stagingPath: normalizedStagingPath,
            }),
        stagingPath: normalizedStagingPath,
        supabase,
      });
  const nextCoverImageUrl =
    payload.status === "DRAFT"
      ? null
      : publishedCoverImageUrl ?? resolveExistingEventCoverUrl({
        existingCoverUrl: existingEvent.cover_image_url,
        submittedCoverUrl: payload.coverImageUrl,
      });
  const nextCoverImageStagingPath = payload.status === "DRAFT" ? normalizedStagingPath : null;
  const nextEventName = existingEvent.status === "ACTIVE" ? existingEvent.name : payload.name.trim();
  const normalizedTicketUrl = payload.ticketUrl.trim();

  const { data, error } = await supabase.rpc("update_club_event_atomic", {
    p_actor_user_id: payload.actorUserId,
    p_city: payload.city,
    p_cover_image_staging_path: nextCoverImageStagingPath,
    p_cover_image_url: nextCoverImageUrl,
    p_description: payload.description,
    p_end_at: payload.endAtIso,
    p_event_id: payload.eventId,
    p_join_deadline_at: payload.joinDeadlineAtIso,
    p_max_participants: payload.maxParticipants,
    p_minimum_stamps_required: payload.minimumStampsRequired,
    p_name: nextEventName,
    p_rules: payload.rules,
    p_start_at: payload.startAtIso,
    p_status: payload.status,
    p_ticket_url: normalizedTicketUrl.length === 0 ? null : normalizedTicketUrl,
    p_visibility: payload.visibility,
  });

  if (error !== null) {
    await removePublicStorageObjectByUrlAsync({
      bucketId: eventMediaBucketId,
      context: `failed event ${payload.eventId} cover publish rollback`,
      publicUrl: publishedCoverImageUrl,
      supabase,
    });

    const isCityScopeError = error.message.includes("EVENT_CITY_OUT_OF_SCOPE") || error.message.includes("CLUB_CITY_REQUIRED");

    return {
      response: {
        message: isCityScopeError ? buildClubEventMessage("EVENT_CITY_OUT_OF_SCOPE") : error.message,
        status: isCityScopeError ? "EVENT_CITY_OUT_OF_SCOPE" : "UPDATE_ERROR",
      },
      status: isCityScopeError ? 400 : 502,
    };
  }

  const responsePayload = data as ClubEventRpcPayload | null;
  const status = typeof responsePayload?.status === "string" ? responsePayload.status : "FUNCTION_ERROR";
  const eventId = typeof responsePayload?.eventId === "string" ? responsePayload.eventId : null;

  if (status !== "SUCCESS" || eventId === null) {
    await removePublicStorageObjectByUrlAsync({
      bucketId: eventMediaBucketId,
      context: `not-updated event ${payload.eventId} cover publish rollback`,
      publicUrl: publishedCoverImageUrl,
      supabase,
    });

    return {
      response: {
        message:
          status === "EVENT_UPDATE_NOT_ALLOWED"
            ? "Event was not updated. It may be completed, cancelled, or outside this organizer account."
            : buildClubEventMessage(status),
        status,
      },
      status: status === "EVENT_UPDATE_NOT_ALLOWED" ? 403 : 200,
    };
  }

  try {
    await removeReplacedPublicStorageObjectAsync({
      bucketId: eventMediaBucketId,
      context: `event ${payload.eventId} cover`,
      newPublicUrl: nextCoverImageUrl,
      oldPublicUrl: existingEvent.cover_image_url,
      supabase,
    });
    if (existingEvent.cover_image_staging_path !== null && existingEvent.cover_image_staging_path !== nextCoverImageStagingPath) {
      await deleteStagedEventCoverAsync({
        context: `event ${payload.eventId}`,
        stagingPath: existingEvent.cover_image_staging_path,
        supabase,
      });
    }
  } catch (error) {
    return {
      response: {
        message: error instanceof Error ? error.message : "Event cover replacement cleanup failed.",
        status: "IMAGE_REPLACEMENT_DELETE_ERROR",
      },
      status: 502,
    };
  }

  return {
    response: {
      message: "Event updated successfully.",
      status: "SUCCESS",
    },
    status: 200,
  };
};

export const cancelClubEventAsync = async (
  supabase: SupabaseClient,
  eventId: string,
  actorUserId: string
): Promise<ClubEventTransportResult> => {
  const { data, error } = await supabase.rpc("cancel_club_event_atomic", {
    p_actor_user_id: actorUserId,
    p_event_id: eventId,
  });

  if (error !== null) {
    return {
      response: {
        message: error.message,
        status: "CANCEL_ERROR",
      },
      status: 502,
    };
  }

  const responsePayload = data as ClubEventRpcPayload | null;
  const status = typeof responsePayload?.status === "string" ? responsePayload.status : "FUNCTION_ERROR";
  const cancelledEventId = typeof responsePayload?.eventId === "string" ? responsePayload.eventId : null;

  if (status !== "SUCCESS" || cancelledEventId === null) {
    return {
      response: {
        message:
          status === "EVENT_CANCEL_NOT_ALLOWED"
            ? "Event was not cancelled. It may already be completed, cancelled, or outside this organizer account."
            : buildClubEventMessage(status),
        status,
      },
      status: status === "EVENT_CANCEL_NOT_ALLOWED" ? 403 : 200,
    };
  }

  return {
    response: {
      message: "Event cancelled without deleting operational history.",
      status: "SUCCESS",
    },
    status: 200,
  };
};
