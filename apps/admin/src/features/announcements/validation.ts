import type {
  AnnouncementAudience,
  AnnouncementCreatePayload,
  AnnouncementStatus,
} from "@/features/announcements/types";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const absoluteDateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const integerPattern = /^-?\d+$/;

export class AnnouncementValidationError extends Error { }

const announcementAudiences = new Set<string>(["ALL", "BUSINESSES", "CLUBS", "STUDENTS"]);
const announcementStatuses = new Set<string>(["DRAFT", "PUBLISHED", "ARCHIVED"]);

const isUuid = (value: string): boolean => uuidPattern.test(value);

export const parseAnnouncementIdOrThrow = (value: unknown): string => {
  if (typeof value !== "string" || !isUuid(value)) {
    throw new AnnouncementValidationError("announcementId must be a valid UUID.");
  }

  return value;
};

export const parseOptionalAnnouncementClubIdOrThrow = (value: unknown): string | null => {
  if (typeof value !== "string") {
    throw new AnnouncementValidationError("clubId must be a string.");
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    return null;
  }

  if (!isUuid(normalizedValue)) {
    throw new AnnouncementValidationError("clubId must be a valid UUID when provided.");
  }

  return normalizedValue;
};

const parseIsoDateTimeOrThrow = (value: string, fieldName: string): string => {
  if (!absoluteDateTimePattern.test(value.trim())) {
    throw new AnnouncementValidationError(`${fieldName} must be an ISO datetime with timezone.`);
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new AnnouncementValidationError(`${fieldName} must be a valid datetime.`);
  }

  return parsedDate.toISOString();
};

const parseOptionalIsoDateTimeOrThrow = (value: string, fieldName: string): string | null => {
  if (value.trim().length === 0) {
    return null;
  }

  return parseIsoDateTimeOrThrow(value, fieldName);
};

const parseOptionalUrlOrThrow = (value: string, fieldName: string): string | null => {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return null;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedValue);
  } catch {
    throw new AnnouncementValidationError(`${fieldName} must be a valid absolute URL.`);
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new AnnouncementValidationError(`${fieldName} must use http or https.`);
  }

  if (trimmedValue.length > 500) {
    throw new AnnouncementValidationError(`${fieldName} must be 500 characters or shorter.`);
  }

  return trimmedValue;
};

const parsePriorityOrThrow = (value: string): number => {
  if (!integerPattern.test(value.trim())) {
    throw new AnnouncementValidationError("priority must be a valid integer.");
  }

  const parsedPriority = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedPriority) || parsedPriority < 0 || parsedPriority > 10) {
    throw new AnnouncementValidationError("priority must be between 0 and 10.");
  }

  return parsedPriority;
};

export const parseAnnouncementCreatePayloadOrThrow = (
  body: Partial<AnnouncementCreatePayload>
): AnnouncementCreatePayload & {
  audienceValue: AnnouncementAudience;
  clubIdValue: string | null;
  endsAtValue: string | null;
  eventIdValue: string | null;
  priorityValue: number;
  imageUrlValue: string | null;
  imageStagingPathValue: string | null;
  startsAtValue: string;
  statusValue: AnnouncementStatus;
} => {
  if (typeof body.title !== "string" || body.title.trim().length < 3 || body.title.trim().length > 120) {
    throw new AnnouncementValidationError("title must be between 3 and 120 characters.");
  }

  if (typeof body.body !== "string" || body.body.trim().length < 12 || body.body.trim().length > 1200) {
    throw new AnnouncementValidationError("body must be between 12 and 1200 characters.");
  }

  if (typeof body.audience !== "string" || !announcementAudiences.has(body.audience)) {
    throw new AnnouncementValidationError("audience is invalid.");
  }

  if (typeof body.status !== "string" || !announcementStatuses.has(body.status)) {
    throw new AnnouncementValidationError("status is invalid.");
  }

  if (
    typeof body.clubId !== "string" ||
    typeof body.ctaLabel !== "string" ||
    typeof body.ctaUrl !== "string" ||
    typeof body.endsAt !== "string" ||
    typeof body.eventId !== "string" ||
    typeof body.imageStagingPath !== "string" ||
    typeof body.imageUrl !== "string" ||
    typeof body.priority !== "string" ||
    typeof body.startsAt !== "string"
  ) {
    throw new AnnouncementValidationError("announcement creation payload is incomplete.");
  }

  const clubIdValue = body.clubId.trim().length === 0 ? null : body.clubId.trim();

  if (clubIdValue !== null && !isUuid(clubIdValue)) {
    throw new AnnouncementValidationError("clubId must be a valid UUID when provided.");
  }

  const eventIdValue = body.eventId.trim().length === 0 ? null : body.eventId.trim();

  if (eventIdValue !== null && !isUuid(eventIdValue)) {
    throw new AnnouncementValidationError("eventId must be a valid UUID when provided.");
  }

  if (eventIdValue !== null && (clubIdValue === null || body.audience !== "STUDENTS")) {
    throw new AnnouncementValidationError("event-scoped announcements require a clubId and STUDENTS audience.");
  }

  if (body.ctaLabel.trim().length > 0 && (body.ctaLabel.trim().length < 2 || body.ctaLabel.trim().length > 60)) {
    throw new AnnouncementValidationError("ctaLabel must be between 2 and 60 characters when provided.");
  }

  const ctaUrlValue = parseOptionalUrlOrThrow(body.ctaUrl, "ctaUrl");
  const imageUrlValue = parseOptionalUrlOrThrow(body.imageUrl, "imageUrl");
  const imageStagingPathValue = body.imageStagingPath.trim().length === 0 ? null : body.imageStagingPath.trim();
  const startsAtValue = parseIsoDateTimeOrThrow(body.startsAt, "startsAt");
  const endsAtValue = parseOptionalIsoDateTimeOrThrow(body.endsAt, "endsAt");

  if (body.status === "DRAFT" && imageUrlValue !== null && imageStagingPathValue === null) {
    throw new AnnouncementValidationError("draft announcement imageUrl must be empty.");
  }

  if (endsAtValue !== null && new Date(endsAtValue).getTime() <= new Date(startsAtValue).getTime()) {
    throw new AnnouncementValidationError("endsAt must be after startsAt.");
  }

  return {
    audience: body.audience,
    audienceValue: body.audience as AnnouncementAudience,
    body: body.body.trim(),
    clubId: body.clubId,
    clubIdValue,
    ctaLabel: body.ctaLabel.trim(),
    ctaUrl: ctaUrlValue ?? "",
    endsAt: body.endsAt,
    endsAtValue,
    eventId: body.eventId,
    eventIdValue,
    imageStagingPath: body.imageStagingPath,
    imageStagingPathValue,
    imageUrl: body.imageUrl.trim(),
    imageUrlValue,
    priority: body.priority,
    priorityValue: parsePriorityOrThrow(body.priority),
    startsAt: body.startsAt,
    startsAtValue,
    status: body.status,
    statusValue: body.status as AnnouncementStatus,
    title: body.title.trim(),
  };
};
