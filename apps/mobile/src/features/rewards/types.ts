import type { RewardTierType } from "@/features/events/types";

export type StudentRewardTimelineState = "ACTIVE" | "UPCOMING" | "COMPLETED";

export type StudentRewardTierState =
  | "CLAIMED"
  | "CLAIMABLE"
  | "MORE_NEEDED"
  | "OUT_OF_STOCK"
  | "REVOKED";

export type StudentRewardTierProgress = {
  id: string;
  title: string;
  description: string | null;
  requiredStampCount: number;
  rewardType: RewardTierType;
  inventoryTotal: number | null;
  inventoryClaimed: number;
  remainingInventory: number | null;
  claimInstructions: string | null;
  state: StudentRewardTierState;
  missingStampCount: number;
  claimedAt: string | null;
};

export type StudentRewardEventProgress = {
  id: string;
  name: string;
  city: string;
  coverImageUrl: string | null;
  startAt: string;
  endAt: string;
  status: "PUBLISHED" | "ACTIVE" | "COMPLETED";
  timelineState: StudentRewardTimelineState;
  minimumStampsRequired: number;
  stampCount: number;
  goalProgressRatio: number;
  claimableTierCount: number;
  claimedTierCount: number;
  revokedTierCount: number;
  tiers: StudentRewardTierProgress[];
};

export type StudentRewardOverview = {
  registeredEventCount: number;
  events: StudentRewardEventProgress[];
};
