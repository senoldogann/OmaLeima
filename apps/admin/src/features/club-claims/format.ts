import type { DashboardLocale } from "@/features/dashboard/i18n";
import type {
  ClubClaimCandidateRecord,
  ClubClaimEventRecord,
  ClubClaimProgressRecord,
  ClubRecentRewardClaimRecord,
} from "@/features/club-claims/types";

const rewardTypeLabelsByLocale: Record<DashboardLocale, Record<ClubClaimCandidateRecord["rewardType"], string>> = {
  en: {
    COUPON: "Coupon",
    ENTRY: "Entry",
    HAALARIMERKKI: "Haalarimerkki",
    OTHER: "Other",
    PATCH: "Patch",
    PRODUCT: "Product",
  },
  fi: {
    COUPON: "Kuponki",
    ENTRY: "Sisäänpääsy",
    HAALARIMERKKI: "Haalarimerkki",
    OTHER: "Muu",
    PATCH: "Merkki",
    PRODUCT: "Tuote",
  },
};

export const formatClubClaimDateTime = (locale: DashboardLocale, value: string): string =>
  new Intl.DateTimeFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export const formatClubClaimEventMeta = (locale: DashboardLocale, event: ClubClaimEventRecord): string =>
  `${event.clubName} · ${event.city} · ${formatClubClaimDateTime(locale, event.startAt)}`;

export const formatClubClaimRewardType = (
  locale: DashboardLocale,
  value: ClubClaimCandidateRecord["rewardType"]
): string => rewardTypeLabelsByLocale[locale][value];

type ClubClaimRewardProgressRecord = ClubClaimCandidateRecord | ClubClaimProgressRecord;

export const formatClubClaimInventory = (locale: DashboardLocale, candidate: ClubClaimRewardProgressRecord): string => {
  if (candidate.inventoryTotal === null) {
    return locale === "fi" ? "Rajaton varasto" : "Unlimited stock";
  }

  if (candidate.inventoryRemaining === null) {
    return locale === "fi"
      ? `Yhteensä ${candidate.inventoryTotal} kpl`
      : `${candidate.inventoryTotal} total stock`;
  }

  return locale === "fi"
    ? `${candidate.inventoryRemaining}/${candidate.inventoryTotal} jäljellä`
    : `${candidate.inventoryRemaining}/${candidate.inventoryTotal} left`;
};

export const formatClubClaimProgress = (locale: DashboardLocale, candidate: ClubClaimRewardProgressRecord): string =>
  locale === "fi"
    ? `${candidate.stampCount}/${candidate.requiredStampCount} leimaa`
    : `${candidate.stampCount}/${candidate.requiredStampCount} stamps`;

export const formatClubClaimHistoryMeta = (locale: DashboardLocale, claim: ClubRecentRewardClaimRecord): string =>
  `${claim.eventName} · ${formatClubClaimDateTime(locale, claim.claimedAt)}`;

export const getClubClaimStatusClassName = (status: ClubRecentRewardClaimRecord["status"]): string =>
  status === "CLAIMED" ? "status-pill status-pill-success" : "status-pill status-pill-warning";
