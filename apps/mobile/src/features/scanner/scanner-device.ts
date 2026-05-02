import * as SecureStore from "expo-secure-store";

import { supabase } from "@/lib/supabase";

import type { ScannerDevicePlatform, ScannerDeviceRegistration } from "@/features/scanner/types";

const scannerInstallationKey = "omaleima-scanner-installation-id-v1";
const expoRuntimeOs = process.env.EXPO_OS;

type RegisterScannerDeviceRpcResponse =
  | {
      status: "SUCCESS";
      scannerDeviceId: string;
      label: string;
      platform: ScannerDevicePlatform;
    }
  | {
      status: "ACTOR_NOT_ALLOWED";
    };

type RegisterBusinessScannerDeviceParams = {
  businessId: string;
  businessName: string;
};

const isBrowserStorageAvailable = (): boolean =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const createFallbackInstallationId = (): string => {
  const randomParts = Array.from({ length: 4 }, (): string =>
    Math.floor(Math.random() * 36 ** 6)
      .toString(36)
      .padStart(6, "0")
  );

  return `scanner-${Date.now().toString(36)}-${randomParts.join("-")}`;
};

const createInstallationId = (): string => {
  const randomUuid = globalThis.crypto?.randomUUID;

  if (typeof randomUuid === "function") {
    return randomUuid.call(globalThis.crypto);
  }

  return createFallbackInstallationId();
};

const readStoredInstallationIdAsync = async (): Promise<string | null> => {
  if (expoRuntimeOs === "web") {
    if (!isBrowserStorageAvailable()) {
      return null;
    }

    return window.localStorage.getItem(scannerInstallationKey);
  }

  return SecureStore.getItemAsync(scannerInstallationKey);
};

const writeStoredInstallationIdAsync = async (installationId: string): Promise<void> => {
  if (expoRuntimeOs === "web") {
    if (!isBrowserStorageAvailable()) {
      return;
    }

    window.localStorage.setItem(scannerInstallationKey, installationId);
    return;
  }

  await SecureStore.setItemAsync(scannerInstallationKey, installationId);
};

const getScannerInstallationIdAsync = async (): Promise<string> => {
  const storedInstallationId = await readStoredInstallationIdAsync();

  if (storedInstallationId !== null && storedInstallationId.length > 0) {
    return storedInstallationId;
  }

  const installationId = createInstallationId();
  await writeStoredInstallationIdAsync(installationId);

  return installationId;
};

const getScannerDevicePlatform = (): ScannerDevicePlatform => {
  if (expoRuntimeOs === "ios") {
    return "IOS";
  }

  if (expoRuntimeOs === "android") {
    return "ANDROID";
  }

  if (expoRuntimeOs === "web") {
    return "WEB";
  }

  return "UNKNOWN";
};

const createScannerDeviceLabel = (businessName: string, platform: ScannerDevicePlatform): string => {
  const platformLabel: Record<ScannerDevicePlatform, string> = {
    IOS: "iPhone",
    ANDROID: "Android",
    WEB: "Web",
    UNKNOWN: "Scanner",
  };

  return `${businessName} ${platformLabel[platform]} scanner`;
};

const isRegisterScannerDeviceRpcResponse = (value: unknown): value is RegisterScannerDeviceRpcResponse => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.status === "ACTOR_NOT_ALLOWED") {
    return true;
  }

  return (
    candidate.status === "SUCCESS" &&
    typeof candidate.scannerDeviceId === "string" &&
    typeof candidate.label === "string" &&
    (candidate.platform === "IOS" ||
      candidate.platform === "ANDROID" ||
      candidate.platform === "WEB" ||
      candidate.platform === "UNKNOWN")
  );
};

export const registerBusinessScannerDeviceAsync = async ({
  businessId,
  businessName,
}: RegisterBusinessScannerDeviceParams): Promise<ScannerDeviceRegistration> => {
  const installationId = await getScannerInstallationIdAsync();
  const platform = getScannerDevicePlatform();
  const label = createScannerDeviceLabel(businessName, platform);
  const { data, error } = await supabase.rpc("register_business_scanner_device", {
    p_business_id: businessId,
    p_installation_id: installationId,
    p_label: label,
    p_platform: platform,
  });

  if (error !== null) {
    throw new Error(`Failed to register scanner device for business ${businessId}: ${error.message}`);
  }

  if (!isRegisterScannerDeviceRpcResponse(data)) {
    throw new Error(`Scanner device registration returned an invalid response for business ${businessId}.`);
  }

  if (data.status === "ACTOR_NOT_ALLOWED") {
    throw new Error(`Current user is not allowed to register a scanner device for business ${businessId}.`);
  }

  return {
    scannerDeviceId: data.scannerDeviceId,
    label: data.label,
    platform: data.platform,
  };
};
