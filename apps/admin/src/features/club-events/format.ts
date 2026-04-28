import type { ClubEventRecord, ClubMembershipRole } from "@/features/club-events/types";

const clubEventDateFormatter = new Intl.DateTimeFormat("en-FI", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const clubRoleLabels: Record<ClubMembershipRole, string> = {
  ORGANIZER: "Organizer",
  OWNER: "Owner",
  STAFF: "Staff",
};

export const formatClubEventDateTime = (value: string): string =>
  clubEventDateFormatter.format(new Date(value));

export const formatClubMembershipRole = (role: ClubMembershipRole): string => clubRoleLabels[role];

export const formatClubEventMeta = (event: ClubEventRecord): string =>
  [event.clubName, event.city, event.visibility].join(" · ");

export const getClubEventStatusClassName = (status: ClubEventRecord["status"]): string => {
  if (status === "ACTIVE" || status === "PUBLISHED") {
    return "status-pill status-pill-success";
  }

  if (status === "DRAFT") {
    return "status-pill status-pill-warning";
  }

  if (status === "CANCELLED") {
    return "status-pill status-pill-danger";
  }

  return "status-pill";
};
