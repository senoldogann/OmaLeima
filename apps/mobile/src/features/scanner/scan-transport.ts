import type { ScanQrResponse, ScannerAttemptResult } from "@/features/scanner/types";

type ScanQrTransportParams = {
  supabaseUrl: string;
  accessToken: string;
  qrToken: string;
  businessId: string;
  scannerDeviceId: string | null;
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

const scanResultTones: Record<ScanQrResponse["status"], ScannerAttemptResult["tone"]> = {
  SUCCESS: "success",
  QR_ALREADY_USED_OR_REPLAYED: "warning",
  ALREADY_STAMPED: "warning",
  INVALID_QR: "danger",
  QR_EXPIRED: "warning",
  VENUE_NOT_IN_EVENT: "danger",
  EVENT_NOT_ACTIVE: "neutral",
  STUDENT_NOT_REGISTERED: "danger",
  VENUE_JOINED_TOO_LATE: "danger",
  BUSINESS_STAFF_NOT_ALLOWED: "danger",
};

const mapScanResponse = (response: ScanQrResponse): ScannerAttemptResult => ({
  status: response.status,
  message: response.message,
  tone: scanResultTones[response.status] ?? "neutral",
  stampId: response.stampId,
  stampCount: response.stampCount,
});

export const requestScanQrAsync = async ({
  supabaseUrl,
  accessToken,
  qrToken,
  businessId,
  scannerDeviceId,
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
      scannerLocation: {
        latitude: null,
        longitude: null,
      },
    }),
  });

  const responseText = await response.text();
  const responseBody = responseText.length === 0 ? null : JSON.parse(responseText);

  if (!response.ok) {
    if (
      responseBody !== null &&
      typeof responseBody === "object" &&
      !Array.isArray(responseBody) &&
      typeof responseBody.status === "string" &&
      typeof responseBody.message === "string"
    ) {
      return mapScanResponse(responseBody as ScanQrResponse);
    }

    throw new Error(
      `Scan request failed with status ${response.status}: ${responseText.length === 0 ? "empty body" : responseText}`
    );
  }

  if (
    responseBody === null ||
    typeof responseBody !== "object" ||
    Array.isArray(responseBody) ||
    typeof responseBody.status !== "string" ||
    typeof responseBody.message !== "string"
  ) {
    throw new Error(
      `Scan request returned an invalid body with status ${response.status}: ${responseText.length === 0 ? "empty body" : responseText}`
    );
  }

  return mapScanResponse(responseBody as ScanQrResponse);
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
