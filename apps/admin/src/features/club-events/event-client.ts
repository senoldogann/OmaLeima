import type { ClubEventCreationPayload, ClubEventMutationResponse } from "@/features/club-events/types";

export const clubEventRefreshableStatuses = new Set<string>(["SUCCESS"]);

const localDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const toUtcIsoDateTimeOrThrow = (value: string, fieldName: string): string => {
  if (!localDateTimePattern.test(value.trim())) {
    throw new Error(`${fieldName} must be selected before creating the event.`);
  }

  const parsedValue = new Date(value);

  if (Number.isNaN(parsedValue.getTime())) {
    throw new Error(`${fieldName} must be a valid local datetime.`);
  }

  return parsedValue.toISOString();
};

export const submitClubEventCreationRequestAsync = async (
  body: ClubEventCreationPayload
): Promise<ClubEventMutationResponse> => {
  const requestBody: ClubEventCreationPayload = {
    ...body,
    endAt: toUtcIsoDateTimeOrThrow(body.endAt, "endAt"),
    joinDeadlineAt: toUtcIsoDateTimeOrThrow(body.joinDeadlineAt, "joinDeadlineAt"),
    startAt: toUtcIsoDateTimeOrThrow(body.startAt, "startAt"),
  };
  const response = await fetch("/api/club/events/create", {
    body: JSON.stringify(requestBody),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json()) as Partial<ClubEventMutationResponse>;
  const message =
    typeof responseBody.message === "string"
      ? responseBody.message
      : "Club event creation request completed.";
  const status = typeof responseBody.status === "string" ? responseBody.status : null;

  return {
    message,
    status,
  };
};
