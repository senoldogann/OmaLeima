import type {
  ClubOfficialDepartmentTagRecord,
  ManageableDepartmentTagClub,
} from "@/features/club-department-tags/types";

const formatLocation = (city: string | null, universityName: string | null): string => {
  if (city !== null && universityName !== null) {
    return `${city} · ${universityName}`;
  }

  if (city !== null) {
    return city;
  }

  if (universityName !== null) {
    return universityName;
  }

  return "Metadata missing";
};

export const formatManageableDepartmentTagClubMeta = (club: ManageableDepartmentTagClub): string =>
  `${formatLocation(club.city, club.universityName)} · ${club.membershipRole}`;

export const formatOfficialDepartmentTagMeta = (tag: ClubOfficialDepartmentTagRecord): string =>
  `${tag.clubName} · ${formatLocation(tag.city, tag.universityName)}`;
