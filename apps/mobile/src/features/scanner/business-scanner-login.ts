import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import * as QRCode from "qrcode";

import { supabase } from "@/lib/supabase";

import {
  createScannerDeviceLabel,
  getScannerDevicePlatform,
  getScannerInstallationIdAsync,
} from "@/features/scanner/scanner-device";
import type { ScannerDevicePlatform } from "@/features/scanner/types";

export type BusinessScannerLoginQr = {
  businessId: string;
  businessName: string;
  expiresAt: string;
  qrPayload: {
    token: string;
    type: "LEIMA_BUSINESS_SCANNER_LOGIN_QR";
    v: 1;
  };
  refreshAfterSeconds: number;
};

export type ProvisionBusinessScannerSessionResult = {
  businessId: string;
  homeHref: "/business/scanner";
  label: string;
  pinRequired: boolean;
  platform: ScannerDevicePlatform;
  scannerDeviceId: string;
  status: "SUCCESS";
};

type ProvisionBusinessScannerSessionParams = {
  businessName: string | null;
  qrToken: string;
};

type UseBusinessScannerLoginQrQueryParams = {
  businessId: string;
  isEnabled: boolean;
};

const minimumQrRefetchIntervalMs = 1_000;
const scannerLoginQrDarkColor = "#111827";

export const businessScannerLoginQrQueryKey = (businessId: string) =>
  ["business-scanner-login-qr", businessId] as const;

export const businessScannerLoginQrSvgQueryKey = (token: string) =>
  ["business-scanner-login-qr-svg", token] as const;

const isBusinessScannerLoginQr = (value: unknown): value is BusinessScannerLoginQr => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const qrPayload = candidate.qrPayload;

  if (typeof qrPayload !== "object" || qrPayload === null || Array.isArray(qrPayload)) {
    return false;
  }

  const payload = qrPayload as Record<string, unknown>;

  return (
    typeof candidate.businessId === "string" &&
    typeof candidate.businessName === "string" &&
    typeof candidate.expiresAt === "string" &&
    typeof candidate.refreshAfterSeconds === "number" &&
    payload.v === 1 &&
    payload.type === "LEIMA_BUSINESS_SCANNER_LOGIN_QR" &&
    typeof payload.token === "string"
  );
};

const isProvisionBusinessScannerSessionResult = (value: unknown): value is ProvisionBusinessScannerSessionResult => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.status === "SUCCESS" &&
    typeof candidate.businessId === "string" &&
    candidate.homeHref === "/business/scanner" &&
    typeof candidate.label === "string" &&
    typeof candidate.pinRequired === "boolean" &&
    typeof candidate.platform === "string" &&
    typeof candidate.scannerDeviceId === "string"
  );
};

const createBusinessScannerLoginQrSvgAsync = async (token: string): Promise<string> =>
  QRCode.toString(token, {
    color: {
      dark: scannerLoginQrDarkColor,
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
    margin: 1,
    type: "svg",
    width: 240,
  });

const fetchBusinessScannerLoginQrAsync = async (businessId: string): Promise<BusinessScannerLoginQr> => {
  const { data, error } = await supabase.functions.invoke("generate-business-scanner-login-qr", {
    body: {
      businessId,
    },
  });

  if (error !== null) {
    throw new Error(`Failed to generate scanner login QR for business ${businessId}: ${error.message}`);
  }

  if (!isBusinessScannerLoginQr(data)) {
    throw new Error(`Scanner login QR function returned an invalid response for business ${businessId}.`);
  }

  return data;
};

export const provisionBusinessScannerSessionAsync = async ({
  businessName,
  qrToken,
}: ProvisionBusinessScannerSessionParams): Promise<ProvisionBusinessScannerSessionResult> => {
  const installationId = await getScannerInstallationIdAsync();
  const platform = getScannerDevicePlatform();
  const label = createScannerDeviceLabel(businessName ?? "OmaLeima", platform);
  const { data, error } = await supabase.functions.invoke("provision-business-scanner-session", {
    body: {
      installationId,
      label,
      platform,
      qrToken,
    },
  });

  if (error !== null) {
    throw new Error(`Failed to provision scanner session: ${error.message}`);
  }

  if (!isProvisionBusinessScannerSessionResult(data)) {
    throw new Error("Scanner provisioning returned an invalid response.");
  }

  return data;
};

export const useBusinessScannerLoginQrQuery = ({
  businessId,
  isEnabled,
}: UseBusinessScannerLoginQrQueryParams): UseQueryResult<BusinessScannerLoginQr, Error> =>
  useQuery({
    enabled: isEnabled,
    queryFn: async () => fetchBusinessScannerLoginQrAsync(businessId),
    queryKey: businessScannerLoginQrQueryKey(businessId),
    refetchInterval: (query) => {
      const result = query.state.data;

      if (!isEnabled || typeof result === "undefined") {
        return false;
      }

      const expiresAtMs = new Date(result.expiresAt).getTime();
      const remainingMs = expiresAtMs - Date.now();

      return Math.max(remainingMs - 4_000, minimumQrRefetchIntervalMs);
    },
    refetchOnMount: "always",
    refetchOnReconnect: "always",
  });

export const useBusinessScannerLoginQrSvgQuery = ({
  isEnabled,
  token,
}: {
  isEnabled: boolean;
  token: string;
}): UseQueryResult<string, Error> =>
  useQuery({
    enabled: isEnabled && token.length > 0,
    queryFn: async () => createBusinessScannerLoginQrSvgAsync(token),
    queryKey: businessScannerLoginQrSvgQueryKey(token),
    staleTime: Number.POSITIVE_INFINITY,
  });
