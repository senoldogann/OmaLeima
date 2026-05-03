import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import type {
  ClubDashboardEventMetrics,
  ClubDashboardEventSummary,
  ClubDashboardSnapshot,
  ClubDashboardTimelineState,
  ClubMembershipRole,
  ClubMembershipSummary,
} from "@/features/club/types";

const dashboardEventLimit = 12;

type ClubMembershipRow = {
  club_id: string;
  role: ClubMembershipRole;
};

type ClubRow = {
  announcement: string | null;
  city: string | null;
  contact_email: string | null;
  cover_image_url: string | null;
  id: string;
  logo_url: string | null;
  name: string;
  university_name: string | null;
};

type EventRow = {
  city: string;
  club_id: string;
  cover_image_url: string | null;
  description: string | null;
  end_at: string;
  id: string;
  join_deadline_at: string;
  max_participants: number | null;
  minimum_stamps_required: number;
  name: string;
  start_at: string;
  status: ClubDashboardEventSummary["status"];
  visibility: ClubDashboardEventSummary["visibility"];
};

type EventRegistrationRow = {
  event_id: string;
  status: "BANNED" | "CANCELLED" | "REGISTERED";
};

type EventVenueRow = {
  event_id: string;
  status: "INVITED" | "JOINED" | "LEFT" | "REMOVED";
};

type RewardTierRow = {
  event_id: string;
  status: "ACTIVE" | "DISABLED";
};

type RewardClaimRow = {
  event_id: string;
  status: "CLAIMED" | "REVOKED";
};

type StampRow = {
  event_id: string;
  validation_status: "MANUAL_REVIEW" | "REVOKED" | "VALID";
};

type UseClubDashboardQueryParams = {
  userId: string;
  isEnabled: boolean;
};

export const clubDashboardQueryKey = (userId: string) => ["club-dashboard", userId] as const;

const createEmptyMetrics = (): ClubDashboardEventMetrics => ({
  claimedRewardCount: 0,
  joinedVenueCount: 0,
  registeredParticipantCount: 0,
  rewardTierCount: 0,
  validStampCount: 0,
});

const fetchClubMembershipsAsync = async (userId: string): Promise<ClubMembershipRow[]> => {
  const { data, error } = await supabase
    .from("club_members")
    .select("club_id,role")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .returns<ClubMembershipRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load club dashboard memberships for ${userId}: ${error.message}`);
  }

  return data;
};

const fetchClubsByIdsAsync = async (clubIds: string[]): Promise<ClubRow[]> => {
  if (clubIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("clubs")
    .select("id,name,city,university_name,logo_url,cover_image_url,announcement,contact_email")
    .in("id", clubIds)
    .eq("status", "ACTIVE")
    .returns<ClubRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load active clubs for club dashboard: ${error.message}`);
  }

  return data;
};

const fetchEventsByClubIdsAsync = async (clubIds: string[]): Promise<EventRow[]> => {
  if (clubIds.length === 0) {
    return [];
  }

  const oldestRelevantEndAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();

  const { data, error } = await supabase
    .from("events")
    .select(
      "id,club_id,name,description,city,cover_image_url,start_at,end_at,join_deadline_at,status,visibility,max_participants,minimum_stamps_required"
    )
    .in("club_id", clubIds)
    .gte("end_at", oldestRelevantEndAt)
    .neq("status", "CANCELLED")
    .order("start_at", { ascending: true })
    .limit(dashboardEventLimit)
    .returns<EventRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load club dashboard events for clubs ${clubIds.join(",")}: ${error.message}`);
  }

  return data;
};

const fetchEventRegistrationsAsync = async (eventIds: string[]): Promise<EventRegistrationRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("event_registrations")
    .select("event_id,status")
    .in("event_id", eventIds)
    .returns<EventRegistrationRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load club dashboard registrations for events ${eventIds.join(",")}: ${error.message}`);
  }

  return data;
};

