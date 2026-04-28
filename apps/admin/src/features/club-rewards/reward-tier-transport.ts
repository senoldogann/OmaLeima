import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchClubEventContextAsync } from "@/features/club-events/context";
import type { ClubRewardTierMutationResponse, RewardTierStatus, RewardTierType } from "@/features/club-rewards/types";

type ClubRewardTierTransportResult = {
  response: ClubRewardTierMutationResponse;
  status: number;
};

type RewardTierRpcPayload = {
  inventoryClaimed?: number;
  rewardTierId?: string;
  status?: string;
};

const buildRewardTierMessage = (status: string | null): string => {
  const messages: Record<string, string> = {
    ACTOR_NOT_ALLOWED: "The authenticated session does not match the organizer account.",
    AUTH_REQUIRED: "Sign in again before managing reward tiers.",
    EVENT_NOT_EDITABLE: "Reward tiers can only be managed while the event is still operational.",
    EVENT_NOT_FOUND: "The selected event could not be found.",
    FUNCTION_ERROR: "Reward tier request failed unexpectedly.",
    PROFILE_NOT_ACTIVE: "Only active organizer accounts can manage reward tiers.",
    PROFILE_NOT_FOUND: "The organizer profile could not be found.",
    REWARD_INVENTORY_CONFLICT: "Inventory total cannot drop below already claimed rewards.",
    REWARD_INVENTORY_TOTAL_INVALID: "Inventory total must be zero or greater when provided.",
    REWARD_REQUIRED_STAMPS_INVALID: "Required stamps must be greater than zero.",
    REWARD_STATUS_INVALID: "Reward tier status must be active or disabled.",
    REWARD_TIER_EDITOR_NOT_ALLOWED: "Only organizers or owners can manage reward tiers for this event.",
    REWARD_TIER_NOT_FOUND: "The selected reward tier could not be found.",
    REWARD_TITLE_REQUIRED: "Reward tier title is required.",
    REWARD_TYPE_INVALID: "Reward type must be one of the supported reward categories.",
    SUCCESS: "Reward tier saved successfully.",
  };

  return status === null ? "Reward tier request completed." : messages[status] ?? "Reward tier request completed.";
};

export const requireClubRewardTierEditorAccessAsync = async (
  supabase: SupabaseClient
): Promise<ClubRewardTierTransportResult | null> => {
  const context = await fetchClubEventContextAsync(supabase);

  if (context.access.area !== "club") {
    return {
      response: {
        message: "Only club organizers can manage reward tiers.",
        status: "CLUB_NOT_ALLOWED",
      },
      status: 403,
    };
  }

  if (context.access.userId === null) {
    return {
      response: {
        message: "Sign in again before managing reward tiers.",
        status: "AUTH_REQUIRED",
      },
      status: 401,
    };
  }

  const canManageRewards = context.memberships.some((membership) => membership.canCreateEvents);

  if (!canManageRewards) {
    return {
      response: {
        message: "Only club organizers or owners can manage reward tiers.",
        status: "CLUB_NOT_ALLOWED",
      },
      status: 403,
    };
  }

  return null;
};

export const invokeCreateRewardTierRpcAsync = async (
  supabase: SupabaseClient,
  payload: {
    claimInstructions: string;
    createdBy: string;
    description: string;
    eventId: string;
    inventoryTotal: number | null;
    requiredStampCount: number;
    rewardType: RewardTierType;
    title: string;
  }
): Promise<ClubRewardTierTransportResult> => {
  const { data, error } = await supabase.rpc("create_reward_tier_atomic", {
    p_claim_instructions: payload.claimInstructions,
    p_created_by: payload.createdBy,
    p_description: payload.description,
    p_event_id: payload.eventId,
    p_inventory_total: payload.inventoryTotal,
    p_required_stamp_count: payload.requiredStampCount,
    p_reward_type: payload.rewardType,
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

  const responsePayload = data as RewardTierRpcPayload | null;
  const status = typeof responsePayload?.status === "string" ? responsePayload.status : null;

  return {
    response: {
      message: buildRewardTierMessage(status),
      status,
    },
    status: 200,
  };
};

export const invokeUpdateRewardTierRpcAsync = async (
  supabase: SupabaseClient,
  payload: {
    claimInstructions: string;
    description: string;
    inventoryTotal: number | null;
    requiredStampCount: number;
    rewardTierId: string;
    rewardType: RewardTierType;
    status: RewardTierStatus;
    title: string;
    updatedBy: string;
  }
): Promise<ClubRewardTierTransportResult> => {
  const { data, error } = await supabase.rpc("update_reward_tier_atomic", {
    p_claim_instructions: payload.claimInstructions,
    p_description: payload.description,
    p_inventory_total: payload.inventoryTotal,
    p_required_stamp_count: payload.requiredStampCount,
    p_reward_tier_id: payload.rewardTierId,
    p_reward_type: payload.rewardType,
    p_status: payload.status,
    p_title: payload.title,
    p_updated_by: payload.updatedBy,
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

  const responsePayload = data as RewardTierRpcPayload | null;
  const status = typeof responsePayload?.status === "string" ? responsePayload.status : null;

  if (status === "REWARD_INVENTORY_CONFLICT") {
    const inventoryClaimed =
      typeof responsePayload?.inventoryClaimed === "number" ? responsePayload.inventoryClaimed : null;

    return {
      response: {
        message:
          inventoryClaimed === null
            ? buildRewardTierMessage(status)
            : `Inventory total cannot be set below ${inventoryClaimed} already claimed rewards.`,
        status,
      },
      status: 200,
    };
  }

  return {
    response: {
      message: buildRewardTierMessage(status),
      status,
    },
    status: 200,
  };
};
