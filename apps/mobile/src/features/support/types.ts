export type SupportRequestArea = "STUDENT" | "BUSINESS" | "CLUB";

export type SupportRequestStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export type SupportRequestSummary = {
  id: string;
  area: SupportRequestArea;
  businessId: string | null;
  businessName: string | null;
  clubId: string | null;
  clubName: string | null;
  subject: string;
  message: string;
  status: SupportRequestStatus;
  adminReply: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type SupportRequestDraft = {
  userId: string;
  area: SupportRequestArea;
  businessId: string | null;
  clubId: string | null;
  subject: string;
  message: string;
};

export type BusinessSupportOption = {
  businessId: string;
  businessName: string;
  city: string;
  role: "OWNER" | "MANAGER" | "SCANNER";
};

export type ClubSupportOption = {
  clubId: string;
  clubName: string;
  city: string | null;
  role: "OWNER" | "ORGANIZER" | "STAFF";
};
