import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import type {
  BusinessHomeOverview,
  BusinessJoinedEventSummary,
  BusinessMembershipSummary,
  BusinessOpportunitySummary,
  BusinessTimelineState,
} from "@/features/business/types";

type BusinessMembershipRow = {
  business_id: string;
  role: "OWNER" | "MANAGER" | "SCANNER";
};

type BusinessRow = {
  id: string;
  name: string;
  city: string;
};

type EventVenueRow = {
  id: string;
  event_id: string;
  business_id: string;
  venue_order: number | null;
  stamp_label: string | null;
  status: "JOINED";
};

type EventRow = {
  id: string;
  name: string;
  city: string;
  start_at: string;
  end_at: string;
  join_deadline_at: string;
  status: "PUBLISHED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
};

type UseBusinessHomeOverviewQueryParams = {
  userId: string;
  isEnabled: boolean;
};

export const businessHomeOverviewQueryKey = (userId: string) => ["business-home-overview", userId] as const;

const deriveTimelineState = (eventStatus: EventRow["status"], startAt: string, endAt: string, now: number): BusinessTimelineState => {
  const startTime = new Date(startAt).getTime();
  const endTime = new Date(endAt).getTime();

  if (eventStatus === "ACTIVE" && now >= startTime && now <= endTime) {
    return "ACTIVE";
  }

  if ((eventStatus === "PUBLISHED" || eventStatus === "ACTIVE") && now < startTime) {
    return "UPCOMING";
  }

  return "COMPLETED";
};

const fetchBusinessMembershipsAsync = async (userId: string): Promise<BusinessMembershipRow[]> => {
  const { data, error } = await supabase
    .from("business_staff")
    .select("business_id,role")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .returns<BusinessMembershipRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load business memberships for ${userId}: ${error.message}`);
  }

  return data;
};

const fetchBusinessesAsync = async (businessIds: string[]): Promise<BusinessRow[]> => {
  if (businessIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("businesses")
    .select("id,name,city")
    .in("id", businessIds)
    .returns<BusinessRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load businesses for the current staff user: ${error.message}`);
  }

  return data;
};

const fetchJoinedEventVenuesAsync = async (businessIds: string[]): Promise<EventVenueRow[]> => {
  if (businessIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("event_venues")
    .select("id,event_id,business_id,venue_order,stamp_label,status")
    .in("business_id", businessIds)
    .eq("status", "JOINED")
    .returns<EventVenueRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load joined event venues: ${error.message}`);
  }

  return data;
};

const fetchEventsAsync = async (eventIds: string[]): Promise<EventRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("events")
    .select("id,name,city,start_at,end_at,join_deadline_at,status")
    .in("id", eventIds)
    .returns<EventRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load business event details: ${error.message}`);
  }

  return data;
};

