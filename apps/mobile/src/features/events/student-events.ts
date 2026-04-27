import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import type {
  EventRegistrationState,
  EventRegistrationStatus,
  EventTimelineState,
  StudentEventSummary,
} from "@/features/events/types";

type EventRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  country: string;
  start_at: string;
  end_at: string;
  join_deadline_at: string;
  status: "PUBLISHED" | "ACTIVE";
  max_participants: number | null;
  minimum_stamps_required: number;
};

type EventRegistrationRow = {
  event_id: string;
  status: EventRegistrationStatus;
};

type StudentEventsBuckets = {
  activeEvents: StudentEventSummary[];
  upcomingEvents: StudentEventSummary[];
};

type UseStudentEventsQueryParams = {
  studentId: string;
  isEnabled: boolean;
};

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

const deriveTimelineState = (startAt: string, endAt: string, now: number): EventTimelineState | null => {
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
  const timelineState = deriveTimelineState(row.start_at, row.end_at, now);

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
    startAt: row.start_at,
    endAt: row.end_at,
    joinDeadlineAt: row.join_deadline_at,
    maxParticipants: row.max_participants,
    minimumStampsRequired: row.minimum_stamps_required,
    timelineState,
    registrationState: deriveRegistrationState(row.id, registrationsByEventId),
  };
};

const createBuckets = (events: StudentEventSummary[]): StudentEventsBuckets => ({
  activeEvents: events.filter((event) => event.timelineState === "ACTIVE"),
  upcomingEvents: events.filter((event) => event.timelineState === "UPCOMING"),
});

const fetchVisibleEventsAsync = async (): Promise<EventRow[]> => {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id,name,slug,description,city,country,start_at,end_at,join_deadline_at,status,max_participants,minimum_stamps_required"
    )
    .in("status", ["PUBLISHED", "ACTIVE"])
    .eq("visibility", "PUBLIC")
    .order("start_at", { ascending: true })
    .returns<EventRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load public student events: ${error.message}`);
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
  const [events, registrations] = await Promise.all([
    fetchVisibleEventsAsync(),
    fetchStudentRegistrationsAsync(studentId),
  ]);

  const registrationsByEventId = createRegistrationMap(registrations);
  const now = Date.now();
  const visibleEvents = events
    .map((row) => mapEventSummary(row, now, registrationsByEventId))
    .filter((event): event is StudentEventSummary => event !== null);

  return createBuckets(visibleEvents);
};

export const useStudentEventsQuery = ({
  studentId,
  isEnabled,
}: UseStudentEventsQueryParams): UseQueryResult<StudentEventsBuckets, Error> =>
  useQuery({
    queryKey: ["student-events", studentId],
    queryFn: async () => fetchStudentEventsAsync(studentId),
    enabled: isEnabled,
  });
