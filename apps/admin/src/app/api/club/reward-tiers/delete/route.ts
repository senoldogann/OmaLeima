import { NextResponse } from "next/server";

import { resolveAuthenticatedRouteUserIdAsync } from "@/features/auth/route-user";
import {
  invokeDeleteRewardTierRpcAsync,
  requireClubRewardTierEditorAccessAsync,
} from "@/features/club-rewards/reward-tier-transport";
import {
  ClubRewardValidationError,
  parseRewardTierIdOrThrow,
} from "@/features/club-rewards/validation";
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
    const accessError = await requireClubRewardTierEditorAccessAsync(supabase);

    if (accessError !== null) {
      return NextResponse.json(accessError.response, {
        status: accessError.status,
      });
    }

    const userId = await resolveAuthenticatedRouteUserIdAsync(supabase);

    if (userId === null) {
      return NextResponse.json(
        {
          message: "Sign in again before deleting reward tiers.",
          status: "AUTH_REQUIRED",
        },
        {
          status: 401,
        }
      );
    }

    const rateLimitResponse = await enforceDashboardMutationRateLimitAsync(userId, "club-reward-tier-delete");

    if (rateLimitResponse !== null) {
      return rateLimitResponse;
    }

    const requestBody = (await request.json()) as Record<string, string>;
    const rewardTierId = parseRewardTierIdOrThrow(requestBody.rewardTierId);
    const result = await invokeDeleteRewardTierRpcAsync(supabase, {
      deletedBy: userId,
      rewardTierId,
    });

    return NextResponse.json(result.response, {
      status: result.status,
    });
  } catch (error) {
    if (error instanceof ClubRewardValidationError) {
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

    console.error("[club-reward-tier-delete] failed", {
      message: error instanceof Error ? error.message : "Unknown reward tier delete route error.",
    });

    return NextResponse.json(
      {
        message: "Reward tier could not be deleted.",
        status: "ROUTE_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}
