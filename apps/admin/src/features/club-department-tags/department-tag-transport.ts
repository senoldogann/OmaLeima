import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchClubEventContextAsync } from "@/features/club-events/context";
import type { ClubDepartmentTagMutationResponse } from "@/features/club-department-tags/types";

type ClubDepartmentTagTransportResult = {
  response: ClubDepartmentTagMutationResponse;
  status: number;
};

type CreateDepartmentTagRpcPayload = {
  departmentTagId?: string;
  tagSlug?: string;
  status?: string;
};

const buildDepartmentTagMessage = (
  status: string | null,
  successMessage = "Official department tag created successfully."
): string => {
  const messages: Record<string, string> = {
    ACTOR_NOT_ALLOWED: "The authenticated session does not match the organizer account.",
    AUTH_REQUIRED: "Sign in again before creating an official department tag.",
    CLUB_MEMBERSHIP_NOT_ALLOWED: "The selected club membership is not active anymore.",
    CLUB_NOT_ACTIVE: "The selected club could not be found.",
    CLUB_TAG_CREATOR_NOT_ALLOWED: "Only organizers or owners can create official department tags.",
    CLUB_TAG_EDITOR_NOT_ALLOWED: "Only organizers or owners can edit official department tags.",
    DEPARTMENT_TAG_ALREADY_EXISTS: "This club already has an active official tag with the same title.",
    DEPARTMENT_TAG_NOT_FOUND: "The official department tag could not be found for this organizer account.",
    DEPARTMENT_TAG_SLUG_CONFLICT: "Department tag slug generation conflicted unexpectedly. Try again.",
    DEPARTMENT_TAG_TITLE_REQUIRED: "Department tag title is required.",
    FUNCTION_ERROR: "Official department tag request failed unexpectedly.",
    PROFILE_NOT_ACTIVE: "Only active organizer accounts can create official department tags.",
    PROFILE_NOT_FOUND: "The organizer profile could not be found.",
    SUCCESS: successMessage,
  };

  return status === null
    ? "Official department tag request completed."
    : (messages[status] ?? "Official department tag request completed.");
};

export const requireClubDepartmentTagEditorAccessAsync = async (
  supabase: SupabaseClient
): Promise<ClubDepartmentTagTransportResult | null> => {
  const context = await fetchClubEventContextAsync(supabase);

  if (context.access.area !== "club") {
    return {
      response: {
        message: "Only club organizers can create official department tags.",
        status: "CLUB_NOT_ALLOWED",
      },
      status: 403,
    };
  }

  if (context.access.userId === null) {
    return {
      response: {
        message: "Sign in again before creating an official department tag.",
        status: "AUTH_REQUIRED",
      },
      status: 401,
    };
  }

  const canManageDepartmentTags = context.memberships.some((membership) => membership.canCreateEvents);

  if (!canManageDepartmentTags) {
    return {
      response: {
        message: "Only club organizers or owners can create official department tags.",
        status: "CLUB_NOT_ALLOWED",
      },
      status: 403,
    };
  }

  return null;
};

export const invokeCreateClubDepartmentTagRpcAsync = async (
  supabase: SupabaseClient,
  payload: {
    clubId: string;
    createdBy: string;
    title: string;
  }
): Promise<ClubDepartmentTagTransportResult> => {
  const { data, error } = await supabase.rpc("create_club_department_tag_atomic", {
    p_club_id: payload.clubId,
    p_created_by: payload.createdBy,
    p_title: payload.title,
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

  const responsePayload = data as CreateDepartmentTagRpcPayload | null;
  const status = typeof responsePayload?.status === "string" ? responsePayload.status : null;

  return {
    response: {
      message: buildDepartmentTagMessage(status),
      status,
    },
    status: 200,
  };
};

export const invokeUpdateClubDepartmentTagRpcAsync = async (
  supabase: SupabaseClient,
  payload: {
    actorUserId: string;
    departmentTagId: string;
    title: string;
  }
): Promise<ClubDepartmentTagTransportResult> => {
  const { data, error } = await supabase.rpc("update_club_department_tag_atomic", {
    p_actor_user_id: payload.actorUserId,
    p_department_tag_id: payload.departmentTagId,
    p_title: payload.title,
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

  const responsePayload = data as CreateDepartmentTagRpcPayload | null;
  const status = typeof responsePayload?.status === "string" ? responsePayload.status : null;

  return {
    response: {
      message: buildDepartmentTagMessage(status, "Official department tag updated successfully."),
      status,
    },
    status: status === "DEPARTMENT_TAG_NOT_FOUND" ? 404 : 200,
  };
};

export const invokeDeleteClubDepartmentTagRpcAsync = async (
  supabase: SupabaseClient,
  payload: {
    actorUserId: string;
    departmentTagId: string;
  }
): Promise<ClubDepartmentTagTransportResult> => {
  const { data, error } = await supabase.rpc("delete_club_department_tag_atomic", {
    p_actor_user_id: payload.actorUserId,
    p_department_tag_id: payload.departmentTagId,
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

  const responsePayload = data as CreateDepartmentTagRpcPayload | null;
  const status = typeof responsePayload?.status === "string" ? responsePayload.status : null;

  return {
    response: {
      message: buildDepartmentTagMessage(status, "Official department tag deleted successfully."),
      status,
    },
    status: status === "DEPARTMENT_TAG_NOT_FOUND" ? 404 : 200,
  };
};
