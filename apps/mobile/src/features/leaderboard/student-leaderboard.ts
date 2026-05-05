import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import type {
  EventLeaderboardResult,
  LeaderboardEntry,
  RegisteredLeaderboardEvent,
  StudentLeaderboardOverview,
  StudentLeaderboardTimelineState,
} from "@/features/leaderboard/types";

type RegistrationRow = {
  event_id: string;
};

type EventRow = {
  cover_image_url: string | null;
  country: string;
  id: string;
  name: string;
  city: string;
  start_at: string;
  end_at: string;
  status: "PUBLISHED" | "ACTIVE" | "COMPLETED";
};

type LeaderboardRpcEntry = {
  student_id: string;
  display_name: string | null;
  avatar_url: string | null;
  stamp_count: number;
  last_stamp_at: string | null;
  rank: number;
};

type LeaderboardRpcResponse = {
  top10: LeaderboardRpcEntry[];
  currentUser: LeaderboardRpcEntry | null;
  refreshedAt: string | null;
  version: number | null;
};

type UseStudentLeaderboardOverviewQueryParams = {
  studentId: string;
  isEnabled: boolean;
};

type UseEventLeaderboardQueryParams = {
  eventId: string;
  studentId: string;
  isEnabled: boolean;
};

export const deriveLeaderboardTimelineState = (
  event: Pick<RegisteredLeaderboardEvent, "startAt" | "endAt" | "status">,
  now: number
): StudentLeaderboardTimelineState => {
  if (event.status === "COMPLETED") {
    return "COMPLETED";
  }

  const startTime = new Date(event.startAt).getTime();
  const endTime = new Date(event.endAt).getTime();

  if (now >= startTime && now <= endTime) {
    return "ACTIVE";
  }

  if (now < startTime) {
    return "UPCOMING";
  }

  return "COMPLETED";
};

const compareRegisteredEvents = (
  left: RegisteredLeaderboardEvent,
  right: RegisteredLeaderboardEvent
): number => {
  const order: Record<StudentLeaderboardTimelineState, number> = {
    ACTIVE: 0,
    UPCOMING: 1,
    COMPLETED: 2,
  };

  if (order[left.timelineState] !== order[right.timelineState]) {
    return order[left.timelineState] - order[right.timelineState];
  }

  if (left.isRegistered !== right.isRegistered) {
    return left.isRegistered ? -1 : 1;
  }

  if (left.timelineState === "COMPLETED") {
    return new Date(right.endAt).getTime() - new Date(left.endAt).getTime();
  }

  return new Date(left.startAt).getTime() - new Date(right.startAt).getTime();
};

const mapRegisteredEvent = (
  event: EventRow,
  now: number,
  registeredEventIds: ReadonlySet<string>
): RegisteredLeaderboardEvent => ({
  coverImageUrl: event.cover_image_url,
  country: event.country,
  id: event.id,
  isRegistered: registeredEventIds.has(event.id),
  name: event.name,
  city: event.city,
  startAt: event.start_at,
  endAt: event.end_at,
  status: event.status,
  timelineState: deriveLeaderboardTimelineState(
    {
      startAt: event.start_at,
      endAt: event.end_at,
      status: event.status,
    },
    now
  ),
});

export const hydrateRegisteredLeaderboardEvents = (
  events: RegisteredLeaderboardEvent[],
  now: number
): RegisteredLeaderboardEvent[] =>
  events
    .map((event) => ({
      ...event,
      timelineState: deriveLeaderboardTimelineState(event, now),
    }))
    .sort(compareRegisteredEvents);

const groupEventIds = (rows: RegistrationRow[]): string[] => Array.from(new Set(rows.map((row) => row.event_id)));

const mapLeaderboardEntry = (entry: LeaderboardRpcEntry): LeaderboardEntry => ({
  studentId: entry.student_id,
  displayName: entry.display_name,
  avatarUrl: entry.avatar_url,
  stampCount: entry.stamp_count,
  lastStampAt: entry.last_stamp_at,
  rank: entry.rank,
});

