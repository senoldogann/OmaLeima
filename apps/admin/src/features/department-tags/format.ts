import type {
  DepartmentTagRecord,
  DepartmentTagSourceType,
  DepartmentTagStatus,
} from "@/features/department-tags/types";
import type { DashboardLocale } from "@/features/dashboard/i18n";

const departmentTagFormatter = new Intl.DateTimeFormat("en-FI", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const departmentTagSourceLabels: Record<DashboardLocale, Record<DepartmentTagSourceType, string>> = {
  en: {
    ADMIN: "Admin",
    CLUB: "Official club",
    USER: "User custom",
  },
  fi: {
    ADMIN: "Admin",
    CLUB: "Virallinen klubi",
    USER: "Kayttajan oma",
  },
};

const departmentTagStatusLabels: Record<DashboardLocale, Record<DepartmentTagStatus, string>> = {
  en: {
    ACTIVE: "Active",
    BLOCKED: "Blocked",
    MERGED: "Merged",
    PENDING_REVIEW: "Pending review",
  },
  fi: {
    ACTIVE: "Aktiivinen",
    BLOCKED: "Estetty",
    MERGED: "Yhdistetty",
    PENDING_REVIEW: "Odottaa tarkistusta",
  },
};

export const formatDepartmentTagDateTime = (value: string): string =>
  departmentTagFormatter.format(new Date(value));

export const formatDepartmentTagSource = (
  sourceType: DepartmentTagSourceType,
  locale: DashboardLocale
): string => departmentTagSourceLabels[locale][sourceType];

export const formatDepartmentTagStatus = (
  status: DepartmentTagStatus,
  locale: DashboardLocale
): string => departmentTagStatusLabels[locale][status];

export const formatDepartmentTagMeta = (
  tag: DepartmentTagRecord,
  locale: DashboardLocale
): string => {
  const parts = [
    formatDepartmentTagSource(tag.sourceType, locale),
    tag.sourceClubName,
    tag.universityName,
    tag.city,
  ].filter((value) => value !== null && value.length > 0);

  return parts.length > 0
    ? parts.join(" · ")
    : locale === "fi"
      ? "Ei lahde- tai kampusmetatietoja"
      : "No source or campus metadata";
};

export const formatDepartmentTagCreator = (
  tag: DepartmentTagRecord,
  locale: DashboardLocale
): string => {
  const creatorEmail = tag.createdByEmail ?? (locale === "fi" ? "Tuntematon luoja" : "Unknown creator");
  const linkLabel =
    locale === "fi"
      ? tag.profileLinkCount === 1
        ? "1 profiililinkki"
        : `${tag.profileLinkCount} profiililinkkia`
      : tag.profileLinkCount === 1
        ? "1 profile link"
        : `${tag.profileLinkCount} profile links`;

  return `${creatorEmail} · ${linkLabel}`;
};

export const formatDepartmentTagMergeTarget = (
  title: string,
  universityName: string | null,
  city: string | null
): string => {
  const parts = [title, universityName, city].filter((value) => value !== null && value.length > 0);

  return parts.join(" · ");
};

export const getDepartmentTagStatusClassName = (status: DepartmentTagStatus): string => {
  if (status === "BLOCKED") {
    return "status-pill status-pill-danger";
  }

  if (status === "PENDING_REVIEW") {
    return "status-pill status-pill-warning";
  }

  if (status === "ACTIVE") {
    return "status-pill status-pill-success";
  }

  return "status-pill";
};