const fetchCityOpportunitiesAsync = async (cities: string[]): Promise<EventRow[]> => {
  if (cities.length === 0) {
    return [];
  }

  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("events")
    .select("id,name,city,start_at,end_at,join_deadline_at,status")
    .eq("visibility", "PUBLIC")
    .eq("status", "PUBLISHED")
    .in("city", cities)
    .gt("join_deadline_at", nowIso)
    .order("start_at", { ascending: true })
    .returns<EventRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load business city opportunities: ${error.message}`);
  }

  return data;
};

const mapMemberships = (
  membershipRows: BusinessMembershipRow[],
  businesses: BusinessRow[]
): BusinessMembershipSummary[] => {
  const businessById = new Map(businesses.map((business) => [business.id, business] as const));

  return membershipRows.flatMap((membership) => {
    const business = businessById.get(membership.business_id);

    if (typeof business === "undefined") {
      return [];
    }

    return [
      {
        businessId: membership.business_id,
        businessName: business.name,
        city: business.city,
        role: membership.role,
      },
    ];
  });
};

const mapJoinedEvents = (
  eventVenueRows: EventVenueRow[],
  businesses: BusinessRow[],
  events: EventRow[],
  now: number
): BusinessJoinedEventSummary[] => {
  const businessById = new Map(businesses.map((business) => [business.id, business] as const));
  const eventById = new Map(events.map((event) => [event.id, event] as const));

  return eventVenueRows.flatMap((eventVenue) => {
    const business = businessById.get(eventVenue.business_id);
    const event = eventById.get(eventVenue.event_id);

    if (typeof business === "undefined" || typeof event === "undefined") {
      return [];
    }

    return [
      {
        eventVenueId: eventVenue.id,
        eventId: eventVenue.event_id,
        businessId: eventVenue.business_id,
        businessName: business.name,
        eventName: event.name,
        city: event.city,
        startAt: event.start_at,
        endAt: event.end_at,
        joinDeadlineAt: event.join_deadline_at,
        timelineState: deriveTimelineState(event.status, event.start_at, event.end_at, now),
        stampLabel: eventVenue.stamp_label,
        venueOrder: eventVenue.venue_order,
      },
    ];
  });
};

const mapCityOpportunities = (
  events: EventRow[],
  joinedVenueKeys: Set<string>,
  memberships: BusinessMembershipSummary[]
): BusinessOpportunitySummary[] => {
  return memberships.flatMap((membership) =>
    events.flatMap((event) => {
      if (event.city !== membership.city) {
        return [];
      }

      if (joinedVenueKeys.has(`${membership.businessId}:${event.id}`)) {
        return [];
      }

      return [
        {
          businessId: membership.businessId,
          businessName: membership.businessName,
          eventId: event.id,
          eventName: event.name,
          city: event.city,
          startAt: event.start_at,
          joinDeadlineAt: event.join_deadline_at,
        },
      ];
    })
  );
};

const compareJoinedEvents = (left: BusinessJoinedEventSummary, right: BusinessJoinedEventSummary): number =>
  new Date(left.startAt).getTime() - new Date(right.startAt).getTime();

export const fetchBusinessHomeOverviewAsync = async (userId: string): Promise<BusinessHomeOverview> => {
  const membershipRows = await fetchBusinessMembershipsAsync(userId);
  const businessIds = membershipRows.map((membership) => membership.business_id);
  const businesses = await fetchBusinessesAsync(businessIds);
  const memberships = mapMemberships(membershipRows, businesses);
  const activeBusinessIds = businesses.map((business) => business.id);
  const joinedEventVenueRows = await fetchJoinedEventVenuesAsync(activeBusinessIds);
  const joinedEventIds = Array.from(new Set(joinedEventVenueRows.map((eventVenue) => eventVenue.event_id)));
  const [joinedEvents, cityOpportunityEvents] = await Promise.all([
    fetchEventsAsync(joinedEventIds),
    fetchCityOpportunitiesAsync(Array.from(new Set(businesses.map((business) => business.city)))),
  ]);

  const now = Date.now();
  const joinedEventSummaries = mapJoinedEvents(joinedEventVenueRows, businesses, joinedEvents, now).sort(compareJoinedEvents);
  const joinedActiveEvents = joinedEventSummaries.filter((event) => event.timelineState === "ACTIVE");
  const joinedUpcomingEvents = joinedEventSummaries.filter((event) => event.timelineState === "UPCOMING");
  const cityOpportunities = mapCityOpportunities(
    cityOpportunityEvents,
    new Set(joinedEventVenueRows.map((eventVenue) => `${eventVenue.business_id}:${eventVenue.event_id}`)),
    memberships
  );

  return {
    memberships,
    joinedActiveEvents,
    joinedUpcomingEvents,
    cityOpportunities,
  };
};

export const useBusinessHomeOverviewQuery = ({
  userId,
  isEnabled,
}: UseBusinessHomeOverviewQueryParams): UseQueryResult<BusinessHomeOverview, Error> =>
  useQuery({
    queryKey: businessHomeOverviewQueryKey(userId),
    queryFn: async () => fetchBusinessHomeOverviewAsync(userId),
    enabled: isEnabled,
  });
