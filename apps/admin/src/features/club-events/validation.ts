import type {
  ClubEventCancelPayload,
  ClubEventCreationPayload,
  ClubEventUpdatePayload,
  EventRules,
} from "@/features/club-events/types";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const integerPattern = /^-?\d+$/;
const absoluteDateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

export class ClubEventValidationError extends Error {}

export const isUuid = (value: string): boolean => uuidPattern.test(value);

const parseFiniteInteger = (value: string, fieldName: string): number | null => {
  if (value.trim().length === 0) {
    return null;
  }

  if (!integerPattern.test(value.trim())) {
    throw new ClubEventValidationError(`${fieldName} must be a valid integer.`);
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue)) {
    throw new ClubEventValidationError(`${fieldName} must be a valid integer.`);
  }

  return parsedValue;
};

export const parseIsoDateTimeOrThrow = (value: string, fieldName: string): string => {
  if (!absoluteDateTimePattern.test(value.trim())) {
    throw new ClubEventValidationError(`${fieldName} must be an ISO datetime with timezone.`);
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ClubEventValidationError(`${fieldName} must be a valid datetime.`);
  }

  return parsedDate.toISOString();
};

export const parseRulesJsonOrThrow = (value: string): EventRules => {
  if (value.trim().length === 0) {
    return {};
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(value) as unknown;
  } catch {
    throw new ClubEventValidationError("rulesJson must be valid JSON.");
  }

  if (
    parsedValue === null ||
    Array.isArray(parsedValue) ||
    typeof parsedValue !== "object"
  ) {
    throw new ClubEventValidationError("rulesJson must be a JSON object.");
  }

  return parsedValue as EventRules;
};

export const parseClubEventCreationPayloadOrThrow = (
  body: Partial<ClubEventCreationPayload>
): ClubEventCreationPayload & {
  maxParticipantsValue: number | null;
  minimumStampsRequiredValue: number;
  parsedRules: EventRules;
} => {
  if (typeof body.clubId !== "string" || !isUuid(body.clubId)) {
    throw new ClubEventValidationError("clubId must be a valid UUID.");
  }

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    throw new ClubEventValidationError("name is required.");
  }

  if (typeof body.city !== "string" || body.city.trim().length === 0) {
    throw new ClubEventValidationError("city is required.");
  }

  if (
    typeof body.visibility !== "string" ||
    !["PUBLIC", "PRIVATE", "UNLISTED"].includes(body.visibility)
  ) {
    throw new ClubEventValidationError("visibility must be PUBLIC, PRIVATE, or UNLISTED.");
  }

  if (
    typeof body.startAt !== "string" ||
    typeof body.endAt !== "string" ||
    typeof body.joinDeadlineAt !== "string" ||
    typeof body.description !== "string" ||
    typeof body.country !== "string" ||
    typeof body.coverImageUrl !== "string" ||
    typeof body.maxParticipants !== "string" ||
    typeof body.minimumStampsRequired !== "string" ||
    typeof body.rulesJson !== "string"
  ) {
    throw new ClubEventValidationError("event creation payload is incomplete.");
  }

  const maxParticipantsValue = parseFiniteInteger(body.maxParticipants, "maxParticipants");
  const minimumStampsRequiredValue = parseFiniteInteger(
    body.minimumStampsRequired,
    "minimumStampsRequired"
  );

  if (minimumStampsRequiredValue === null) {
    throw new ClubEventValidationError("minimumStampsRequired is required.");
  }

  return {
    city: body.city,
    clubId: body.clubId,
    country: body.country,
    coverImageUrl: body.coverImageUrl,
    description: body.description,
    endAt: body.endAt,
    joinDeadlineAt: body.joinDeadlineAt,
    maxParticipants: body.maxParticipants,
    maxParticipantsValue,
    minimumStampsRequired: body.minimumStampsRequired,
    minimumStampsRequiredValue,
    name: body.name,
    parsedRules: parseRulesJsonOrThrow(body.rulesJson),
    rulesJson: body.rulesJson,
    startAt: body.startAt,
    visibility: body.visibility,
  };
};

const parseSharedEditableEventFieldsOrThrow = (
  body: Partial<ClubEventUpdatePayload>
): Omit<ClubEventUpdatePayload, "eventId"> & {
  maxParticipantsValue: number | null;
  minimumStampsRequiredValue: number;
  parsedRules: EventRules;
} => {
  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    throw new ClubEventValidationError("name is required.");
  }

  if (typeof body.city !== "string" || body.city.trim().length === 0) {
    throw new ClubEventValidationError("city is required.");
  }

  if (
    typeof body.visibility !== "string" ||
    !["PUBLIC", "PRIVATE", "UNLISTED"].includes(body.visibility)
  ) {
    throw new ClubEventValidationError("visibility must be PUBLIC, PRIVATE, or UNLISTED.");
  }

  if (
    typeof body.status !== "string" ||
    !["ACTIVE", "DRAFT", "PUBLISHED"].includes(body.status)
  ) {
    throw new ClubEventValidationError("status must be ACTIVE, DRAFT, or PUBLISHED.");
  }

  if (
    typeof body.startAt !== "string" ||
    typeof body.endAt !== "string" ||
    typeof body.joinDeadlineAt !== "string" ||
    typeof body.description !== "string" ||
    typeof body.coverImageUrl !== "string" ||
    typeof body.maxParticipants !== "string" ||
    typeof body.minimumStampsRequired !== "string" ||
    typeof body.rulesJson !== "string"
  ) {
    throw new ClubEventValidationError("event update payload is incomplete.");
  }

  const maxParticipantsValue = parseFiniteInteger(body.maxParticipants, "maxParticipants");
  const minimumStampsRequiredValue = parseFiniteInteger(
    body.minimumStampsRequired,
    "minimumStampsRequired"
  );

  if (minimumStampsRequiredValue === null) {
    throw new ClubEventValidationError("minimumStampsRequired is required.");
  }

  return {
    city: body.city,
    coverImageUrl: body.coverImageUrl,
    description: body.description,
    endAt: body.endAt,
    joinDeadlineAt: body.joinDeadlineAt,
    maxParticipants: body.maxParticipants,
    maxParticipantsValue,
    minimumStampsRequired: body.minimumStampsRequired,
    minimumStampsRequiredValue,
    name: body.name,
    parsedRules: parseRulesJsonOrThrow(body.rulesJson),
    rulesJson: body.rulesJson,
    startAt: body.startAt,
    status: body.status,
    visibility: body.visibility,
  };
};

export const parseClubEventUpdatePayloadOrThrow = (
  body: Partial<ClubEventUpdatePayload>
): ClubEventUpdatePayload & {
  maxParticipantsValue: number | null;
  minimumStampsRequiredValue: number;
  parsedRules: EventRules;
} => {
  if (typeof body.eventId !== "string" || !isUuid(body.eventId)) {
    throw new ClubEventValidationError("eventId must be a valid UUID.");
  }

  const sharedFields = parseSharedEditableEventFieldsOrThrow(body);

  return {
    ...sharedFields,
    eventId: body.eventId,
  };
};

export const parseClubEventCancelPayloadOrThrow = (
  body: Partial<ClubEventCancelPayload>
): ClubEventCancelPayload => {
  if (typeof body.eventId !== "string" || !isUuid(body.eventId)) {
    throw new ClubEventValidationError("eventId must be a valid UUID.");
  }

  return {
    eventId: body.eventId,
  };
};
