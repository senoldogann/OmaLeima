import * as SecureStore from "expo-secure-store";
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";

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
      status: "DEVICE_REVOKED";
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

type BusinessScannerDeviceRow = {
  id: string;
  business_id: string;
  label: string;
  platform: ScannerDevicePlatform;
  status: "ACTIVE" | "REVOKED";
  created_by: string;
  first_seen_at: string;
  last_seen_at: string;
  updated_at: string;
};

type RenameScannerDeviceRpcResponse =
  | {
      status: "SUCCESS";
      scannerDeviceId: string;
      label: string;
    }
  | {
      status: "ACTOR_NOT_ALLOWED" | "DEVICE_NOT_FOUND";
    };

type RevokeScannerDeviceRpcResponse =
  | {
      status: "SUCCESS";
      scannerDeviceId: string;
      statusValue: "REVOKED";
    }
  | {
      status: "ACTOR_NOT_ALLOWED" | "DEVICE_NOT_FOUND";
    };

export type BusinessScannerDeviceSummary = {
  id: string;
  businessId: string;
  label: string;
  platform: ScannerDevicePlatform;
  status: "ACTIVE" | "REVOKED";
  createdBy: string;
  firstSeenAt: string;
  lastSeenAt: string;
  updatedAt: string;
};

export type RenameBusinessScannerDeviceParams = {
  businessId: string;
  scannerDeviceId: string;
  label: string;
};

export type RevokeBusinessScannerDeviceParams = {
  businessId: string;
  scannerDeviceId: string;
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
    (candidate.status === "SUCCESS" || candidate.status === "DEVICE_REVOKED") &&
    typeof candidate.scannerDeviceId === "string" &&
    typeof candidate.label === "string" &&
    (candidate.platform === "IOS" ||
      candidate.platform === "ANDROID" ||
      candidate.platform === "WEB" ||
      candidate.platform === "UNKNOWN")
  );
};

const isRenameScannerDeviceRpcResponse = (value: unknown): value is RenameScannerDeviceRpcResponse => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.status === "ACTOR_NOT_ALLOWED" || candidate.status === "DEVICE_NOT_FOUND") {
    return true;
  }

  return (
    candidate.status === "SUCCESS" &&
    typeof candidate.scannerDeviceId === "string" &&
    typeof candidate.label === "string"
  );
};

const isRevokeScannerDeviceRpcResponse = (value: unknown): value is RevokeScannerDeviceRpcResponse => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.status === "ACTOR_NOT_ALLOWED" || candidate.status === "DEVICE_NOT_FOUND") {
    return true;
  }

  return (
    candidate.status === "SUCCESS" &&
    typeof candidate.scannerDeviceId === "string" &&
    candidate.statusValue === "REVOKED"
  );
};

const mapBusinessScannerDeviceRow = (row: BusinessScannerDeviceRow): BusinessScannerDeviceSummary => ({
  id: row.id,
  businessId: row.business_id,
  label: row.label,
  platform: row.platform,
  status: row.status,
  createdBy: row.created_by,
  firstSeenAt: row.first_seen_at,
  lastSeenAt: row.last_seen_at,
  updatedAt: row.updated_at,
});

export const businessScannerDevicesQueryKey = (businessId: string) =>
  ["business-scanner-devices", businessId] as const;

const fetchBusinessScannerDevicesAsync = async (businessId: string): Promise<BusinessScannerDeviceSummary[]> => {
  const { data, error } = await supabase
    .from("business_scanner_devices")
    .select("id,business_id,label,platform,status,created_by,first_seen_at,last_seen_at,updated_at")
    .eq("business_id", businessId)
    .order("status", { ascending: true })
    .order("last_seen_at", { ascending: false })
    .returns<BusinessScannerDeviceRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load scanner devices for business ${businessId}: ${error.message}`);
  }

  return data.map(mapBusinessScannerDeviceRow);
};

const renameBusinessScannerDeviceAsync = async ({
  scannerDeviceId,
  label,
}: RenameBusinessScannerDeviceParams): Promise<void> => {
  const { data, error } = await supabase.rpc("rename_business_scanner_device", {
    p_scanner_device_id: scannerDeviceId,
    p_label: label,
  });

  if (error !== null) {
    throw new Error(`Failed to rename scanner device ${scannerDeviceId}: ${error.message}`);
  }

  if (!isRenameScannerDeviceRpcResponse(data)) {
    throw new Error(`Rename scanner device returned an invalid response for ${scannerDeviceId}.`);
  }

  if (data.status !== "SUCCESS") {
    throw new Error(`Rename scanner device ${scannerDeviceId} failed with status ${data.status}.`);
  }
};

const revokeBusinessScannerDeviceAsync = async ({
  scannerDeviceId,
}: RevokeBusinessScannerDeviceParams): Promise<void> => {
  const { data, error } = await supabase.rpc("revoke_business_scanner_device", {
    p_scanner_device_id: scannerDeviceId,
  });

  if (error !== null) {
    throw new Error(`Failed to revoke scanner device ${scannerDeviceId}: ${error.message}`);
  }

  if (!isRevokeScannerDeviceRpcResponse(data)) {
    throw new Error(`Revoke scanner device returned an invalid response for ${scannerDeviceId}.`);
  }

  if (data.status !== "SUCCESS") {
    throw new Error(`Revoke scanner device ${scannerDeviceId} failed with status ${data.status}.`);
  }
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

  if (data.status === "DEVICE_REVOKED") {
    throw new Error(`Scanner device ${data.label} was revoked for business ${businessId}.`);
  }

  return {
    scannerDeviceId: data.scannerDeviceId,
    label: data.label,
    platform: data.platform,
  };
};

export const useBusinessScannerDevicesQuery = ({
  businessId,
  isEnabled,
}: {
  businessId: string;
  isEnabled: boolean;
}): UseQueryResult<BusinessScannerDeviceSummary[], Error> =>
  useQuery({
    enabled: isEnabled,
    queryFn: async () => fetchBusinessScannerDevicesAsync(businessId),
    queryKey: businessScannerDevicesQueryKey(businessId),
  });

export const useRenameBusinessScannerDeviceMutation = (): UseMutationResult<
  void,
  Error,
  RenameBusinessScannerDeviceParams
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params) => renameBusinessScannerDeviceAsync(params),
    onSuccess: async (_, params) => {
      await queryClient.invalidateQueries({
        queryKey: businessScannerDevicesQueryKey(params.businessId),
      });
    },
  });
};

export const useRevokeBusinessScannerDeviceMutation = (): UseMutationResult<
  void,
  Error,
  RevokeBusinessScannerDeviceParams
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params) => revokeBusinessScannerDeviceAsync(params),
    onSuccess: async (_, params) => {
      await queryClient.invalidateQueries({
        queryKey: businessScannerDevicesQueryKey(params.businessId),
      });
    },
  });
};
