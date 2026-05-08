export type ClubReportEvent = {
  activeRewardTierCount: number;
  attendanceRate: number;
  city: string;
  claimedRewardCount: number;
  endAt: string;
  eventId: string;
  joinedVenueCount: number;
  manualReviewStampCount: number;
  name: string;
  registeredParticipantCount: number;
  rewardClaimRate: number;
  revokedStampCount: number;
  startAt: string;
  status: string;
  ticketUrl: string | null;
  uniqueStampedStudentCount: number;
  validStampCount: number;
};

export type ClubReportSummary = {
  claimedRewardCount: number;
  eventCount: number;
  joinedVenueCount: number;
  registeredParticipantCount: number;
  uniqueStampedStudentCount: number;
  validStampCount: number;
};

export type ClubReportRecord = {
  clubId: string;
  clubName: string;
  events: ClubReportEvent[];
  from: string;
  summary: ClubReportSummary;
  to: string;
};

export type ClubReportsSnapshot = {
  reports: ClubReportRecord[];
  selectedWindowDays: number;
  summary: ClubReportSummary;
};
