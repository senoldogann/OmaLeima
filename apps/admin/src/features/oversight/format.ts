import type { DashboardLocale } from "@/features/dashboard/i18n";

const joinTruthyValues = (values: Array<string | null>): string =>
  values.filter((value): value is string => value !== null && value.length > 0).join(" · ");

const createMetadataSummary = (metadata: Record<string, unknown>): string | null => {
  const summaryEntries = Object.entries(metadata)
    .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
    .slice(0, 2)
    .map(([key, value]) => `${key}=${String(value)}`);

  return summaryEntries.length === 0 ? null : summaryEntries.join(" · ");
};

export const formatOversightDateTime = (locale: DashboardLocale, value: string): string =>
  new Intl.DateTimeFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export const formatOversightClubMeta = (city: string | null, universityName: string | null): string =>
  joinTruthyValues([city, universityName]);

export const formatOversightEventMeta = (clubName: string | null, city: string, visibility: string): string =>
  joinTruthyValues([clubName, city, visibility]);

export const formatOversightAuditMeta = (metadata: Record<string, unknown>): string | null => createMetadataSummary(metadata);

export const formatOversightFraudMeta = (metadata: Record<string, unknown>): string | null => createMetadataSummary(metadata);
