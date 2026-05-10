import { NextResponse } from "next/server";

import {
  invokeCreateRewardTierRpcAsync,
  requireClubRewardTierEditorAccessAsync,
} from "@/features/club-rewards/reward-tier-transport";
import {
  ClubRewardValidationError,
  parseRewardTierCreatePayloadOrThrow,
} from "@/features/club-rewards/validation";
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
          message: "Sign in again before managing reward tiers.",
          status: "AUTH_REQUIRED",
        },
        {
          status: 401,
        }
      );
    }

    const rateLimitResponse = await enforceDashboardMutationRateLimitAsync(userId, "club-reward-tier-create");

    if (rateLimitResponse !== null) {
      return rateLimitResponse;
    }

    const body = parseRewardTierCreatePayloadOrThrow(
      (await request.json()) as Record<string, string>
    );
    const result = await invokeCreateRewardTierRpcAsync(supabase, {
      claimInstructions: body.claimInstructions,
      createdBy: userId,
      description: body.description,
      eventId: body.eventId,
      inventoryTotal: body.inventoryTotalValue,
      requiredStampCount: body.requiredStampCountValue,
      rewardType: body.rewardType,
      title: body.title,
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

    console.error("[club-reward-tier-create] failed", {
      message: error instanceof Error ? error.message : "Unknown reward tier route error.",
    });

    return NextResponse.json(
      {
        message: "Reward tier could not be created.",
        status: "ROUTE_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}
