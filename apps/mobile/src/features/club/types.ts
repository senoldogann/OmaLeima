export type ClubMembershipRole = "ORGANIZER" | "OWNER" | "STAFF";

export type ClubMembershipSummary = {
  address: string | null;
  canCreateEvents: boolean;
  coverImageUrl: string | null;
  announcement: string | null;
  city: string | null;
  clubId: string;
  clubName: string;
  contactEmail: string | null;
  instagramUrl: string | null;
  logoUrl: string | null;
  membershipRole: ClubMembershipRole;
  phone: string | null;
  universityName: string | null;
  websiteUrl: string | null;
};

export type ClubDashboardTimelineState = "CANCELLED" | "COMPLETED" | "DRAFT" | "LIVE" | "UPCOMING";

export type ClubDashboardEventMetrics = {
  claimedRewardCount: number;
  joinedVenueCount: number;
  registeredParticipantCount: number;
  rewardTierCount: number;
  validStampCount: number;
};

export type ClubDashboardEventSummary = ClubDashboardEventMetrics & {
  canManageEvent: boolean;
  city: string;
  clubId: string;
  clubName: string;
  coverImageStagingPath: string | null;
  coverImageUrl: string | null;
  description: string | null;
  endAt: string;
  eventId: string;
  joinDeadlineAt: string;
  maxParticipants: number | null;
  minimumStampsRequired: number;
  name: string;
  perBusinessLimit: number;
  rules: EventRules;
  startAt: string;
  status: "ACTIVE" | "CANCELLED" | "COMPLETED" | "DRAFT" | "PUBLISHED";
  ticketUrl: string | null;
  timelineState: ClubDashboardTimelineState;
  visibility: "PRIVATE" | "PUBLIC" | "UNLISTED";
};

export type ClubDashboardSummary = {
  claimedRewardCount: number;
  creatableClubCount: number;
  joinedVenueCount: number;
  liveEventCount: number;
  managedClubCount: number;
  registeredParticipantCount: number;
  rewardTierCount: number;
  upcomingEventCount: number;
  validStampCount: number;
};

export type ClubDashboardSnapshot = {
  events: ClubDashboardEventSummary[];
  memberships: ClubMembershipSummary[];
  summary: ClubDashboardSummary;
};

type JsonPrimitive = boolean | number | string | null;
export type EventRuleValue = JsonPrimitive | EventRuleValue[] | { [key: string]: EventRuleValue };
export type EventRules = { [key: string]: EventRuleValue };

export type ClubEventVisibility = "PRIVATE" | "PUBLIC" | "UNLISTED";

export type ClubEventEditableStatus = "ACTIVE" | "DRAFT" | "PUBLISHED";

export type ClubEventFormDraft = {
  city: string;
  clubId: string;
  coverImageStagingPath: string;
  coverImageUrl: string;
  description: string;
  endAt: string;
  eventId: string | null;
  joinDeadlineAt: string;
  maxParticipants: string;
  minimumStampsRequired: string;
  name: string;
  perBusinessLimit: string;
  rules: EventRules;
  startAt: string;
  status: ClubEventEditableStatus;
  ticketUrl: string;
  visibility: ClubEventVisibility;
};
