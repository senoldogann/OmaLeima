import type { ClubRewardClaimConfirmPayload } from "@/features/club-claims/types";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ClubRewardClaimValidationError extends Error {}

const isUuid = (value: string): boolean => uuidPattern.test(value);

export const parseRewardClaimConfirmPayloadOrThrow = (
  body: Partial<ClubRewardClaimConfirmPayload>
): ClubRewardClaimConfirmPayload => {
  if (
    typeof body.eventId !== "string" ||
    typeof body.rewardTierId !== "string" ||
    typeof body.studentId !== "string" ||
    typeof body.notes !== "string"
  ) {
    throw new ClubRewardClaimValidationError("reward claim confirmation payload is incomplete.");
  }

  if (!isUuid(body.eventId)) {
    throw new ClubRewardClaimValidationError("eventId must be a valid UUID.");
  }

  if (!isUuid(body.rewardTierId)) {
    throw new ClubRewardClaimValidationError("rewardTierId must be a valid UUID.");
  }

  if (!isUuid(body.studentId)) {
    throw new ClubRewardClaimValidationError("studentId must be a valid UUID.");
  }

  return {
    eventId: body.eventId,
    notes: body.notes,
    rewardTierId: body.rewardTierId,
    studentId: body.studentId,
  };
};
