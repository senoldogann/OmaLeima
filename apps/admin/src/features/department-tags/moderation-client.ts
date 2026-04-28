import type { DepartmentTagModerationMutationResponse } from "@/features/department-tags/types";

export const moderationRefreshableStatuses = new Set<string>([
  "SUCCESS",
  "SOURCE_TAG_ALREADY_MERGED",
  "TAG_ALREADY_BLOCKED",
  "TAG_ALREADY_MERGED",
  "SOURCE_TAG_NOT_FOUND",
  "TARGET_TAG_NOT_FOUND",
  "TAG_NOT_FOUND",
]);

export const submitDepartmentTagModerationRequestAsync = async (
  endpoint: "/api/admin/department-tags/block" | "/api/admin/department-tags/merge",
  body: Record<string, string>
): Promise<DepartmentTagModerationMutationResponse> => {
  const response = await fetch(endpoint, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json()) as Partial<DepartmentTagModerationMutationResponse>;
  const message =
    typeof responseBody.message === "string"
      ? responseBody.message
      : "Department tag moderation request completed.";
  const status = typeof responseBody.status === "string" ? responseBody.status : null;

  if (!response.ok) {
    return {
      message,
      status,
    };
  }

  return {
    message,
    status,
  };
};
