export type EventRegistrationStatus = "REGISTERED" | "CANCELLED" | "BANNED";

export type EventTimelineState = "ACTIVE" | "UPCOMING";

export type EventRegistrationState = "REGISTERED" | "CANCELLED" | "BANNED" | "NOT_REGISTERED";

export type StudentEventSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  country: string;
  startAt: string;
  endAt: string;
  joinDeadlineAt: string;
  maxParticipants: number | null;
  minimumStampsRequired: number;
  timelineState: EventTimelineState;
  registrationState: EventRegistrationState;
};