const fetchRegisteredEventIdsAsync = async (studentId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from("event_registrations")
    .select("event_id")
    .eq("student_id", studentId)
    .eq("status", "REGISTERED")
    .returns<RegistrationRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load leaderboard registrations for ${studentId}: ${error.message}`);
  }

  return groupEventIds(data);
};

const fetchVisibleLeaderboardEventsAsync = async (): Promise<EventRow[]> => {
  const { data, error } = await supabase
    .from("events")
    .select("id,name,city,country,cover_image_url,start_at,end_at,status")
    .in("status", ["PUBLISHED", "ACTIVE", "COMPLETED"])
    .eq("visibility", "PUBLIC")
    .returns<EventRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load leaderboard events: ${error.message}`);
  }

  return data;
};

const fetchRegisteredLeaderboardEventsAsync = async (eventIds: string[]): Promise<EventRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("events")
    .select("id,name,city,country,cover_image_url,start_at,end_at,status")
    .in("id", eventIds)
    .in("status", ["PUBLISHED", "ACTIVE", "COMPLETED"])
    .returns<EventRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load registered leaderboard events: ${error.message}`);
  }

  return data;
};

const fetchEventLeaderboardRpcAsync = async (
  eventId: string,
  studentId: string
): Promise<LeaderboardRpcResponse> => {
  const { data, error } = await supabase.rpc("get_event_leaderboard", {
    p_event_id: eventId,
    p_current_user_id: studentId,
  });

  if (error !== null) {
    throw new Error(`Failed to load event leaderboard for ${eventId}: ${error.message}`);
  }

  return data as LeaderboardRpcResponse;
};

export const studentLeaderboardOverviewQueryKey = (studentId: string) =>
  ["student-leaderboard-overview", studentId] as const;

export const eventLeaderboardQueryKey = (eventId: string, studentId: string) =>
  ["event-leaderboard", eventId, studentId] as const;

export const selectDefaultLeaderboardEvent = (
  events: RegisteredLeaderboardEvent[]
): RegisteredLeaderboardEvent | null => events[0] ?? null;

export const fetchStudentLeaderboardOverviewAsync = async (
  studentId: string
): Promise<StudentLeaderboardOverview> => {
  const eventIds = await fetchRegisteredEventIdsAsync(studentId);
  const [visibleEvents, registeredEvents] = await Promise.all([
    fetchVisibleLeaderboardEventsAsync(),
    fetchRegisteredLeaderboardEventsAsync(eventIds),
  ]);
  const mergedEvents = Array.from(
    new Map([...visibleEvents, ...registeredEvents].map((event) => [event.id, event] as const)).values()
  );

  const now = Date.now();
  const registeredEventIds = new Set(eventIds);

  return {
    registeredEventCount: eventIds.length,
    events: mergedEvents
      .map((event) => mapRegisteredEvent(event, now, registeredEventIds))
      .sort(compareRegisteredEvents),
  };
};

export const fetchEventLeaderboardAsync = async (
  eventId: string,
  studentId: string
): Promise<EventLeaderboardResult> => {
  const leaderboard = await fetchEventLeaderboardRpcAsync(eventId, studentId);

  return {
    top10: leaderboard.top10.map(mapLeaderboardEntry),
    currentUser: leaderboard.currentUser === null ? null : mapLeaderboardEntry(leaderboard.currentUser),
    refreshedAt: leaderboard.refreshedAt,
    version: leaderboard.version,
  };
};

export const useStudentLeaderboardOverviewQuery = ({
  studentId,
  isEnabled,
}: UseStudentLeaderboardOverviewQueryParams): UseQueryResult<StudentLeaderboardOverview, Error> =>
  useQuery({
    queryKey: studentLeaderboardOverviewQueryKey(studentId),
    queryFn: async () => fetchStudentLeaderboardOverviewAsync(studentId),
    enabled: isEnabled,
  });

export const useEventLeaderboardQuery = ({
  eventId,
  studentId,
  isEnabled,
}: UseEventLeaderboardQueryParams): UseQueryResult<EventLeaderboardResult, Error> =>
  useQuery({
    queryKey: eventLeaderboardQueryKey(eventId, studentId),
    queryFn: async () => fetchEventLeaderboardAsync(eventId, studentId),
    enabled: isEnabled,
  });
