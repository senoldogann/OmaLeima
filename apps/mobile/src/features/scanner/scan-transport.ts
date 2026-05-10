import type {
  ScanQrResponse,
  ScannerAttemptResult,
  ScannerLocationPayload,
} from "@/features/scanner/types";

type ScanQrTransportParams = {
  supabaseUrl: string;
  publishableKey: string;
  accessToken: string;
  qrToken: string;
  businessId: string;
  eventId: string;
  eventVenueId: string;
  scannerDeviceId: string | null;
  scannerPin: string | null;
  scannerLocation: ScannerLocationPayload;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};

type ScanTimeoutParams = {
  timeoutMs: number;
  task: (signal: AbortSignal) => Promise<ScannerAttemptResult>;
};

type ScanTimeoutError = {
  kind: "timeout";
};

const knownScanStatuses = [
  "SUCCESS",
  "EVENT_CONTEXT_REQUIRED",
  "EVENT_CONTEXT_MISMATCH",
  "QR_ALREADY_USED_OR_REPLAYED",
  "ALREADY_STAMPED",
  "STAMP_CARD_FULL",
  "EVENT_NOT_FOUND",
  "INVALID_QR",
  "INVALID_QR_TYPE",
  "QR_EXPIRED",
  "VENUE_NOT_IN_EVENT",
  "EVENT_NOT_ACTIVE",
  "STUDENT_NOT_REGISTERED",
  "VENUE_JOINED_TOO_LATE",
  "BUSINESS_STAFF_NOT_ALLOWED",
  "SCANNER_DEVICE_NOT_ALLOWED",
  "SCANNER_DEVICE_REQUIRED",
  "SCANNER_PIN_REQUIRED",
  "SCANNER_PIN_INVALID",
  "SCANNER_PIN_LOCKED",
  "NOT_BUSINESS_STAFF",
  "BUSINESS_CONTEXT_REQUIRED",
  "RATE_LIMITED",
] as const satisfies readonly ScanQrResponse["status"][];

const scanResultTones: Record<ScanQrResponse["status"], ScannerAttemptResult["tone"]> = {
  SUCCESS: "success",
  EVENT_CONTEXT_REQUIRED: "warning",
  EVENT_CONTEXT_MISMATCH: "danger",
  QR_ALREADY_USED_OR_REPLAYED: "warning",
  ALREADY_STAMPED: "warning",
  STAMP_CARD_FULL: "warning",
  EVENT_NOT_FOUND: "neutral",
  INVALID_QR: "danger",
  INVALID_QR_TYPE: "danger",
  QR_EXPIRED: "warning",
  VENUE_NOT_IN_EVENT: "danger",
  EVENT_NOT_ACTIVE: "neutral",
  STUDENT_NOT_REGISTERED: "danger",
  VENUE_JOINED_TOO_LATE: "danger",
  BUSINESS_STAFF_NOT_ALLOWED: "danger",
  SCANNER_DEVICE_NOT_ALLOWED: "danger",
  SCANNER_DEVICE_REQUIRED: "danger",
  SCANNER_PIN_REQUIRED: "warning",
  SCANNER_PIN_INVALID: "danger",
  SCANNER_PIN_LOCKED: "danger",
  NOT_BUSINESS_STAFF: "danger",
  BUSINESS_CONTEXT_REQUIRED: "warning",
  RATE_LIMITED: "warning",
};

const mapScanResponse = (response: ScanQrResponse): ScannerAttemptResult => ({
  status: response.status,
  message: response.message,
  tone: scanResultTones[response.status],
  stampId: response.stampId,
  stampCount: response.stampCount,
  existingStampedAt: response.existingStampedAt,
});

const isKnownScanResponse = (value: unknown): value is ScanQrResponse => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.status === "string" &&
    typeof candidate.message === "string" &&
    knownScanStatuses.includes(candidate.status as ScanQrResponse["status"])
  );
};

const describeResponseBodyForError = (responseText: string): "empty body" | "non-JSON or unexpected body" =>
  responseText.length === 0 ? "empty body" : "non-JSON or unexpected body";

export const requestScanQrAsync = async ({
  supabaseUrl,
  publishableKey,
  accessToken,
  qrToken,
  businessId,
  eventId,
  eventVenueId,
  scannerDeviceId,
  scannerPin,
  scannerLocation,
  fetchImpl = fetch,
  signal,
}: ScanQrTransportParams): Promise<ScannerAttemptResult> => {
  const response = await fetchImpl(`${supabaseUrl}/functions/v1/scan-qr`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({
      qrToken,
      businessId,
      eventId,
      eventVenueId,
      scannerDeviceId,
      scannerPin,
      scannerLocation,
    }),
  });

  const responseText = await response.text();
  // Gateways and edge runtimes can return non-JSON bodies; never surface raw bodies to users.
  let responseBody: unknown = null;
  if (responseText.length > 0) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = null;
    }
  }

  if (!response.ok) {
    if (isKnownScanResponse(responseBody)) {
      return mapScanResponse(responseBody);
    }

    throw new Error(`Scan request failed with status ${response.status}: ${describeResponseBodyForError(responseText)}`);
  }

  if (!isKnownScanResponse(responseBody)) {
    throw new Error(
      `Scan request returned an invalid body with status ${response.status}: ${describeResponseBodyForError(responseText)}`
    );
  }

  return mapScanResponse(responseBody);
};

export const runScanWithTimeoutAsync = async ({
  timeoutMs,
  task,
}: ScanTimeoutParams): Promise<ScannerAttemptResult> => {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort("scan-timeout");
        reject({ kind: "timeout" } as ScanTimeoutError);
      }, timeoutMs);
    });

    return await Promise.race([task(controller.signal), timeoutPromise]);
  } catch (error) {
    // Hermes runtime'da `DOMException` her zaman global olarak tanimli degil; dogrudan
    // `error instanceof DOMException` kontrolu `ReferenceError: Property 'DOMException'
    // doesn't exist` atar ve scanner kilitli kalir. Once typeof ile guard ediyoruz,
    // ardindan abort/timeout sinyallerini ortak bir uretici uzerinden tanitiyoruz.
    const isAbortError =
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: unknown }).name === "AbortError";
    const isTimeoutError =
      typeof error === "object" &&
      error !== null &&
      "kind" in error &&
      (error as { kind?: unknown }).kind === "timeout";

    if (isAbortError || isTimeoutError) {
      return {
        status: "NETWORK_TIMEOUT",
        message: "Network is slow. Try again or use manual fallback.",
        tone: "warning",
      };
    }

    throw error;
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
};
