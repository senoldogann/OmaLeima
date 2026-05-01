import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchClubEventContextAsync } from "@/features/club-events/context";
import type { ClubEventMutationResponse, EventRules } from "@/features/club-events/types";

type ClubEventTransportResult = {
  response: ClubEventMutationResponse;
  status: number;
};

type CreateClubEventRpcPayload = {
  eventId?: string;
  eventSlug?: string;
  status?: string;
};

type UpdatedEventRow = {
  id: string;
  status: string;
};

const buildClubEventMessage = (status: string | null): string => {
  const messages: Record<string, string> = {
    ACTOR_NOT_ALLOWED: "The authenticated session does not match the organizer account.",
    AUTH_REQUIRED: "Sign in again before creating an event.",
    CLUB_EVENT_CREATOR_NOT_ALLOWED: "Only organizers or owners can create events for this club.",
    CLUB_MEMBERSHIP_NOT_ALLOWED: "This account does not have an active membership for the selected club.",
    CLUB_NOT_ACTIVE: "The selected club is not active anymore.",
    EVENT_CITY_REQUIRED: "City is required.",
    EVENT_END_BEFORE_START: "End time must be after the start time.",
    EVENT_JOIN_DEADLINE_INVALID: "Join deadline must be before the event start.",
    EVENT_MAX_PARTICIPANTS_INVALID: "Max participants must be a positive number when provided.",
    EVENT_MINIMUM_STAMPS_INVALID: "Minimum stamps must be zero or greater.",
    EVENT_NAME_REQUIRED: "Event name is required.",
    EVENT_SLUG_CONFLICT: "Event slug creation collided unexpectedly. Try again.",
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
    visibility: "PRIVATE" | "PUBLIC" | "UNLISTED";
  }
): Promise<ClubEventTransportResult> => {
  const { data, error } = await supabase.rpc("create_club_event_atomic", {
    p_city: payload.city,
    p_club_id: payload.clubId,
    p_country: payload.country,
    p_cover_image_url: payload.coverImageUrl,
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
    coverImageUrl: string;
    description: string;
    endAtIso: string;
    eventId: string;
    joinDeadlineAtIso: string;
    maxParticipants: number | null;
    minimumStampsRequired: number;
    name: string;
    rules: EventRules;
    startAtIso: string;
    status: "ACTIVE" | "DRAFT" | "PUBLISHED";
    visibility: "PRIVATE" | "PUBLIC" | "UNLISTED";
  }
): Promise<ClubEventTransportResult> => {
  const { data, error } = await supabase
    .from("events")
    .update({
      city: payload.city,
      cover_image_url: payload.coverImageUrl.trim().length === 0 ? null : payload.coverImageUrl,
      description: payload.description.trim().length === 0 ? null : payload.description,
      end_at: payload.endAtIso,
      join_deadline_at: payload.joinDeadlineAtIso,
      max_participants: payload.maxParticipants,
      minimum_stamps_required: payload.minimumStampsRequired,
      name: payload.name,
      rules: payload.rules,
      start_at: payload.startAtIso,
      status: payload.status,
      visibility: payload.visibility,
    })
    .eq("id", payload.eventId)
    .in("status", ["DRAFT", "PUBLISHED", "ACTIVE"])
    .select("id,status")
    .maybeSingle<UpdatedEventRow>();

  if (error !== null) {
    return {
      response: {
        message: error.message,
        status: "UPDATE_ERROR",
      },
      status: 502,
    };
  }

  if (data === null) {
    return {
      response: {
        message: "Event was not updated. It may be completed, cancelled, or outside this organizer account.",
        status: "EVENT_UPDATE_NOT_ALLOWED",
      },
      status: 403,
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
  eventId: string
): Promise<ClubEventTransportResult> => {
  const { data, error } = await supabase
    .from("events")
    .update({
      status: "CANCELLED",
    })
    .eq("id", eventId)
    .in("status", ["DRAFT", "PUBLISHED", "ACTIVE"])
    .select("id,status")
    .maybeSingle<UpdatedEventRow>();

  if (error !== null) {
    return {
      response: {
        message: error.message,
        status: "CANCEL_ERROR",
      },
      status: 502,
    };
  }

  if (data === null) {
    return {
      response: {
        message: "Event was not cancelled. It may already be completed, cancelled, or outside this organizer account.",
        status: "EVENT_CANCEL_NOT_ALLOWED",
      },
      status: 403,
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
