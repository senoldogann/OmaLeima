import { supabase } from "@/lib/supabase";
import { publicEnv } from "@/lib/env";

import { requestScanQrAsync, runScanWithTimeoutAsync } from "@/features/scanner/scan-transport";
import type { ScannerAttemptResult, ScannerLocationPayload } from "@/features/scanner/types";

type ScanQrRequestParams = {
  qrToken: string;
  businessId: string;
  scannerDeviceId: string | null;
  scannerLocation: ScannerLocationPayload;
};

export const invokeScanQrAsync = async ({
  qrToken,
  businessId,
  scannerDeviceId,
  scannerLocation,
}: ScanQrRequestParams, signal: AbortSignal): Promise<ScannerAttemptResult> => {
  const sessionResult = await supabase.auth.getSession();

  if (sessionResult.error !== null) {
    throw new Error(`Failed to read session before scan request: ${sessionResult.error.message}`);
  }

  const accessToken = sessionResult.data.session?.access_token;

  if (typeof accessToken !== "string") {
    throw new Error("Missing authenticated access token for scanner request.");
  }

  return requestScanQrAsync({
    supabaseUrl: publicEnv.EXPO_PUBLIC_SUPABASE_URL,
    accessToken,
    qrToken,
    businessId,
    scannerDeviceId,
    scannerLocation,
    signal,
  });
};

export const scanQrWithTimeoutAsync = async (
  params: ScanQrRequestParams,
  timeoutMs: number
): Promise<ScannerAttemptResult> => {
  return runScanWithTimeoutAsync({
    timeoutMs,
    task: async (signal) => invokeScanQrAsync(params, signal),
  });
};
