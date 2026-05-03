export type BusinessTimelineState = "ACTIVE" | "UPCOMING" | "COMPLETED";

export type BusinessMembershipSummary = {
  businessId: string;
  businessName: string;
  address: string;
  city: string;
  contactEmail: string;
  phone: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  yTunnus: string | null;
  contactPersonName: string | null;
  openingHours: string | null;
  announcement: string | null;
  role: "OWNER" | "MANAGER" | "SCANNER";
};

export type BusinessJoinedEventSummary = {
  eventVenueId: string;
  eventId: string;
  businessId: string;
  businessName: string;
  coverImageUrl: string | null;
  description: string | null;
  businessLogoUrl: string | null;
  businessCoverImageUrl: string | null;
  businessAnnouncement: string | null;
  businessAddress: string;
  businessPhone: string | null;
  businessOpeningHours: string | null;
  eventName: string;
  city: string;
  startAt: string;
  endAt: string;
  joinDeadlineAt: string;
  status: "PUBLISHED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  timelineState: BusinessTimelineState;
  stampLabel: string | null;
  venueOrder: number | null;
};

export type BusinessOpportunitySummary = {
  businessId: string;
  businessName: string;
  eventId: string;
  eventName: string;
  coverImageUrl: string | null;
  description: string | null;
  city: string;
  startAt: string;
  endAt: string;
  joinDeadlineAt: string;
  status: "PUBLISHED" | "ACTIVE";
};

export type BusinessHomeOverview = {
  memberships: BusinessMembershipSummary[];
  joinedActiveEvents: BusinessJoinedEventSummary[];
  joinedUpcomingEvents: BusinessJoinedEventSummary[];
  joinedCompletedEvents: BusinessJoinedEventSummary[];
  cityOpportunities: BusinessOpportunitySummary[];
};

export type BusinessJoinEventStatus =
  | "SUCCESS"
  | "ALREADY_JOINED"
  | "EVENT_NOT_FOUND"
  | "EVENT_NOT_AVAILABLE"
  | "EVENT_JOIN_CLOSED"
  | "BUSINESS_NOT_ACTIVE"
  | "BUSINESS_STAFF_NOT_ALLOWED"
  | "PROFILE_NOT_ACTIVE"
  | "PROFILE_NOT_FOUND"
  | "VENUE_REMOVED"
  | "AUTH_REQUIRED"
  | "ACTOR_NOT_ALLOWED";

export type BusinessJoinEventResult = {
  status: BusinessJoinEventStatus;
  eventVenueId?: string;
  startAt?: string;
  joinDeadlineAt?: string;
};

export type BusinessLeaveEventStatus =
  | "SUCCESS"
  | "EVENT_NOT_FOUND"
  | "EVENT_LEAVE_CLOSED"
  | "BUSINESS_NOT_ACTIVE"
  | "BUSINESS_STAFF_NOT_ALLOWED"
  | "VENUE_NOT_FOUND"
  | "VENUE_NOT_JOINED"
  | "VENUE_ALREADY_LEFT"
  | "VENUE_REMOVED"
  | "PROFILE_NOT_FOUND"
  | "PROFILE_NOT_ACTIVE"
  | "AUTH_REQUIRED"
  | "ACTOR_NOT_ALLOWED";

export type BusinessLeaveEventResult = {
  status: BusinessLeaveEventStatus;
  eventVenueId?: string;
  startAt?: string;
  eventStatus?: string;
};

export type BusinessScanHistoryEntry = {
  stampId: string;
  eventId: string;
  eventName: string;
  businessId: string;
  businessName: string;
  studentId: string;
  studentLabel: string;
  scannedAt: string;
  validationStatus: "VALID" | "MANUAL_REVIEW" | "REVOKED";
};
