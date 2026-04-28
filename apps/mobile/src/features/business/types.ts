export type BusinessTimelineState = "ACTIVE" | "UPCOMING" | "COMPLETED";

export type BusinessMembershipSummary = {
  businessId: string;
  businessName: string;
  city: string;
  role: "OWNER" | "MANAGER" | "SCANNER";
};

export type BusinessJoinedEventSummary = {
  eventVenueId: string;
  eventId: string;
  businessId: string;
  businessName: string;
  eventName: string;
  city: string;
  startAt: string;
  endAt: string;
  joinDeadlineAt: string;
  timelineState: BusinessTimelineState;
  stampLabel: string | null;
  venueOrder: number | null;
};

export type BusinessOpportunitySummary = {
  businessId: string;
  businessName: string;
  eventId: string;
  eventName: string;
  city: string;
  startAt: string;
  joinDeadlineAt: string;
};

export type BusinessHomeOverview = {
  memberships: BusinessMembershipSummary[];
  joinedActiveEvents: BusinessJoinedEventSummary[];
  joinedUpcomingEvents: BusinessJoinedEventSummary[];
  cityOpportunities: BusinessOpportunitySummary[];
};
