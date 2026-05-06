export type AnnouncementAudience = "ALL" | "BUSINESSES" | "CLUBS" | "STUDENTS";

export type AnnouncementStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type AnnouncementClubOption = {
  clubId: string;
  clubName: string;
};

export type AnnouncementRecord = {
  announcementId: string;
  audience: AnnouncementAudience;
  body: string;
  clubId: string | null;
  clubName: string | null;
  createdAt: string;
  createdByEmail: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  endsAt: string | null;
  imageUrl: string | null;
  priority: number;
  pushDeliveryStatus: "FAILED" | "NOT_SENT" | "PARTIAL" | "SENT";
  startsAt: string;
  status: AnnouncementStatus;
  title: string;
};

export type AnnouncementSnapshot = {
  announcements: AnnouncementRecord[];
  clubOptions: AnnouncementClubOption[];
  scope: "ADMIN" | "CLUB";
};

export type AnnouncementCreatePayload = {
  audience: AnnouncementAudience;
  body: string;
  clubId: string;
  ctaLabel: string;
  ctaUrl: string;
  endsAt: string;
  imageUrl: string;
  priority: string;
  startsAt: string;
  status: AnnouncementStatus;
  title: string;
};

export type AnnouncementMutationResponse = {
  notificationsCreated?: number;
  notificationsFailed?: number;
  notificationsSent?: number;
  message: string;
  status: string | null;
};

export type AnnouncementActionState = {
  code: string | null;
  message: string | null;
  tone: "error" | "idle" | "success";
};
