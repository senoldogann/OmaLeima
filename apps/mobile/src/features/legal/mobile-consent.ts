import type { AppLanguage } from "@/features/i18n/translations";
import { deviceStorage } from "@/lib/device-storage";

export type MobileLegalConsentRecord = {
  acceptedAt: string;
  language: AppLanguage;
  version: string;
};

export const mobileLegalConsentVersion = "2026-05-06-cookie-privacy-v1";

const mobileLegalConsentStoreKey = "omaleima-mobile-legal-consent";

const parseMobileLegalConsentRecord = (rawValue: string): MobileLegalConsentRecord | null => {
  const parsedValue: unknown = JSON.parse(rawValue);

  if (typeof parsedValue !== "object" || parsedValue === null) {
    return null;
  }

  const record = parsedValue as Record<string, unknown>;

  if (record.version !== mobileLegalConsentVersion) {
    return null;
  }

  if (record.language !== "fi" && record.language !== "en") {
    return null;
  }

  if (typeof record.acceptedAt !== "string" || record.acceptedAt.length === 0) {
    return null;
  }

  return {
    acceptedAt: record.acceptedAt,
    language: record.language,
    version: mobileLegalConsentVersion,
  };
};

export const readMobileLegalConsentAsync = async (): Promise<MobileLegalConsentRecord | null> => {
  const rawValue = await deviceStorage.getItemAsync(mobileLegalConsentStoreKey);

  if (rawValue === null) {
    return null;
  }

  return parseMobileLegalConsentRecord(rawValue);
};

export const writeMobileLegalConsentAsync = async (language: AppLanguage): Promise<MobileLegalConsentRecord> => {
  const record: MobileLegalConsentRecord = {
    acceptedAt: new Date().toISOString(),
    language,
    version: mobileLegalConsentVersion,
  };

  await deviceStorage.setItemAsync(mobileLegalConsentStoreKey, JSON.stringify(record));

  return record;
};
