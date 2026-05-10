import { NextResponse } from "next/server";

import {
  invokeRewardClaimRpcAsync,
  requireClubRewardClaimAccessAsync,
} from "@/features/club-claims/reward-claim-transport";
import {
  ClubRewardClaimValidationError,
  parseRewardClaimConfirmPayloadOrThrow,
} from "@/features/club-claims/validation";
import { resolveAuthenticatedRouteUserIdAsync } from "@/features/auth/route-user";
import { enforceDashboardMutationRateLimitAsync } from "@/features/security/dashboard-rate-limit";
import { validateDashboardMutationRequest } from "@/features/security/dashboard-mutation-request";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const requestGuardResponse = validateDashboardMutationRequest(request, { requireJsonContentType: true });

    if (requestGuardResponse !== null) {
      return requestGuardResponse;
    }

    const supabase = await createRouteHandlerClient();
    const accessError = await requireClubRewardClaimAccessAsync(supabase);

    if (accessError !== null) {
      return NextResponse.json(accessError.response, {
        status: accessError.status,
      });
    }

    const userId = await resolveAuthenticatedRouteUserIdAsync(supabase);

    if (userId === null) {
      return NextResponse.json(
        {
          message: "Sign in again before confirming reward handoff.",
          status: "AUTH_REQUIRED",
        },
        {
          status: 401,
        }
      );
    }

    const rateLimitResponse = await enforceDashboardMutationRateLimitAsync(userId, "club-reward-claim-confirm");

    if (rateLimitResponse !== null) {
      return rateLimitResponse;
    }

    const body = parseRewardClaimConfirmPayloadOrThrow(
      (await request.json()) as Record<string, string>
    );
    const result = await invokeRewardClaimRpcAsync(supabase, {
      claimedBy: userId,
      eventId: body.eventId,
      notes: body.notes,
      rewardTierId: body.rewardTierId,
      studentId: body.studentId,
    });

    return NextResponse.json(result.response, {
      status: result.status,
    });
  } catch (error) {
    if (error instanceof ClubRewardClaimValidationError) {
      return NextResponse.json(
        {
          message: error.message,
          status: "VALIDATION_ERROR",
        },
        {
          status: 400,
        }
      );
    }

    console.error("[club-reward-claim-confirm] failed", {
      message: error instanceof Error ? error.message : "Unknown reward claim route error.",
    });

    return NextResponse.json(
      {
        message: "Reward claim could not be confirmed.",
        status: "ROUTE_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}
