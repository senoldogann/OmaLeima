import type {
  ClubRewardTierRecord,
  ManageableRewardEvent,
  RewardTierStatus,
  RewardTierType,
} from "@/features/club-rewards/types";

const dateTimeFormatter = new Intl.DateTimeFormat("en-FI", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const rewardTypeLabels: Record<RewardTierType, string> = {
  COUPON: "Coupon",
  ENTRY: "Entry",
  HAALARIMERKKI: "Haalarimerkki",
  OTHER: "Other",
  PATCH: "Patch",
  PRODUCT: "Product",
};

export const formatRewardDateTime = (value: string): string => dateTimeFormatter.format(new Date(value));

export const formatRewardType = (value: RewardTierType): string => rewardTypeLabels[value];

export const formatManageableRewardEventMeta = (event: ManageableRewardEvent): string =>
  `${event.clubName} · ${event.city} · ${formatRewardDateTime(event.startAt)}`;

export const formatRewardInventory = (tier: ClubRewardTierRecord): string => {
  if (tier.inventoryTotal === null) {
    return `${tier.inventoryClaimed} claimed · unlimited stock`;
  }

  const remaining = tier.inventoryRemaining ?? Math.max(tier.inventoryTotal - tier.inventoryClaimed, 0);

  return `${tier.inventoryClaimed}/${tier.inventoryTotal} claimed · ${remaining} left`;
};

export const getRewardStatusClassName = (status: RewardTierStatus): string =>
  status === "ACTIVE" ? "status-pill status-pill-success" : "status-pill";

export const getRewardStockClassName = (tier: ClubRewardTierRecord): string => {
  if (tier.stockState === "OUT") {
    return "status-pill status-pill-warning";
  }

  if (tier.stockState === "LOW") {
    return "status-pill";
  }

  return "status-pill status-pill-success";
};
