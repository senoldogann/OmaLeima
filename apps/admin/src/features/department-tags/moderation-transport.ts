import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveAdminAccessAsync } from "@/features/auth/access";
import type { DepartmentTagModerationMutationResponse } from "@/features/department-tags/types";

type ModerationTransportResult = {
  response: DepartmentTagModerationMutationResponse;
  status: number;
};

type ModerationRpcPayload = {
  message?: string;
  status?: string;
};

const buildDepartmentTagModerationMessage = (
  status: string | null,
  fallbackMessage: string
): string => {
  if (status === null) {
    return fallbackMessage;
  }

  const messages: Record<string, string> = {
    ADMIN_NOT_ALLOWED: "Only platform admins can moderate department tags.",
    AUTH_REQUIRED: "Sign in again before moderating department tags.",
    FUNCTION_ERROR: fallbackMessage,
    SOURCE_TAG_ALREADY_BLOCKED: "The source tag is already blocked and cannot be merged.",
    SOURCE_TAG_ALREADY_MERGED: "This tag was already merged into another canonical tag.",
    SOURCE_TAG_NOT_FOUND: "The selected source tag could not be found anymore.",
    SOURCE_TAG_NOT_MODERATABLE: "This source tag is not in a mergeable state anymore.",
    SOURCE_TARGET_SAME: "Choose a different canonical target before merging.",
    SUCCESS: fallbackMessage,
    TAG_ALREADY_BLOCKED: "This tag is already blocked.",
    TAG_ALREADY_MERGED: "This tag was already merged and cannot be blocked directly.",
    TAG_HAS_MERGED_DEPENDENTS: "This tag still has merged dependents and cannot be blocked.",
    TAG_NOT_FOUND: "The selected tag could not be found anymore.",
    TAG_NOT_MODERATABLE: "This tag is not in a blockable state anymore.",
    TARGET_TAG_ALREADY_MERGED: "The selected canonical target was already merged elsewhere.",
    TARGET_TAG_NOT_ACTIVE: "The selected canonical target is no longer active.",
    TARGET_TAG_NOT_FOUND: "The selected canonical target could not be found anymore.",
  };

  return messages[status] ?? fallbackMessage;
};

export const requireAdminDepartmentTagAccessAsync = async (
  supabase: SupabaseClient
): Promise<ModerationTransportResult | null> => {
  const access = await resolveAdminAccessAsync(supabase);

  if (access.area === "admin") {
    return null;
  }

  return {
    response: {
      message: "Only platform admins can moderate department tags.",
      status: "ADMIN_NOT_ALLOWED",
    },
    status: 403,
  };
};

export const invokeMergeDepartmentTagRpcAsync = async (
  supabase: SupabaseClient,
  sourceTagId: string,
  targetTagId: string
): Promise<ModerationTransportResult> => {
  const { data, error } = await supabase.rpc("merge_department_tag_atomic", {
    p_source_tag_id: sourceTagId,
    p_target_tag_id: targetTagId,
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

  const payload = data as ModerationRpcPayload | null;

  return {
    response: {
      message: buildDepartmentTagModerationMessage(
        typeof payload?.status === "string" ? payload.status : null,
        typeof payload?.status === "string" && payload.status === "SUCCESS"
          ? "Department tag merged successfully."
          : "Department tag merge request completed."
      ),
      status: typeof payload?.status === "string" ? payload.status : null,
    },
    status: 200,
  };
};

export const invokeBlockDepartmentTagRpcAsync = async (
  supabase: SupabaseClient,
  tagId: string
): Promise<ModerationTransportResult> => {
  const { data, error } = await supabase.rpc("block_department_tag_atomic", {
    p_tag_id: tagId,
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

  const payload = data as ModerationRpcPayload | null;

  return {
    response: {
      message: buildDepartmentTagModerationMessage(
        typeof payload?.status === "string" ? payload.status : null,
        typeof payload?.status === "string" && payload.status === "SUCCESS"
          ? "Department tag blocked successfully."
          : "Department tag block request completed."
      ),
      status: typeof payload?.status === "string" ? payload.status : null,
    },
    status: 200,
  };
};
