import type {
  FraudSignalResolutionStatus,
  FraudSignalReviewMutationResponse,
} from "@/features/fraud-review/types";

type FraudSignalReviewRequest = {
  resolutionNote: string;
  signalId: string;
  status: FraudSignalResolutionStatus;
};

export const fraudReviewRefreshableStatuses = new Set<string>(["SUCCESS"]);

export const submitFraudSignalReviewRequestAsync = async (
  request: FraudSignalReviewRequest
): Promise<FraudSignalReviewMutationResponse> => {
  const response = await fetch("/api/fraud-signals/review", {
    body: JSON.stringify(request),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json()) as Partial<FraudSignalReviewMutationResponse>;

  if (!response.ok) {
    throw new Error(payload.message ?? "Fraud signal review request failed.");
  }

  return {
    message: payload.message ?? "Fraud signal review request completed.",
    status: typeof payload.status === "string" ? payload.status : null,
  };
};