const fetchEventVenuesAsync = async (eventIds: string[]): Promise<EventVenueRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("event_venues")
    .select("event_id,status")
    .in("event_id", eventIds)
    .returns<EventVenueRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load club dashboard venues for events ${eventIds.join(",")}: ${error.message}`);
  }

  return data;
};

const fetchRewardTiersAsync = async (eventIds: string[]): Promise<RewardTierRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("reward_tiers")
    .select("event_id,status")
    .in("event_id", eventIds)
    .returns<RewardTierRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load club dashboard reward tiers for events ${eventIds.join(",")}: ${error.message}`);
  }

  return data;
};

const fetchRewardClaimsAsync = async (eventIds: string[]): Promise<RewardClaimRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("reward_claims")
    .select("event_id,status")
    .in("event_id", eventIds)
    .returns<RewardClaimRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load club dashboard reward claims for events ${eventIds.join(",")}: ${error.message}`);
  }

  return data;
};

const fetchStampsAsync = async (eventIds: string[]): Promise<StampRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("stamps")
    .select("event_id,validation_status")
    .in("event_id", eventIds)
    .returns<StampRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load club dashboard stamps for events ${eventIds.join(",")}: ${error.message}`);
  }

  return data;
};

const mapMemberships = (
  membershipRows: ClubMembershipRow[],
  clubs: ClubRow[]
): ClubMembershipSummary[] => {
  const clubById = new Map(clubs.map((club) => [club.id, club] as const));

  return membershipRows.flatMap((membership) => {
    const club = clubById.get(membership.club_id);

    if (typeof club === "undefined") {
      return [];
    }

    return [
      {
        canCreateEvents: membership.role === "OWNER" || membership.role === "ORGANIZER",
        announcement: club.announcement,
        city: club.city,
        clubId: club.id,
        clubName: club.name,
        contactEmail: club.contact_email,
        coverImageUrl: club.cover_image_url,
        logoUrl: club.logo_url,
        membershipRole: membership.role,
        universityName: club.university_name,
      },
    ];
  });
};

const deriveTimelineState = (
  status: EventRow["status"],
  startAt: string,
  endAt: string,
  now: number
): ClubDashboardTimelineState => {
  const startTime = new Date(startAt).getTime();
  const endTime = new Date(endAt).getTime();

  if (status === "CANCELLED") {
    return "CANCELLED";
  }

  if (status === "DRAFT") {
    return "DRAFT";
  }

  if (status === "ACTIVE" && now >= startTime && now <= endTime) {
    return "LIVE";
  }

  if ((status === "PUBLISHED" || status === "ACTIVE") && now < startTime) {
    return "UPCOMING";
  }

  return "COMPLETED";
};

const ensureMetrics = (
  metricsByEventId: Map<string, ClubDashboardEventMetrics>,
  eventId: string
): ClubDashboardEventMetrics => {
  const existingMetrics = metricsByEventId.get(eventId);

  if (typeof existingMetrics !== "undefined") {
    return existingMetrics;
  }

  const nextMetrics = createEmptyMetrics();
  metricsByEventId.set(eventId, nextMetrics);

  return nextMetrics;
};

const mapMetricsByEventId = (
  registrations: EventRegistrationRow[],
  venues: EventVenueRow[],
  rewardTiers: RewardTierRow[],
  rewardClaims: RewardClaimRow[],
  stamps: StampRow[]
): Map<string, ClubDashboardEventMetrics> => {
  const metricsByEventId = new Map<string, ClubDashboardEventMetrics>();

  registrations.forEach((registration) => {
    if (registration.status === "REGISTERED") {
      ensureMetrics(metricsByEventId, registration.event_id).registeredParticipantCount += 1;
    }
  });

  venues.forEach((venue) => {
    if (venue.status === "JOINED") {
      ensureMetrics(metricsByEventId, venue.event_id).joinedVenueCount += 1;
    }
  });

  rewardTiers.forEach((rewardTier) => {
    if (rewardTier.status === "ACTIVE") {
      ensureMetrics(metricsByEventId, rewardTier.event_id).rewardTierCount += 1;
    }
  });

  rewardClaims.forEach((rewardClaim) => {
    if (rewardClaim.status === "CLAIMED") {
      ensureMetrics(metricsByEventId, rewardClaim.event_id).claimedRewardCount += 1;
    }
  });

  stamps.forEach((stamp) => {
    if (stamp.validation_status === "VALID") {
      ensureMetrics(metricsByEventId, stamp.event_id).validStampCount += 1;
    }
  });

  return metricsByEventId;
};

