import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { clubDashboardQueryKey } from "@/features/club/club-dashboard";
import type { ClubEventFormDraft } from "@/features/club/types";
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

type UpdatedEventRow = {
  id: string;
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

const localDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const parseLocalDateTimeToIsoOrThrow = (value: string, fieldName: string): string => {
  const normalizedValue = value.trim();

  if (!localDateTimePattern.test(normalizedValue)) {
    throw new Error(`${fieldName} must use YYYY-MM-DDTHH:mm format.`);
  }

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`${fieldName} must be a valid local datetime.`);
  }

  return parsedDate.toISOString();
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

const parseDraft = (draft: ClubEventFormDraft) => {
  assertDraftFields(draft);

  return {
    city: draft.city.trim(),
    coverImageUrl: draft.coverImageUrl.trim(),
    description: draft.description.trim(),
    endAtIso: parseLocalDateTimeToIsoOrThrow(draft.endAt, "endAt"),
    joinDeadlineAtIso: parseLocalDateTimeToIsoOrThrow(draft.joinDeadlineAt, "joinDeadlineAt"),
    maxParticipants: parseOptionalPositiveIntegerOrThrow(draft.maxParticipants, "maxParticipants"),
    minimumStampsRequired: parseMinimumStampsOrThrow(draft.minimumStampsRequired),
    name: draft.name.trim(),
    startAtIso: parseLocalDateTimeToIsoOrThrow(draft.startAt, "startAt"),
  };
};

const buildCreateMessage = (status: string): string => {
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

  return messages[status] ?? "Club event creation request completed.";
};

const updateCreatedEventStatusAsync = async ({
  eventId,
  status,
  userId,
}: {
  eventId: string;
  status: ClubEventFormDraft["status"];
  userId: string;
}): Promise<void> => {
  const { data, error } = await supabase
    .from("events")
    .update({
      status,
    })
    .eq("id", eventId)
    .eq("status", "DRAFT")
    .select("id,status")
    .maybeSingle<UpdatedEventRow>();

  if (error !== null) {
    throw new Error(`Failed to set created club event ${eventId} status for ${userId}: ${error.message}`);
  }

  if (data === null) {
    throw new Error(`Created club event ${eventId} status could not be updated for ${userId}.`);
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
    p_cover_image_url: parsedDraft.coverImageUrl,
    p_created_by: userId,
    p_description: parsedDraft.description,
    p_end_at: parsedDraft.endAtIso,
    p_join_deadline_at: parsedDraft.joinDeadlineAtIso,
    p_max_participants: parsedDraft.maxParticipants,
    p_minimum_stamps_required: parsedDraft.minimumStampsRequired,
    p_name: parsedDraft.name,
    p_rules: {},
    p_start_at: parsedDraft.startAtIso,
    p_visibility: draft.visibility,
  });

  if (error !== null) {
    throw new Error(`Failed to create club event for ${userId}: ${error.message}`);
  }

  const responsePayload = data as CreateClubEventRpcPayload | null;
  const status = typeof responsePayload?.status === "string" ? responsePayload.status : "FUNCTION_ERROR";
  const eventId = typeof responsePayload?.eventId === "string" ? responsePayload.eventId : null;

  if (status === "SUCCESS" && eventId !== null && draft.status !== "DRAFT") {
    await updateCreatedEventStatusAsync({
      eventId,
      status: draft.status,
      userId,
    });
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
  const { data, error } = await supabase
    .from("events")
    .update({
      city: parsedDraft.city,
      cover_image_url: parsedDraft.coverImageUrl.length === 0 ? null : parsedDraft.coverImageUrl,
      description: parsedDraft.description.length === 0 ? null : parsedDraft.description,
      end_at: parsedDraft.endAtIso,
      join_deadline_at: parsedDraft.joinDeadlineAtIso,
      max_participants: parsedDraft.maxParticipants,
      minimum_stamps_required: parsedDraft.minimumStampsRequired,
      name: parsedDraft.name,
      start_at: parsedDraft.startAtIso,
      status: draft.status,
      visibility: draft.visibility,
    })
    .eq("id", draft.eventId)
    .in("status", ["DRAFT", "PUBLISHED", "ACTIVE"])
    .select("id,status")
    .maybeSingle<UpdatedEventRow>();

  if (error !== null) {
    throw new Error(`Failed to update club event ${draft.eventId} for ${userId}: ${error.message}`);
  }

  if (data === null) {
    return {
      eventId: null,
      message: "Event was not updated. It may be completed, cancelled, or outside this organizer account.",
      status: "EVENT_UPDATE_NOT_ALLOWED",
    };
  }

  return {
    eventId: data.id,
    message: "Event updated successfully.",
    status: "SUCCESS",
  };
};

const cancelClubEventAsync = async ({
  eventId,
  userId,
}: ClubEventCancelVariables): Promise<ClubEventMutationResult> => {
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
    throw new Error(`Failed to cancel club event ${eventId} for ${userId}: ${error.message}`);
  }

  if (data === null) {
    return {
      eventId: null,
      message: "Event was not cancelled. It may already be completed, cancelled, or outside this organizer account.",
      status: "EVENT_CANCEL_NOT_ALLOWED",
    };
  }

  return {
    eventId: data.id,
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
    },
  });
};
