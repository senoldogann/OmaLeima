export type StudentLeaderboardTimelineState = "ACTIVE" | "UPCOMING" | "COMPLETED";

export type RegisteredLeaderboardEvent = {
  id: string;
  name: string;
  city: string;
  startAt: string;
  endAt: string;
  status: "PUBLISHED" | "ACTIVE" | "COMPLETED";
  timelineState: StudentLeaderboardTimelineState;
};

export type LeaderboardEntry = {
  studentId: string;
  displayName: string | null;
  avatarUrl: string | null;
  stampCount: number;
  lastStampAt: string | null;
  rank: number;
};

export type StudentLeaderboardOverview = {
  registeredEventCount: number;
  events: RegisteredLeaderboardEvent[];
};

export type EventLeaderboardResult = {
  top10: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  refreshedAt: string | null;
  version: number | null;
};
