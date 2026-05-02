import type {
  ScanQrResponse,
  ScannerAttemptResult,
  ScannerLocationPayload,
} from "@/features/scanner/types";

type ScanQrTransportParams = {
  supabaseUrl: string;
  accessToken: string;
  qrToken: string;
  businessId: string;
  scannerDeviceId: string | null;
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
  "QR_ALREADY_USED_OR_REPLAYED",
  "ALREADY_STAMPED",
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
  "NOT_BUSINESS_STAFF",
  "BUSINESS_CONTEXT_REQUIRED",
] as const satisfies readonly ScanQrResponse["status"][];

const scanResultTones: Record<ScanQrResponse["status"], ScannerAttemptResult["tone"]> = {
  SUCCESS: "success",
  QR_ALREADY_USED_OR_REPLAYED: "warning",
  ALREADY_STAMPED: "warning",
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
  NOT_BUSINESS_STAFF: "danger",
  BUSINESS_CONTEXT_REQUIRED: "warning",
};

const mapScanResponse = (response: ScanQrResponse): ScannerAttemptResult => ({
  status: response.status,
  message: response.message,
  tone: scanResultTones[response.status],
  stampId: response.stampId,
  stampCount: response.stampCount,
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

export const requestScanQrAsync = async ({
  supabaseUrl,
  accessToken,
  qrToken,
  businessId,
  scannerDeviceId,
  scannerLocation,
  fetchImpl = fetch,
  signal,
}: ScanQrTransportParams): Promise<ScannerAttemptResult> => {
  const response = await fetchImpl(`${supabaseUrl}/functions/v1/scan-qr`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({
      qrToken,
      businessId,
      scannerDeviceId,
      scannerLocation,
    }),
  });

  const responseText = await response.text();
  const responseBody = responseText.length === 0 ? null : JSON.parse(responseText);

  if (!response.ok) {
    if (isKnownScanResponse(responseBody)) {
      return mapScanResponse(responseBody);
    }

    throw new Error(
      `Scan request failed with status ${response.status}: ${responseText.length === 0 ? "empty body" : responseText}`
    );
  }

  if (!isKnownScanResponse(responseBody)) {
    throw new Error(
      `Scan request returned an invalid body with status ${response.status}: ${responseText.length === 0 ? "empty body" : responseText}`
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
    if (
      (error instanceof DOMException && error.name === "AbortError") ||
      (typeof error === "object" && error !== null && "kind" in error && error.kind === "timeout")
    ) {
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
