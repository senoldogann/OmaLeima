export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

type ExpoPushRequestMessage = ExpoPushMessage & {
  priority: "high";
  sound: "default";
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

const expoPushMaxBatchSize = 100;
const expoPushMaxAttempts = 3;
const expoPushRetryBackoffMs = [300, 900];
const expoPushRequestTimeoutMs = 4000;

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

const isRetryableStatus = (status: number): boolean =>
  status === 429 || status === 500 || status === 502 || status === 503 || status === 504;

const sleep = async (durationMs: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, durationMs));
};

const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const buildFailureResults = (
  count: number,
  message: string,
  responseBody: unknown,
): ExpoPushSendResult[] => Array.from(
  { length: count },
  (): ExpoPushSendResult => ({
    ok: false,
    message,
    responseBody,
  }),
);

const mapResponseToResults = (
  response: Response,
  responseBody: unknown,
  messageCount: number,
): ExpoPushSendResult[] => {
  if (!response.ok) {
    return buildFailureResults(messageCount, `Expo Push API returned HTTP ${response.status}.`, responseBody);
  }

  const data = typeof responseBody === "object" && responseBody !== null
    ? (responseBody as Record<string, unknown>).data
    : undefined;

  const tickets = Array.isArray(data)
    ? data
    : (typeof data === "object" && data !== null && messageCount === 1 ? [data] : null);

  if (tickets === null || tickets.length !== messageCount) {
    return buildFailureResults(
      messageCount,
      "Expo Push API response ticket count did not match the sent message count.",
      responseBody,
    );
  }

  return tickets.map((ticket): ExpoPushSendResult => {
    if (typeof ticket !== "object" || ticket === null) {
      return {
        ok: false,
        message: "Expo Push API returned an invalid push ticket payload.",
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
  });
};

const sendExpoPushBatch = async (
  pushApiUrl: string,
  accessToken: string | null,
  messages: ExpoPushMessage[],
): Promise<ExpoPushSendResult[]> => {
  let attempt = 1;

  while (attempt <= expoPushMaxAttempts) {
    let response: Response;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      const abortController = new AbortController();
      timeoutId = setTimeout(() => {
        abortController.abort(new Error(`Expo Push API request timed out after ${expoPushRequestTimeoutMs}ms.`));
      }, expoPushRequestTimeoutMs);

      response = await fetch(pushApiUrl, {
        method: "POST",
        headers: buildHeaders(accessToken),
        body: JSON.stringify(messages.map(createExpoPushRequestMessage)),
        signal: abortController.signal,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Expo push transport error.";

      if (attempt < expoPushMaxAttempts) {
        console.warn("expo_push_retry", {
          attempt,
          reason: "transport_error",
          message,
        });
        await sleep(expoPushRetryBackoffMs[attempt - 1]);
        attempt += 1;
        continue;
      }

      return buildFailureResults(messages.length, message, null);
    } finally {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    }

    const responseBody = await readResponseBody(response);

    if (response.ok || !isRetryableStatus(response.status) || attempt === expoPushMaxAttempts) {
      return mapResponseToResults(response, responseBody, messages.length);
    }

    console.warn("expo_push_retry", {
      attempt,
      reason: "retryable_http_status",
      status: response.status,
    });
    await sleep(expoPushRetryBackoffMs[attempt - 1]);
    attempt += 1;
  }

  return buildFailureResults(messages.length, "Expo Push API retry loop exited unexpectedly.", null);
};

const createExpoPushRequestMessage = (message: ExpoPushMessage): ExpoPushRequestMessage => ({
  ...message,
  priority: "high",
  sound: "default",
});

const chunkMessages = (messages: ExpoPushMessage[]): ExpoPushMessage[][] => {
  const chunks: ExpoPushMessage[][] = [];
  let index = 0;

  while (index < messages.length) {
    chunks.push(messages.slice(index, index + expoPushMaxBatchSize));
    index += expoPushMaxBatchSize;
  }

  return chunks;
};

export const sendExpoPushMessages = async (
  pushApiUrl: string,
  accessToken: string | null,
  messages: ExpoPushMessage[],
): Promise<ExpoPushSendResult[]> => {
  if (messages.length === 0) {
    return [];
  }

  const chunks = chunkMessages(messages);
  const results: ExpoPushSendResult[] = [];

  for (const chunk of chunks) {
    const chunkResults = await sendExpoPushBatch(pushApiUrl, accessToken, chunk);
    results.push(...chunkResults);
  }

  return results;
};

export const sendExpoPushMessage = async (
  pushApiUrl: string,
  accessToken: string | null,
  message: ExpoPushMessage,
): Promise<ExpoPushSendResult> => {
  const [result] = await sendExpoPushMessages(pushApiUrl, accessToken, [message]);

  if (typeof result === "undefined") {
    return {
      ok: false,
      message: "Expo Push API did not return a result for the sent message.",
      responseBody: null,
    };
  }

  return result;
};
