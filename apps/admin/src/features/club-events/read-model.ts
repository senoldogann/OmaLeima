import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchClubEventContextAsync } from "@/features/club-events/context";
import type { ClubEventRecord, ClubEventsSnapshot, EventRules } from "@/features/club-events/types";
import { createSignedStagedMediaUrlAsync } from "@/features/media/staged-media";

const latestEventLimit = 8;

type EventRow = {
  city: string;
  club_id: string;
  cover_image_staging_path: string | null;
  cover_image_url: string | null;
  created_at: string;
  created_by: string;
  description: string | null;
  end_at: string;
  id: string;
  join_deadline_at: string;
  max_participants: number | null;
  minimum_stamps_required: number;
  name: string;
  rules: EventRules;
  slug: string;
  start_at: string;
  status: ClubEventRecord["status"];
  ticket_url: string | null;
  visibility: ClubEventRecord["visibility"];
};

type ProfileRow = {
  email: string;
  id: string;
};

type ClubRow = {
  id: string;
  name: string;
};

type EventRegistrationRow = {
  event_id: string;
  status: "BANNED" | "CANCELLED" | "REGISTERED";
};

type EventVenueRow = {
  event_id: string;
  status: "INVITED" | "JOINED" | "LEFT" | "REMOVED";
};

type EventOperationalCounts = {
  joinedVenueCount: number;
  registeredParticipantCount: number;
};

const fetchEventsByClubIdsAsync = async (
  supabase: SupabaseClient,
  clubIds: string[]
): Promise<EventRow[]> => {
  if (clubIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("events")
    .select(
      "id,club_id,name,slug,description,city,cover_image_url,cover_image_staging_path,start_at,end_at,join_deadline_at,status,visibility,max_participants,minimum_stamps_required,rules,ticket_url,created_by,created_at"
    )
    .in("club_id", clubIds)
    .order("created_at", {
      ascending: false,
    })
    .limit(latestEventLimit)
    .returns<EventRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load club events: ${error.message}`);
  }

  return data;
};

const fetchVisibleEventCountAsync = async (
  supabase: SupabaseClient,
  clubIds: string[]
): Promise<number> => {
  if (clubIds.length === 0) {
    return 0;
  }

  const { count, error } = await supabase
    .from("events")
    .select("id", {
      count: "exact",
      head: true,
    })
    .in("club_id", clubIds);

  if (error !== null) {
    throw new Error(`Failed to count club events: ${error.message}`);
  }

  return count ?? 0;
};

const fetchProfileEmailsByIdsAsync = async (
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, string>> => {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email")
    .in("id", ids)
    .returns<ProfileRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load club event creator emails: ${error.message}`);
  }

  return new Map(data.map((row) => [row.id, row.email]));
};

const fetchClubNamesByIdsAsync = async (
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, string>> => {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("clubs")
    .select("id,name")
    .in("id", ids)
    .returns<ClubRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load club names for club events: ${error.message}`);
  }

  return new Map(data.map((row) => [row.id, row.name]));
};

const fetchEventRegistrationsByEventIdsAsync = async (
  supabase: SupabaseClient,
  eventIds: string[]
): Promise<EventRegistrationRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("event_registrations")
    .select("event_id,status")
    .in("event_id", eventIds)
    .returns<EventRegistrationRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load club event registration counts: ${error.message}`);
  }

  return data;
};

