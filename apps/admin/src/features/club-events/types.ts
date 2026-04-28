type JsonPrimitive = boolean | number | string | null;
export type EventRuleValue = JsonPrimitive | EventRuleValue[] | { [key: string]: EventRuleValue };
export type EventRules = { [key: string]: EventRuleValue };

export type ClubMembershipRole = "ORGANIZER" | "OWNER" | "STAFF";

export type ClubMembershipSummary = {
  canCreateEvents: boolean;
  city: string | null;
  clubId: string;
  clubName: string;
  membershipRole: ClubMembershipRole;
  universityName: string | null;
};

export type ClubEventRecord = {
  city: string;
  clubId: string;
  clubName: string;
  createdAt: string;
  createdByEmail: string | null;
  endAt: string;
  eventId: string;
  joinDeadlineAt: string;
  maxParticipants: number | null;
  minimumStampsRequired: number;
  name: string;
  slug: string;
  startAt: string;
  status: "ACTIVE" | "CANCELLED" | "COMPLETED" | "DRAFT" | "PUBLISHED";
  visibility: "PRIVATE" | "PUBLIC" | "UNLISTED";
};

export type ClubEventsSummary = {
  creatableClubCount: number;
  latestEventLimit: number;
  managedClubCount: number;
  visibleEventCount: number;
};

export type ClubEventsSnapshot = {
  memberships: ClubMembershipSummary[];
  recentEvents: ClubEventRecord[];
  summary: ClubEventsSummary;
};

export type ClubEventCreationPayload = {
  city: string;
  clubId: string;
  country: string;
  coverImageUrl: string;
  description: string;
  endAt: string;
  joinDeadlineAt: string;
  maxParticipants: string;
  minimumStampsRequired: string;
  name: string;
  rulesJson: string;
  startAt: string;
  visibility: "PRIVATE" | "PUBLIC" | "UNLISTED";
};

export type ClubEventMutationResponse = {
  message: string;
  status: string | null;
};

export type ClubEventActionState = {
  code: string | null;
  message: string | null;
  tone: "error" | "idle" | "success";
};
