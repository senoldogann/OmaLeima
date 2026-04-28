import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchClubEventContextAsync } from "@/features/club-events/context";
import type { ClubEventRecord, ClubEventsSnapshot } from "@/features/club-events/types";

const latestEventLimit = 8;

type EventRow = {
  city: string;
  club_id: string;
  created_at: string;
  created_by: string;
  end_at: string;
  id: string;
  join_deadline_at: string;
  max_participants: number | null;
  minimum_stamps_required: number;
  name: string;
  slug: string;
  start_at: string;
  status: ClubEventRecord["status"];
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
      "id,club_id,name,slug,city,start_at,end_at,join_deadline_at,status,visibility,max_participants,minimum_stamps_required,created_by,created_at"
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

const mapEventRecords = (
  rows: EventRow[],
  clubNames: Map<string, string>,
  creatorEmails: Map<string, string>
): ClubEventRecord[] =>
  rows.map((row) => ({
    city: row.city,
    clubId: row.club_id,
    clubName: clubNames.get(row.club_id) ?? "Unknown club",
    createdAt: row.created_at,
    createdByEmail: creatorEmails.get(row.created_by) ?? null,
    endAt: row.end_at,
    eventId: row.id,
    joinDeadlineAt: row.join_deadline_at,
    maxParticipants: row.max_participants,
    minimumStampsRequired: row.minimum_stamps_required,
    name: row.name,
    slug: row.slug,
    startAt: row.start_at,
    status: row.status,
    visibility: row.visibility,
  }));

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

  return {
    memberships: context.memberships,
    recentEvents: mapEventRecords(eventRows, clubNames, creatorEmails),
    summary: {
      creatableClubCount: context.memberships.filter((membership) => membership.canCreateEvents).length,
      latestEventLimit,
      managedClubCount: context.memberships.length,
      visibleEventCount,
    },
  };
};