const mapEvents = (
  rows: EventRow[],
  memberships: ClubMembershipSummary[],
  metricsByEventId: Map<string, ClubDashboardEventMetrics>,
  now: number
): ClubDashboardEventSummary[] => {
  const clubNameById = new Map(memberships.map((membership) => [membership.clubId, membership.clubName] as const));

  return rows.map((row) => {
    const metrics = metricsByEventId.get(row.id) ?? createEmptyMetrics();

    return {
      city: row.city,
      claimedRewardCount: metrics.claimedRewardCount,
      clubId: row.club_id,
      clubName: clubNameById.get(row.club_id) ?? "Unknown club",
      coverImageUrl: row.cover_image_url,
      description: row.description,
      endAt: row.end_at,
      eventId: row.id,
      joinDeadlineAt: row.join_deadline_at,
      joinedVenueCount: metrics.joinedVenueCount,
      maxParticipants: row.max_participants,
      minimumStampsRequired: row.minimum_stamps_required,
      name: row.name,
      registeredParticipantCount: metrics.registeredParticipantCount,
      rewardTierCount: metrics.rewardTierCount,
      startAt: row.start_at,
      status: row.status,
      timelineState: deriveTimelineState(row.status, row.start_at, row.end_at, now),
      validStampCount: metrics.validStampCount,
      visibility: row.visibility,
    };
  });
};

const createSummary = (
  memberships: ClubMembershipSummary[],
  events: ClubDashboardEventSummary[]
): ClubDashboardSnapshot["summary"] => ({
  claimedRewardCount: events.reduce((total, event) => total + event.claimedRewardCount, 0),
  creatableClubCount: memberships.filter((membership) => membership.canCreateEvents).length,
  joinedVenueCount: events.reduce((total, event) => total + event.joinedVenueCount, 0),
  liveEventCount: events.filter((event) => event.timelineState === "LIVE").length,
  managedClubCount: memberships.length,
  registeredParticipantCount: events.reduce((total, event) => total + event.registeredParticipantCount, 0),
  rewardTierCount: events.reduce((total, event) => total + event.rewardTierCount, 0),
  upcomingEventCount: events.filter((event) => event.timelineState === "UPCOMING").length,
  validStampCount: events.reduce((total, event) => total + event.validStampCount, 0),
});

export const fetchClubDashboardSnapshotAsync = async (userId: string): Promise<ClubDashboardSnapshot> => {
  const membershipRows = await fetchClubMembershipsAsync(userId);
  const clubs = await fetchClubsByIdsAsync(membershipRows.map((membership) => membership.club_id));
  const memberships = mapMemberships(membershipRows, clubs);
  const events = await fetchEventsByClubIdsAsync(memberships.map((membership) => membership.clubId));
  const eventIds = events.map((event) => event.id);
  const [registrations, venues, rewardTiers, rewardClaims, stamps] = await Promise.all([
    fetchEventRegistrationsAsync(eventIds),
    fetchEventVenuesAsync(eventIds),
    fetchRewardTiersAsync(eventIds),
    fetchRewardClaimsAsync(eventIds),
    fetchStampsAsync(eventIds),
  ]);
  const mappedEvents = mapEvents(
    events,
    memberships,
    mapMetricsByEventId(registrations, venues, rewardTiers, rewardClaims, stamps),
    Date.now()
  );

  return {
    events: mappedEvents,
    memberships,
    summary: createSummary(memberships, mappedEvents),
  };
};

export const useClubDashboardQuery = ({
  userId,
  isEnabled,
}: UseClubDashboardQueryParams): UseQueryResult<ClubDashboardSnapshot, Error> =>
  useQuery({
    queryKey: clubDashboardQueryKey(userId),
    queryFn: async () => fetchClubDashboardSnapshotAsync(userId),
    enabled: isEnabled,
  });
