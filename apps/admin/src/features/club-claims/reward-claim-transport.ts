import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchClubEventContextAsync } from "@/features/club-events/context";
import type { ClubRewardClaimMutationResponse } from "@/features/club-claims/types";

type ClubRewardClaimTransportResult = {
  response: ClubRewardClaimMutationResponse;
  status: number;
};

type RewardClaimRpcPayload = {
  rewardClaimId?: string;
  status?: string;
};

const buildRewardClaimMessage = (status: string | null): string => {
  const messages: Record<string, string> = {
    AUTH_REQUIRED: "Sign in again before confirming reward handoff.",
    CLAIMER_NOT_ALLOWED: "Only active club staff can confirm rewards for this event.",
    FUNCTION_ERROR: "Reward handoff request failed unexpectedly.",
    NOT_ENOUGH_STAMPS: "Student does not have enough leimas for this reward.",
    REWARD_ALREADY_CLAIMED: "This reward was already claimed for the student.",
    REWARD_OUT_OF_STOCK: "This reward is out of stock.",
    REWARD_TIER_NOT_FOUND: "The selected reward tier could not be found for this event.",
    SUCCESS: "Reward handoff confirmed successfully.",
  };

  return status === null ? "Reward handoff request completed." : messages[status] ?? "Reward handoff request completed.";
};

const getRewardClaimHttpStatus = (status: string | null): number => {
  switch (status) {
    case "SUCCESS":
      return 200;
    case "AUTH_REQUIRED":
      return 401;
    case "CLAIMER_NOT_ALLOWED":
    case "CLUB_NOT_ALLOWED":
      return 403;
    case "REWARD_TIER_NOT_FOUND":
      return 404;
    case "NOT_ENOUGH_STAMPS":
    case "REWARD_ALREADY_CLAIMED":
    case "REWARD_OUT_OF_STOCK":
      return 409;
    case "FUNCTION_ERROR":
      return 502;
    default:
      return 500;
  }
};

export const requireClubRewardClaimAccessAsync = async (
  supabase: SupabaseClient
): Promise<ClubRewardClaimTransportResult | null> => {
  const context = await fetchClubEventContextAsync(supabase);

  if (context.access.area !== "club") {
    return {
      response: {
        message: "Only club staff can confirm reward claims.",
        status: "CLUB_NOT_ALLOWED",
      },
      status: 403,
    };
  }

  if (context.access.userId === null) {
    return {
      response: {
        message: "Sign in again before confirming reward handoff.",
        status: "AUTH_REQUIRED",
      },
      status: 401,
    };
  }

  return null;
};

export const invokeRewardClaimRpcAsync = async (
  supabase: SupabaseClient,
  payload: {
    claimedBy: string;
    eventId: string;
    notes: string;
    rewardTierId: string;
    studentId: string;
  }
): Promise<ClubRewardClaimTransportResult> => {
  const { data, error } = await supabase.rpc("claim_reward_atomic", {
    p_claimed_by: payload.claimedBy,
    p_event_id: payload.eventId,
    p_notes: payload.notes.trim().length === 0 ? null : payload.notes.trim(),
    p_reward_tier_id: payload.rewardTierId,
    p_student_id: payload.studentId,
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

  const responsePayload = data as RewardClaimRpcPayload | null;
  const status = typeof responsePayload?.status === "string" ? responsePayload.status : null;

  return {
    response: {
      message: buildRewardClaimMessage(status),
      status,
    },
    status: getRewardClaimHttpStatus(status),
  };
};
