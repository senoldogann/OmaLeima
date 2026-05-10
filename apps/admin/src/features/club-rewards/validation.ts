import type {
  ClubRewardTierCreatePayload,
  ClubRewardTierUpdatePayload,
  RewardTierStatus,
  RewardTierType,
} from "@/features/club-rewards/types";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const integerPattern = /^\d+$/;
const rewardTypes = new Set<RewardTierType>([
  "HAALARIMERKKI",
  "PATCH",
  "COUPON",
  "PRODUCT",
  "ENTRY",
  "OTHER",
]);
const rewardStatuses = new Set<RewardTierStatus>(["ACTIVE", "DISABLED"]);

export class ClubRewardValidationError extends Error {}

export const isUuid = (value: string): boolean => uuidPattern.test(value);

export const parseRewardTierIdOrThrow = (value: unknown): string => {
  if (typeof value !== "string" || !isUuid(value)) {
    throw new ClubRewardValidationError("rewardTierId must be a valid UUID.");
  }

  return value;
};

const parseInventoryTotalOrThrow = (value: string): number | null => {
  if (value.trim().length === 0) {
    return null;
  }

  if (!integerPattern.test(value.trim())) {
    throw new ClubRewardValidationError("inventoryTotal must be a valid integer.");
  }

  return Number.parseInt(value, 10);
};

const parseRequiredStampCountOrThrow = (value: string): number => {
  if (!integerPattern.test(value.trim())) {
    throw new ClubRewardValidationError("requiredStampCount must be a valid integer.");
  }

  return Number.parseInt(value, 10);
};

const assertRewardTypeOrThrow = (value: string): RewardTierType => {
  if (!rewardTypes.has(value as RewardTierType)) {
    throw new ClubRewardValidationError("rewardType must be a valid reward tier type.");
  }

  return value as RewardTierType;
};

const assertRewardStatusOrThrow = (value: string): RewardTierStatus => {
  if (!rewardStatuses.has(value as RewardTierStatus)) {
    throw new ClubRewardValidationError("status must be ACTIVE or DISABLED.");
  }

  return value as RewardTierStatus;
};

export const parseRewardTierCreatePayloadOrThrow = (
  body: Partial<ClubRewardTierCreatePayload>
): ClubRewardTierCreatePayload & {
  inventoryTotalValue: number | null;
  requiredStampCountValue: number;
} => {
  if (typeof body.eventId !== "string" || !isUuid(body.eventId)) {
    throw new ClubRewardValidationError("eventId must be a valid UUID.");
  }

  if (
    typeof body.title !== "string" ||
    typeof body.description !== "string" ||
    typeof body.requiredStampCount !== "string" ||
    typeof body.rewardType !== "string" ||
    typeof body.inventoryTotal !== "string" ||
    typeof body.claimInstructions !== "string"
  ) {
    throw new ClubRewardValidationError("reward tier create payload is incomplete.");
  }

  if (body.title.trim().length === 0) {
    throw new ClubRewardValidationError("title is required.");
  }

  return {
    claimInstructions: body.claimInstructions,
    description: body.description,
    eventId: body.eventId,
    inventoryTotal: body.inventoryTotal,
    inventoryTotalValue: parseInventoryTotalOrThrow(body.inventoryTotal),
    requiredStampCount: body.requiredStampCount,
    requiredStampCountValue: parseRequiredStampCountOrThrow(body.requiredStampCount),
    rewardType: assertRewardTypeOrThrow(body.rewardType),
    title: body.title,
  };
};

export const parseRewardTierUpdatePayloadOrThrow = (
  body: Partial<ClubRewardTierUpdatePayload>
): ClubRewardTierUpdatePayload & {
  inventoryTotalValue: number | null;
  requiredStampCountValue: number;
} => {
  const rewardTierId = parseRewardTierIdOrThrow(body.rewardTierId);

  if (
    typeof body.title !== "string" ||
    typeof body.description !== "string" ||
    typeof body.requiredStampCount !== "string" ||
    typeof body.rewardType !== "string" ||
    typeof body.inventoryTotal !== "string" ||
    typeof body.claimInstructions !== "string" ||
    typeof body.status !== "string"
  ) {
    throw new ClubRewardValidationError("reward tier update payload is incomplete.");
  }

  if (body.title.trim().length === 0) {
    throw new ClubRewardValidationError("title is required.");
  }

  return {
    claimInstructions: body.claimInstructions,
    description: body.description,
    inventoryTotal: body.inventoryTotal,
    inventoryTotalValue: parseInventoryTotalOrThrow(body.inventoryTotal),
    requiredStampCount: body.requiredStampCount,
    requiredStampCountValue: parseRequiredStampCountOrThrow(body.requiredStampCount),
    rewardTierId,
    rewardType: assertRewardTypeOrThrow(body.rewardType),
    status: assertRewardStatusOrThrow(body.status),
    title: body.title,
  };
};
