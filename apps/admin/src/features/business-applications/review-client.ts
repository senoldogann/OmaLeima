import type { ReviewMutationResponse } from "@/features/business-applications/types";

export const reviewRefreshableStatuses = new Set<string>([
  "SUCCESS",
  "APPLICATION_NOT_PENDING",
  "APPLICATION_NOT_FOUND",
  "BUSINESS_ALREADY_CREATED",
]);

export const submitReviewRequestAsync = async (
  endpoint: "/api/admin/business-applications/approve" | "/api/admin/business-applications/reject",
  body: Record<string, string>
): Promise<ReviewMutationResponse> => {
  const response = await fetch(endpoint, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json()) as Partial<ReviewMutationResponse>;
  const message =
    typeof responseBody.message === "string" ? responseBody.message : "Business application review request completed.";
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
