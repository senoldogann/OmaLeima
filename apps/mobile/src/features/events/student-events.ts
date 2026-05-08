import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import type {
  EventRegistrationState,
  EventRegistrationStatus,
  EventTimelineState,
  StudentEventsBuckets,
  StudentEventSummary,
} from "@/features/events/types";

type EventRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  country: string;
  cover_image_url: string | null;
  start_at: string;
  end_at: string;
  join_deadline_at: string;
  status: "PUBLISHED" | "ACTIVE";
  ticket_url: string | null;
  max_participants: number | null;
  minimum_stamps_required: number;
};

type EventRegistrationRow = {
  event_id: string;
  status: EventRegistrationStatus;
};

type UseStudentEventsQueryParams = {
  studentId: string;
  isEnabled: boolean;
};

const visiblePublicEventsLimit = 80;

export const studentEventsQueryKey = (studentId: string) => ["student-events", studentId] as const;

const createRegistrationMap = (
  registrations: EventRegistrationRow[]
): ReadonlyMap<string, EventRegistrationStatus> =>
  new Map(registrations.map((registration) => [registration.event_id, registration.status]));

const deriveRegistrationState = (
  eventId: string,
  registrationsByEventId: ReadonlyMap<string, EventRegistrationStatus>
): EventRegistrationState => {
  const registration = registrationsByEventId.get(eventId);

  if (typeof registration === "undefined") {
    return "NOT_REGISTERED";
  }

  return registration;
};

export const deriveStudentEventTimelineState = (
  startAt: string,
  endAt: string,
  now: number
): EventTimelineState | null => {
  const startTime = new Date(startAt).getTime();
  const endTime = new Date(endAt).getTime();

  if (now >= startTime && now <= endTime) {
    return "ACTIVE";
  }

  if (now < startTime) {
    return "UPCOMING";
  }

  return null;
};

const mapEventSummary = (
  row: EventRow,
  now: number,
  registrationsByEventId: ReadonlyMap<string, EventRegistrationStatus>
): StudentEventSummary | null => {
  const timelineState = deriveStudentEventTimelineState(row.start_at, row.end_at, now);

  if (timelineState === null) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    city: row.city,
    country: row.country,
    coverImageUrl: row.cover_image_url,
    startAt: row.start_at,
    endAt: row.end_at,
    joinDeadlineAt: row.join_deadline_at,
    ticketUrl: row.ticket_url,
    maxParticipants: row.max_participants,
    minimumStampsRequired: row.minimum_stamps_required,
    timelineState,
    registrationState: deriveRegistrationState(row.id, registrationsByEventId),
  };
};

export const createStudentEventsBuckets = (events: StudentEventSummary[]): StudentEventsBuckets => ({
  activeEvents: events.filter((event) => event.timelineState === "ACTIVE"),
  upcomingEvents: events.filter((event) => event.timelineState === "UPCOMING"),
});

export const flattenStudentEventsBuckets = (buckets: StudentEventsBuckets): StudentEventSummary[] => [
  ...buckets.activeEvents,
  ...buckets.upcomingEvents,
];

export const rehydrateStudentEventSummaries = (
  events: StudentEventSummary[],
  now: number
): StudentEventSummary[] =>
  events.flatMap((event) => {
    const nextTimelineState = deriveStudentEventTimelineState(event.startAt, event.endAt, now);

    if (nextTimelineState === null) {
      return [];
    }

    if (nextTimelineState === event.timelineState) {
      return [event];
    }

    return [
      {
        ...event,
        timelineState: nextTimelineState,
      },
    ];
  });

export const rehydrateStudentEventsBuckets = (
  buckets: StudentEventsBuckets,
  now: number
): StudentEventsBuckets => createStudentEventsBuckets(rehydrateStudentEventSummaries(flattenStudentEventsBuckets(buckets), now));

const fetchVisibleEventsAsync = async (nowIso: string): Promise<EventRow[]> => {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id,name,slug,description,city,country,cover_image_url,start_at,end_at,join_deadline_at,status,max_participants,minimum_stamps_required,ticket_url"
    )
    .in("status", ["PUBLISHED", "ACTIVE"])
    .eq("visibility", "PUBLIC")
    .gte("end_at", nowIso)
    .order("start_at", { ascending: true })
    .limit(visiblePublicEventsLimit)
    .returns<EventRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load public student events: ${error.message}`);
  }

  return data;
};

const fetchRegisteredEventsAsync = async (eventIds: string[]): Promise<EventRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("events")
    .select(
      "id,name,slug,description,city,country,cover_image_url,start_at,end_at,join_deadline_at,status,max_participants,minimum_stamps_required,ticket_url"
    )
    .in("id", eventIds)
    .in("status", ["PUBLISHED", "ACTIVE"])
    .order("start_at", { ascending: true })
    .returns<EventRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load registered student events: ${error.message}`);
  }

  return data;
};

const fetchStudentRegistrationsAsync = async (studentId: string): Promise<EventRegistrationRow[]> => {
  const { data, error } = await supabase
    .from("event_registrations")
    .select("event_id,status")
    .eq("student_id", studentId)
    .returns<EventRegistrationRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load student registrations for ${studentId}: ${error.message}`);
  }

  return data;
};

export const fetchStudentEventsAsync = async (studentId: string): Promise<StudentEventsBuckets> => {
  const registrations = await fetchStudentRegistrationsAsync(studentId);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const registeredEventIds = Array.from(
    new Set(
      registrations
        .filter((registration) => registration.status === "REGISTERED")
        .map((registration) => registration.event_id)
    )
  );
  const [publicEvents, registeredEvents] = await Promise.all([
    fetchVisibleEventsAsync(nowIso),
    fetchRegisteredEventsAsync(registeredEventIds),
  ]);
  const events = Array.from(
    new Map([...publicEvents, ...registeredEvents].map((event) => [event.id, event] as const)).values()
  );

  const registrationsByEventId = createRegistrationMap(registrations);
  const visibleEvents = events
    .map((row) => mapEventSummary(row, now, registrationsByEventId))
    .filter((event): event is StudentEventSummary => event !== null);

  return createStudentEventsBuckets(visibleEvents);
};

export const useStudentEventsQuery = ({
  studentId,
  isEnabled,
}: UseStudentEventsQueryParams): UseQueryResult<StudentEventsBuckets, Error> =>
  useQuery({
    queryKey: studentEventsQueryKey(studentId),
    queryFn: async () => fetchStudentEventsAsync(studentId),
    enabled: isEnabled,
  });
