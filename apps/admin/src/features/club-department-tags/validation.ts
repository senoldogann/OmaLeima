import type {
  ClubDepartmentTagCreatePayload,
  ClubDepartmentTagDeletePayload,
  ClubDepartmentTagUpdatePayload,
} from "@/features/club-department-tags/types";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ClubDepartmentTagValidationError extends Error {}

const isUuid = (value: string): boolean => uuidPattern.test(value);

export const parseClubDepartmentTagCreatePayloadOrThrow = (
  body: Partial<ClubDepartmentTagCreatePayload>
): ClubDepartmentTagCreatePayload => {
  if (typeof body.clubId !== "string" || !isUuid(body.clubId)) {
    throw new ClubDepartmentTagValidationError("clubId must be a valid UUID.");
  }

  if (typeof body.title !== "string") {
    throw new ClubDepartmentTagValidationError("department tag create payload is incomplete.");
  }

  if (body.title.trim().length === 0) {
    throw new ClubDepartmentTagValidationError("title is required.");
  }

  return {
    clubId: body.clubId,
    title: body.title,
  };
};

export const parseClubDepartmentTagUpdatePayloadOrThrow = (
  body: Partial<ClubDepartmentTagUpdatePayload>
): ClubDepartmentTagUpdatePayload => {
  if (typeof body.departmentTagId !== "string" || !isUuid(body.departmentTagId)) {
    throw new ClubDepartmentTagValidationError("departmentTagId must be a valid UUID.");
  }

  if (typeof body.title !== "string") {
    throw new ClubDepartmentTagValidationError("department tag update payload is incomplete.");
  }

  if (body.title.trim().length === 0) {
    throw new ClubDepartmentTagValidationError("title is required.");
  }

  return {
    departmentTagId: body.departmentTagId,
    title: body.title,
  };
};

export const parseClubDepartmentTagDeletePayloadOrThrow = (
  body: Partial<ClubDepartmentTagDeletePayload>
): ClubDepartmentTagDeletePayload => {
  if (typeof body.departmentTagId !== "string" || !isUuid(body.departmentTagId)) {
    throw new ClubDepartmentTagValidationError("departmentTagId must be a valid UUID.");
  }

  return {
    departmentTagId: body.departmentTagId,
  };
};
