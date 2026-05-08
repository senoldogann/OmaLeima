import type {
  ClubRewardTierCreatePayload,
  ClubRewardTierMutationResponse,
  ClubRewardTierUpdatePayload,
} from "@/features/club-rewards/types";

export const rewardTierRefreshableStatuses = new Set<string>(["SUCCESS"]);

const parseResponseAsync = async (response: Response): Promise<ClubRewardTierMutationResponse> => {
  const responseBody = (await response.json()) as Partial<ClubRewardTierMutationResponse>;
  const message =
    typeof responseBody.message === "string" ? responseBody.message : "Reward tier request completed.";
  const status = typeof responseBody.status === "string" ? responseBody.status : null;

  return {
    message,
    status,
  };
};

export const submitRewardTierCreateRequestAsync = async (
  body: ClubRewardTierCreatePayload
): Promise<ClubRewardTierMutationResponse> => {
  const response = await fetch("/api/club/reward-tiers/create", {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseResponseAsync(response);
};

export const submitRewardTierUpdateRequestAsync = async (
  body: ClubRewardTierUpdatePayload
): Promise<ClubRewardTierMutationResponse> => {
  const response = await fetch("/api/club/reward-tiers/update", {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseResponseAsync(response);
};

export const submitRewardTierDeleteRequestAsync = async (
  rewardTierId: string
): Promise<ClubRewardTierMutationResponse> => {
  const response = await fetch("/api/club/reward-tiers/delete", {
    body: JSON.stringify({
      rewardTierId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseResponseAsync(response);
};
