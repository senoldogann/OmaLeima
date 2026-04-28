import type { ClubDepartmentTagCreatePayload } from "@/features/club-department-tags/types";

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
