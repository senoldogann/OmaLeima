import type {
  ClubClaimCandidateRecord,
  ClubClaimEventRecord,
  ClubRecentRewardClaimRecord,
} from "@/features/club-claims/types";

const dateTimeFormatter = new Intl.DateTimeFormat("en-FI", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const rewardTypeLabels: Record<ClubClaimCandidateRecord["rewardType"], string> = {
  COUPON: "Coupon",
  ENTRY: "Entry",
  HAALARIMERKKI: "Haalarimerkki",
  OTHER: "Other",
  PATCH: "Patch",
  PRODUCT: "Product",
};

export const formatClubClaimDateTime = (value: string): string => dateTimeFormatter.format(new Date(value));

export const formatClubClaimEventMeta = (event: ClubClaimEventRecord): string =>
  `${event.clubName} · ${event.city} · ${formatClubClaimDateTime(event.startAt)}`;

export const formatClubClaimRewardType = (value: ClubClaimCandidateRecord["rewardType"]): string =>
  rewardTypeLabels[value];

export const formatClubClaimInventory = (candidate: ClubClaimCandidateRecord): string => {
  if (candidate.inventoryTotal === null) {
    return "Unlimited stock";
  }

  if (candidate.inventoryRemaining === null) {
    return `${candidate.inventoryTotal} total stock`;
  }

  return `${candidate.inventoryRemaining}/${candidate.inventoryTotal} left`;
};

export const formatClubClaimProgress = (candidate: ClubClaimCandidateRecord): string =>
  `${candidate.stampCount}/${candidate.requiredStampCount} leima`;

export const formatClubClaimHistoryMeta = (claim: ClubRecentRewardClaimRecord): string =>
  `${claim.eventName} · ${formatClubClaimDateTime(claim.claimedAt)}`;

export const getClubClaimStatusClassName = (status: ClubRecentRewardClaimRecord["status"]): string =>
  status === "CLAIMED" ? "status-pill status-pill-success" : "status-pill status-pill-warning";
