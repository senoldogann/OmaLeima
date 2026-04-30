export type EventRegistrationStatus = "REGISTERED" | "CANCELLED" | "BANNED";

export type EventTimelineState = "ACTIVE" | "UPCOMING";

export type EventRegistrationState = "REGISTERED" | "CANCELLED" | "BANNED" | "NOT_REGISTERED";

export type RewardTierType =
  | "HAALARIMERKKI"
  | "PATCH"
  | "COUPON"
  | "PRODUCT"
  | "ENTRY"
  | "OTHER";

export type EventRuleValue =
  | string
  | number
  | boolean
  | null
  | EventRuleValue[]
  | { [key: string]: EventRuleValue };

export type EventRules = { [key: string]: EventRuleValue };

export type StudentEventSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  country: string;
  coverImageUrl: string | null;
  startAt: string;
  endAt: string;
  joinDeadlineAt: string;
  maxParticipants: number | null;
  minimumStampsRequired: number;
  timelineState: EventTimelineState;
  registrationState: EventRegistrationState;
};

export type StudentEventsBuckets = {
  activeEvents: StudentEventSummary[];
  upcomingEvents: StudentEventSummary[];
};

export type EventVenueSummary = {
  id: string;
  businessId: string;
  name: string;
  city: string;
  venueOrder: number | null;
  stampLabel: string | null;
  customInstructions: string | null;
};

export type RewardTierSummary = {
  id: string;
  title: string;
  description: string | null;
  requiredStampCount: number;
  rewardType: RewardTierType;
  inventoryTotal: number | null;
  inventoryClaimed: number;
  claimInstructions: string | null;
};

export type StudentEventDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  country: string;
  startAt: string;
  endAt: string;
  joinDeadlineAt: string;
  status: "PUBLISHED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
  coverImageUrl: string | null;
  maxParticipants: number | null;
  minimumStampsRequired: number;
  rules: EventRules;
  registrationState: EventRegistrationState;
  venues: EventVenueSummary[];
  rewardTiers: RewardTierSummary[];
};

export type JoinEventResultStatus =
  | "SUCCESS"
  | "ALREADY_REGISTERED"
  | "AUTH_REQUIRED"
  | "ACTOR_NOT_ALLOWED"
  | "PROFILE_NOT_FOUND"
  | "PROFILE_NOT_ACTIVE"
  | "ROLE_NOT_ALLOWED"
  | "EVENT_NOT_FOUND"
  | "EVENT_NOT_AVAILABLE"
  | "EVENT_REGISTRATION_CLOSED"
  | "EVENT_FULL"
  | "STUDENT_BANNED";

export type JoinEventResult = {
  status: JoinEventResultStatus;
  registrationId?: string;
  startAt?: string;
  joinDeadlineAt?: string;
  maxParticipants?: number;
  currentRegistrations?: number;
};
