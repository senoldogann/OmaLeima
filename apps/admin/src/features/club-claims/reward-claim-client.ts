import type {
  ClubRewardClaimConfirmPayload,
  ClubRewardClaimMutationResponse,
} from "@/features/club-claims/types";

export const rewardClaimRefreshableStatuses = new Set<string>(["SUCCESS"]);

const parseResponseAsync = async (response: Response): Promise<ClubRewardClaimMutationResponse> => {
  const responseBody = (await response.json()) as Partial<ClubRewardClaimMutationResponse>;
  const message =
    typeof responseBody.message === "string" ? responseBody.message : "Reward handoff request completed.";
  const status = typeof responseBody.status === "string" ? responseBody.status : null;

  return {
    message,
    status,
  };
};

export const submitRewardClaimConfirmRequestAsync = async (
  body: ClubRewardClaimConfirmPayload
): Promise<ClubRewardClaimMutationResponse> => {
  const response = await fetch("/api/club/reward-claims/confirm", {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseResponseAsync(response);
};
