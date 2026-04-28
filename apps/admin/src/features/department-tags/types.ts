export type DepartmentTagSourceType = "ADMIN" | "CLUB" | "USER";

export type DepartmentTagStatus = "ACTIVE" | "BLOCKED" | "MERGED" | "PENDING_REVIEW";

export type DepartmentTagRecord = {
  city: string | null;
  createdAt: string;
  createdByEmail: string | null;
  id: string;
  mergedIntoTagId: string | null;
  mergedIntoTitle: string | null;
  profileLinkCount: number;
  slug: string;
  sourceClubName: string | null;
  sourceType: DepartmentTagSourceType;
  status: DepartmentTagStatus;
  title: string;
  universityName: string | null;
  updatedAt: string;
};

export type DepartmentTagMergeTarget = {
  city: string | null;
  id: string;
  sourceType: DepartmentTagSourceType;
  title: string;
  universityName: string | null;
};

export type DepartmentTagModerationSummary = {
  activeCustomCount: number;
  activeTargetCount: number;
  pendingCount: number;
  pendingLimit: number;
  recentLimit: number;
  recentlyModeratedCount: number;
  userTagLimit: number;
};

export type DepartmentTagModerationSnapshot = {
  activeCustomTags: DepartmentTagRecord[];
  mergeTargets: DepartmentTagMergeTarget[];
  pendingTags: DepartmentTagRecord[];
  recentlyModeratedTags: DepartmentTagRecord[];
  summary: DepartmentTagModerationSummary;
};

export type DepartmentTagModerationMutationResponse = {
  message: string;
  status: string | null;
};

export type DepartmentTagActionState = {
  code: string | null;
  message: string | null;
  tone: "error" | "idle" | "success";
};
