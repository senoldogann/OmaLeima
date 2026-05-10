export type ManageableDepartmentTagClub = {
  city: string | null;
  clubId: string;
  clubName: string;
  existingOfficialTagCount: number;
  membershipRole: "ORGANIZER" | "OWNER";
  universityName: string | null;
};

export type ClubOfficialDepartmentTagRecord = {
  city: string | null;
  clubId: string;
  clubName: string;
  createdAt: string;
  departmentTagId: string;
  slug: string;
  title: string;
  universityName: string | null;
};

export type ClubDepartmentTagsSummary = {
  manageableClubCount: number;
  totalOfficialTagCount: number;
  visibleOfficialTagCount: number;
  visibleTagLimit: number;
};

export type ClubDepartmentTagsSnapshot = {
  clubs: ManageableDepartmentTagClub[];
  officialTags: ClubOfficialDepartmentTagRecord[];
  summary: ClubDepartmentTagsSummary;
};

export type ClubDepartmentTagCreatePayload = {
  clubId: string;
  title: string;
};

export type ClubDepartmentTagUpdatePayload = {
  departmentTagId: string;
  title: string;
};

export type ClubDepartmentTagDeletePayload = {
  departmentTagId: string;
};

export type ClubDepartmentTagMutationResponse = {
  message: string;
  status: string | null;
};

export type ClubDepartmentTagActionState = {
  code: string | null;
  message: string | null;
  tone: "error" | "idle" | "success";
};
