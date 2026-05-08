export type SupportRequestArea = "STUDENT" | "BUSINESS" | "CLUB";

export type SupportRequestStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export type SupportRequester = {
  displayName: string | null;
  email: string;
  id: string;
  primaryRole: string;
  status: string;
};

export type SupportRequestTarget = {
  city: string | null;
  id: string;
  name: string;
  status: string;
  type: "business" | "club";
};

export type SupportRequestRecord = {
  adminReply: string | null;
  area: SupportRequestArea;
  businessId: string | null;
  clubId: string | null;
  createdAt: string;
  id: string;
  message: string;
  requester: SupportRequester;
  resolvedAt: string | null;
  status: SupportRequestStatus;
  subject: string;
  target: SupportRequestTarget | null;
  updatedAt: string;
};

export type SupportRequestCounts = {
  closed: number;
  inProgress: number;
  open: number;
  resolved: number;
  total: number;
};

export type SupportRequestsSnapshot = {
  counts: SupportRequestCounts;
  records: SupportRequestRecord[];
};
