export type ClubClaimEventRecord = {
  activeRewardTierCount: number;
  city: string;
  claimableCandidateCount: number;
  clubId: string;
  clubName: string;
  eventId: string;
  eventStatus: "ACTIVE" | "COMPLETED";
  name: string;
  recentClaimCount: number;
  startAt: string;
};

export type ClubClaimCandidateRecord = {
  eventId: string;
  eventName: string;
  inventoryRemaining: number | null;
  inventoryTotal: number | null;
  rewardTierId: string;
  rewardTitle: string;
  rewardType: "COUPON" | "ENTRY" | "HAALARIMERKKI" | "OTHER" | "PATCH" | "PRODUCT";
  requiredStampCount: number;
  stampCount: number;
  studentId: string;
  studentLabel: string;
};

export type ClubRecentRewardClaimRecord = {
  claimedAt: string;
  eventId: string;
  eventName: string;
  notes: string | null;
  rewardClaimId: string;
  rewardTierId: string;
  rewardTitle: string;
  status: "CLAIMED" | "REVOKED";
  studentId: string;
  studentLabel: string;
};

export type ClubClaimsSummary = {
  claimableCandidateCount: number;
  operationalEventCount: number;
  recentClaimCount: number;
  visibleCandidateCount: number;
  visibleClaimCount: number;
};

export type ClubClaimsSnapshot = {
  candidates: ClubClaimCandidateRecord[];
  events: ClubClaimEventRecord[];
  recentClaims: ClubRecentRewardClaimRecord[];
  summary: ClubClaimsSummary;
};

export type ClubRewardClaimConfirmPayload = {
  eventId: string;
  notes: string;
  rewardTierId: string;
  studentId: string;
};

export type ClubRewardClaimMutationResponse = {
  message: string;
  status: string | null;
};

export type ClubRewardClaimActionState = {
  code: string | null;
  message: string | null;
  tone: "error" | "idle" | "success";
};
