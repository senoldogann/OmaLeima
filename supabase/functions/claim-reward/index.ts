import { assertPostRequest, enforceEdgeActorRateLimitAsync, errorResponse, getBearerToken, jsonResponse, readJsonBody } from "../_shared/http.ts";
import { readRuntimeEnv } from "../_shared/env.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";
import { isUuid } from "../_shared/validation.ts";

type ClaimRewardRequest = {
  eventId: string;
  studentId: string;
  rewardTierId: string;
  notes: string | null;
};

type ClaimRewardRpcResult = {
  status: string;
  rewardClaimId?: string;
  requiredStampCount?: number;
  stampCount?: number;
};

const responseMessages: Record<string, string> = {
  SUCCESS: "Reward claim recorded successfully.",
  CLAIMER_NOT_ALLOWED: "Authenticated user is not allowed to claim rewards for this event.",
  EVENT_NOT_FOUND: "Event was not found.",
  EVENT_NOT_ACTIVE: "Reward claims are available only while the event is active.",
  STUDENT_NOT_REGISTERED: "Student is not registered for this event.",
  REWARD_TIER_NOT_FOUND: "Reward tier was not found for this event.",
  NOT_ENOUGH_STAMPS: "Student does not have enough leimas for this reward.",
  REWARD_OUT_OF_STOCK: "Reward is out of stock.",
  REWARD_ALREADY_CLAIMED: "This reward was already claimed for the student.",
};

const responseHttpStatuses: Record<string, number> = {
  SUCCESS: 200,
  CLAIMER_NOT_ALLOWED: 403,
  EVENT_NOT_FOUND: 404,
  EVENT_NOT_ACTIVE: 423,
  STUDENT_NOT_REGISTERED: 403,
  REWARD_TIER_NOT_FOUND: 404,
  NOT_ENOUGH_STAMPS: 409,
  REWARD_OUT_OF_STOCK: 409,
  REWARD_ALREADY_CLAIMED: 409,
};

const maxNotesLength = 500;

const parseNotes = (value: unknown): string | null => {
  if (typeof value === "undefined" || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("notes must be a string when provided.");
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return null;
  }

  if (trimmedValue.length > maxNotesLength) {
    throw new Error(`notes must be ${maxNotesLength} characters or shorter.`);
  }

  return trimmedValue;
};

const parseRequestBody = (body: Record<string, unknown>): ClaimRewardRequest => {
  if (!isUuid(body.eventId)) {
    throw new Error("eventId must be a valid UUID.");
  }

  if (!isUuid(body.studentId)) {
    throw new Error("studentId must be a valid UUID.");
  }

  if (!isUuid(body.rewardTierId)) {
    throw new Error("rewardTierId must be a valid UUID.");
  }

  return {
    eventId: body.eventId,
    studentId: body.studentId,
    rewardTierId: body.rewardTierId,
    notes: parseNotes(body.notes),
  };
};

Deno.serve(async (request: Request): Promise<Response> => {
  const methodResponse = assertPostRequest(request);

  if (methodResponse !== null) {
    return methodResponse;
  }

  try {
    const env = readRuntimeEnv();
    const authToken = getBearerToken(request);

    if (authToken === null) {
      return errorResponse(401, "UNAUTHORIZED", "Missing or invalid Authorization bearer token.", {});
    }

    const body = parseRequestBody(await readJsonBody(request));
    const supabase = createServiceClient(env);
    const authResult = await getAuthenticatedUser(supabase, authToken);

    if (!authResult.ok) {
      return errorResponse(401, "UNAUTHORIZED", "Invalid Supabase access token.", {
        authError: authResult.message,
      });
    }

    const { user } = authResult.value;
    const rateLimitResponse = await enforceEdgeActorRateLimitAsync(
      supabase,
      user.id,
      `claim-reward:${body.eventId}`,
      {
        dayMaxRequests: 240,
        windowMaxRequests: 20,
        windowSeconds: 60,
      },
    );

    if (rateLimitResponse !== null) {
      return rateLimitResponse;
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc("claim_reward_atomic", {
      p_event_id: body.eventId,
      p_student_id: body.studentId,
      p_reward_tier_id: body.rewardTierId,
      p_claimed_by: user.id,
      p_notes: body.notes,
    });

    if (rpcError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to claim reward.", {
        eventId: body.eventId,
        studentId: body.studentId,
        rewardTierId: body.rewardTierId,
        claimedBy: user.id,
        rpcError: rpcError.message,
        rpcErrorCode: rpcError.code,
      });
    }

    const result = rpcResult as ClaimRewardRpcResult;
    const responseStatus = responseHttpStatuses[result.status] ?? 500;

    return jsonResponse({
      ...result,
      message: responseMessages[result.status] ?? "Reward claim completed.",
    }, responseStatus);
  } catch (error) {
    return errorResponse(400, "VALIDATION_ERROR", "Failed to claim reward.", {
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
});
