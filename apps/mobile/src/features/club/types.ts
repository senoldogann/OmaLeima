export type ClubMembershipRole = "ORGANIZER" | "OWNER" | "STAFF";

export type ClubMembershipSummary = {
  canCreateEvents: boolean;
  city: string | null;
  clubId: string;
  clubName: string;
  membershipRole: ClubMembershipRole;
  universityName: string | null;
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
  city: string;
  clubId: string;
  clubName: string;
  coverImageUrl: string | null;
  description: string | null;
  endAt: string;
  eventId: string;
  joinDeadlineAt: string;
  maxParticipants: number | null;
  minimumStampsRequired: number;
  name: string;
  startAt: string;
  status: "ACTIVE" | "CANCELLED" | "COMPLETED" | "DRAFT" | "PUBLISHED";
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
