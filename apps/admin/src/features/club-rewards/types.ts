export type RewardTierType =
  | "HAALARIMERKKI"
  | "PATCH"
  | "COUPON"
  | "PRODUCT"
  | "ENTRY"
  | "OTHER";

export type RewardTierStatus = "ACTIVE" | "DISABLED";

export type ManageableRewardEvent = {
  canManageRewards: boolean;
  city: string;
  clubId: string;
  clubName: string;
  eventId: string;
  eventStatus: "ACTIVE" | "CANCELLED" | "COMPLETED" | "DRAFT" | "PUBLISHED";
  name: string;
  rewardTierCount: number;
  startAt: string;
};

export type ClubRewardTierRecord = {
  canEdit: boolean;
  claimInstructions: string | null;
  createdAt: string;
  description: string | null;
  eventId: string;
  eventName: string;
  eventStatus: ManageableRewardEvent["eventStatus"];
  inventoryClaimed: number;
  inventoryRemaining: number | null;
  inventoryTotal: number | null;
  rewardTierId: string;
  rewardType: RewardTierType;
  requiredStampCount: number;
  status: RewardTierStatus;
  stockState: "AVAILABLE" | "LOW" | "OUT" | "UNLIMITED";
  title: string;
};

export type ClubRewardsSummary = {
  activeTierCount: number;
  claimedUnitCount: number;
  editableEventCount: number;
  lowStockTierCount: number;
  manageableEventCount: number;
  totalTierCount: number;
  visibleTierCount: number;
};

export type ClubRewardsSnapshot = {
  events: ManageableRewardEvent[];
  rewardTiers: ClubRewardTierRecord[];
  summary: ClubRewardsSummary;
};

export type ClubRewardTierCreatePayload = {
  claimInstructions: string;
  description: string;
  eventId: string;
  inventoryTotal: string;
  requiredStampCount: string;
  rewardType: RewardTierType;
  title: string;
};

export type ClubRewardTierUpdatePayload = {
  claimInstructions: string;
  description: string;
  inventoryTotal: string;
  requiredStampCount: string;
  rewardTierId: string;
  rewardType: RewardTierType;
  status: RewardTierStatus;
  title: string;
};

export type ClubRewardTierMutationResponse = {
  message: string;
  status: string | null;
};

export type ClubRewardTierActionState = {
  code: string | null;
  message: string | null;
  tone: "error" | "idle" | "success";
};
