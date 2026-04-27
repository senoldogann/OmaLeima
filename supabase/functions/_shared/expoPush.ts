export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

export type ExpoPushSendResult =
  | {
      ok: true;
      ticketId: string | null;
      responseBody: unknown;
    }
  | {
      ok: false;
      message: string;
      responseBody: unknown;
    };

const buildHeaders = (accessToken: string | null): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (accessToken !== null) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
};

export const sendExpoPushMessage = async (
  pushApiUrl: string,
  accessToken: string | null,
  message: ExpoPushMessage,
): Promise<ExpoPushSendResult> => {
  let response: Response;

  try {
    response = await fetch(pushApiUrl, {
      method: "POST",
      headers: buildHeaders(accessToken),
      body: JSON.stringify(message),
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unknown Expo push transport error.",
      responseBody: null,
    };
  }

  let responseBody: unknown = null;

  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      message: `Expo Push API returned HTTP ${response.status}.`,
      responseBody,
    };
  }

  const data = typeof responseBody === "object" && responseBody !== null
    ? (responseBody as Record<string, unknown>).data
    : undefined;

  const ticket = Array.isArray(data) ? data[0] : data;

  if (typeof ticket !== "object" || ticket === null) {
    return {
      ok: false,
      message: "Expo Push API response did not contain a push ticket.",
      responseBody,
    };
  }

  const ticketRecord = ticket as Record<string, unknown>;

  if (ticketRecord.status === "ok") {
    return {
      ok: true,
      ticketId: typeof ticketRecord.id === "string" ? ticketRecord.id : null,
      responseBody,
    };
  }

  return {
    ok: false,
    message: typeof ticketRecord.message === "string"
      ? ticketRecord.message
      : "Expo Push API returned an error ticket.",
    responseBody,
  };
};
