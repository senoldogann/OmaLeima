export type BusinessApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type BusinessApplicationRecord = {
  id: string;
  address: string | null;
  businessId: string | null;
  businessName: string;
  city: string;
  contactEmail: string;
  contactName: string;
  country: string;
  createdAt: string;
  instagramUrl: string | null;
  message: string | null;
  phone: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  ownerAccess: {
    ownerEmail: string | null;
    ownerUserId: string | null;
    status: "MISSING_BUSINESS" | "MISSING_OWNER" | "OWNER_READY" | "NOT_APPLICABLE";
  };
  status: BusinessApplicationStatus;
  websiteUrl: string | null;
};

export type BusinessApplicationSummary = {
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  oldestPendingCreatedAt: string | null;
  pendingPageCount: number;
  pendingPageSize: number;
  pendingCount: number;
  pendingVisibleEnd: number;
  pendingVisibleStart: number;
  recentlyReviewedCount: number;
};

export type BusinessApplicationsReviewQueue = {
  pendingApplications: BusinessApplicationRecord[];
  recentlyReviewedApplications: BusinessApplicationRecord[];
  summary: BusinessApplicationSummary;
};

export type ReviewActionState = {
  code: string | null;
  message: string | null;
  tone: "error" | "idle" | "success";
};

export type ReviewMutationResponse = {
  message: string;
  status: string | null;
};
