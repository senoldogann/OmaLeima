import type {
  AnnouncementCreatePayload,
  AnnouncementMutationResponse,
} from "@/features/announcements/types";

const localDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const toUtcIsoDateTimeOrThrow = (value: string, fieldName: string): string => {
  if (!localDateTimePattern.test(value.trim())) {
    throw new Error(`${fieldName} must be selected before saving the announcement.`);
  }

  const parsedValue = new Date(value);

  if (Number.isNaN(parsedValue.getTime())) {
    throw new Error(`${fieldName} must be a valid local datetime.`);
  }

  return parsedValue.toISOString();
};

const toOptionalUtcIsoDateTimeOrThrow = (value: string, fieldName: string): string => {
  if (value.trim().length === 0) {
    return "";
  }

  return toUtcIsoDateTimeOrThrow(value, fieldName);
};

const parseAnnouncementResponseAsync = async (
  response: Response
): Promise<AnnouncementMutationResponse> => {
  const responseBody = (await response.json()) as Partial<AnnouncementMutationResponse>;

  return {
    message:
      typeof responseBody.message === "string"
        ? responseBody.message
        : "Announcement request completed.",
    status: typeof responseBody.status === "string" ? responseBody.status : null,
  };
};

export const submitAnnouncementCreateRequestAsync = async (
  body: AnnouncementCreatePayload
): Promise<AnnouncementMutationResponse> => {
  const requestBody: AnnouncementCreatePayload = {
    ...body,
    endsAt: toOptionalUtcIsoDateTimeOrThrow(body.endsAt, "endsAt"),
    startsAt: toUtcIsoDateTimeOrThrow(body.startsAt, "startsAt"),
  };
  const response = await fetch("/api/announcements/create", {
    body: JSON.stringify(requestBody),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseAnnouncementResponseAsync(response);
};

export const submitAnnouncementUpdateRequestAsync = async (
  announcementId: string,
  body: AnnouncementCreatePayload
): Promise<AnnouncementMutationResponse> => {
  const requestBody = {
    ...body,
    announcementId,
    endsAt: toOptionalUtcIsoDateTimeOrThrow(body.endsAt, "endsAt"),
    startsAt: toUtcIsoDateTimeOrThrow(body.startsAt, "startsAt"),
  };
  const response = await fetch("/api/announcements/update", {
    body: JSON.stringify(requestBody),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseAnnouncementResponseAsync(response);
};

export const submitAnnouncementArchiveRequestAsync = async (
  announcementId: string,
  clubId: string | null
): Promise<AnnouncementMutationResponse> => {
  const response = await fetch("/api/announcements/archive", {
    body: JSON.stringify({
      announcementId,
      clubId: clubId ?? "",
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseAnnouncementResponseAsync(response);
};

export const submitAnnouncementPushRequestAsync = async (
  announcementId: string
): Promise<AnnouncementMutationResponse> => {
  const response = await fetch("/api/announcements/send-push", {
    body: JSON.stringify({
      announcementId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseAnnouncementResponseAsync(response);
};
