import type {
  DepartmentTagRecord,
  DepartmentTagSourceType,
  DepartmentTagStatus,
} from "@/features/department-tags/types";

const departmentTagFormatter = new Intl.DateTimeFormat("en-FI", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const departmentTagSourceLabels: Record<DepartmentTagSourceType, string> = {
  ADMIN: "Admin",
  CLUB: "Official club",
  USER: "User custom",
};

const departmentTagStatusLabels: Record<DepartmentTagStatus, string> = {
  ACTIVE: "Active",
  BLOCKED: "Blocked",
  MERGED: "Merged",
  PENDING_REVIEW: "Pending review",
};

export const formatDepartmentTagDateTime = (value: string): string =>
  departmentTagFormatter.format(new Date(value));

export const formatDepartmentTagSource = (sourceType: DepartmentTagSourceType): string =>
  departmentTagSourceLabels[sourceType];

export const formatDepartmentTagStatus = (status: DepartmentTagStatus): string =>
  departmentTagStatusLabels[status];

export const formatDepartmentTagMeta = (tag: DepartmentTagRecord): string => {
  const parts = [
    formatDepartmentTagSource(tag.sourceType),
    tag.sourceClubName,
    tag.universityName,
    tag.city,
  ].filter((value) => value !== null && value.length > 0);

  return parts.length > 0 ? parts.join(" · ") : "No source or campus metadata";
};

export const formatDepartmentTagCreator = (tag: DepartmentTagRecord): string => {
  const creatorEmail = tag.createdByEmail ?? "Unknown creator";
  const linkLabel =
    tag.profileLinkCount === 1 ? "1 profile link" : `${tag.profileLinkCount} profile links`;

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
