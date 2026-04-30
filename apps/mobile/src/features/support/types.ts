export type SupportRequestArea = "STUDENT" | "BUSINESS";

export type SupportRequestStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export type SupportRequestSummary = {
  id: string;
  area: SupportRequestArea;
  businessId: string | null;
  businessName: string | null;
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
  subject: string;
  message: string;
};

export type BusinessSupportOption = {
  businessId: string;
  businessName: string;
  city: string;
  role: "OWNER" | "MANAGER" | "SCANNER";
};