const fetchEventVenuesByEventIdsAsync = async (
  supabase: SupabaseClient,
  eventIds: string[]
): Promise<EventVenueRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("event_venues")
    .select("event_id,status")
    .in("event_id", eventIds)
    .returns<EventVenueRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load club event venue counts: ${error.message}`);
  }

  return data;
};

const mapOperationalCountsByEventId = (
  registrations: EventRegistrationRow[],
  venues: EventVenueRow[]
): Map<string, EventOperationalCounts> => {
  const counts = new Map<string, EventOperationalCounts>();
  const ensureCounts = (eventId: string): EventOperationalCounts => {
    const existingCounts = counts.get(eventId);

    if (typeof existingCounts !== "undefined") {
      return existingCounts;
    }

    const nextCounts: EventOperationalCounts = {
      joinedVenueCount: 0,
      registeredParticipantCount: 0,
    };

    counts.set(eventId, nextCounts);
    return nextCounts;
  };

  registrations.forEach((registration) => {
    if (registration.status === "REGISTERED") {
      ensureCounts(registration.event_id).registeredParticipantCount += 1;
    }
  });

  venues.forEach((venue) => {
    if (venue.status === "JOINED") {
      ensureCounts(venue.event_id).joinedVenueCount += 1;
    }
  });

  return counts;
};

const mapEventRecords = (
  rows: EventRow[],
  clubNames: Map<string, string>,
  creatorEmails: Map<string, string>,
  signedUrlByStagingPath: Map<string, string>,
  operationalCounts: Map<string, EventOperationalCounts>
): ClubEventRecord[] =>
  rows.map((row) => ({
    city: row.city,
    clubId: row.club_id,
    clubName: clubNames.get(row.club_id) ?? "Unknown club",
    coverImageStagingPath: row.cover_image_staging_path ?? "",
    coverImageUrl:
      row.cover_image_url ??
      (row.cover_image_staging_path === null ? null : signedUrlByStagingPath.get(row.cover_image_staging_path) ?? null),
    createdAt: row.created_at,
    createdByEmail: creatorEmails.get(row.created_by) ?? null,
    description: row.description,
    endAt: row.end_at,
    eventId: row.id,
    joinDeadlineAt: row.join_deadline_at,
    joinedVenueCount: operationalCounts.get(row.id)?.joinedVenueCount ?? 0,
    maxParticipants: row.max_participants,
    minimumStampsRequired: row.minimum_stamps_required,
    name: row.name,
    registeredParticipantCount: operationalCounts.get(row.id)?.registeredParticipantCount ?? 0,
    rulesJson: JSON.stringify(row.rules, null, 2),
    slug: row.slug,
    startAt: row.start_at,
    status: row.status,
    ticketUrl: row.ticket_url,
    visibility: row.visibility,
  }));

const createSignedUrlByStagingPathAsync = async (
  supabase: SupabaseClient,
  rows: EventRow[]
): Promise<Map<string, string>> => {
  const stagingPaths = Array.from(
    new Set(
      rows
        .map((row) => row.cover_image_staging_path)
        .filter((value): value is string => value !== null && value.trim().length > 0)
    )
  );

  const entries = await Promise.all(
    stagingPaths.map(async (stagingPath): Promise<[string, string]> => [
      stagingPath,
      await createSignedStagedMediaUrlAsync({
        stagingPath,
        supabase,
      }),
    ])
  );

  return new Map(entries);
};

export const fetchClubEventsSnapshotAsync = async (
  supabase: SupabaseClient
): Promise<ClubEventsSnapshot> => {
  const context = await fetchClubEventContextAsync(supabase);
  const clubIds = context.memberships.map((membership) => membership.clubId);
  const [eventRows, visibleEventCount] = await Promise.all([
    fetchEventsByClubIdsAsync(supabase, clubIds),
    fetchVisibleEventCountAsync(supabase, clubIds),
  ]);
  const [clubNames, creatorEmails] = await Promise.all([
    fetchClubNamesByIdsAsync(
      supabase,
      Array.from(new Set(eventRows.map((row) => row.club_id)))
    ),
    fetchProfileEmailsByIdsAsync(
      supabase,
      Array.from(new Set(eventRows.map((row) => row.created_by)))
    ),
  ]);
  const eventIds = eventRows.map((row) => row.id);
  const [registrations, venues] = await Promise.all([
    fetchEventRegistrationsByEventIdsAsync(supabase, eventIds),
    fetchEventVenuesByEventIdsAsync(supabase, eventIds),
  ]);
  const operationalCounts = mapOperationalCountsByEventId(registrations, venues);
  const signedUrlByStagingPath = await createSignedUrlByStagingPathAsync(supabase, eventRows);

  return {
    memberships: context.memberships,
    recentEvents: mapEventRecords(eventRows, clubNames, creatorEmails, signedUrlByStagingPath, operationalCounts),
    summary: {
      creatableClubCount: context.memberships.filter((membership) => membership.canCreateEvents).length,
      latestEventLimit,
      managedClubCount: context.memberships.length,
      visibleEventCount,
    },
  };
};
