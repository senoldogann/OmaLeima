export type DepartmentTagSourceType = "USER" | "CLUB" | "ADMIN";

export type StudentProfileTag = {
  linkId: string;
  departmentTagId: string;
  title: string;
  slug: string;
  universityName: string | null;
  city: string | null;
  sourceType: DepartmentTagSourceType;
  isOfficial: boolean;
  isPrimary: boolean;
  slot: number;
};

export type DepartmentTagSuggestion = {
  id: string;
  title: string;
  slug: string;
  universityName: string | null;
  city: string | null;
  sourceType: DepartmentTagSourceType;
  isOfficial: boolean;
};

export type StudentProfileOverview = {
  studentId: string;
  email: string;
  displayName: string | null;
  primaryRole: "STUDENT";
  status: "ACTIVE";
  selectedTags: StudentProfileTag[];
  suggestedTags: DepartmentTagSuggestion[];
  selectedTagCount: number;
  remainingTagSlots: number;
};

export type AttachDepartmentTagResult = {
  status: "ADDED" | "ALREADY_SELECTED";
  departmentTagId: string;
};

export type CreateCustomDepartmentTagResult = {
  status: "CREATED_AND_ADDED" | "ATTACHED_EXISTING" | "ALREADY_SELECTED";
  departmentTagId: string;
};
