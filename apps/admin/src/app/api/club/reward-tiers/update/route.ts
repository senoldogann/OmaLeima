import { NextResponse } from "next/server";

import {
  invokeUpdateRewardTierRpcAsync,
  requireClubRewardTierEditorAccessAsync,
} from "@/features/club-rewards/reward-tier-transport";
import {
  ClubRewardValidationError,
  parseRewardTierUpdatePayloadOrThrow,
} from "@/features/club-rewards/validation";
import { resolveAuthenticatedRouteUserIdAsync } from "@/features/auth/route-user";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
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

    const body = parseRewardTierUpdatePayloadOrThrow(
      (await request.json()) as Record<string, string>
    );
    const result = await invokeUpdateRewardTierRpcAsync(supabase, {
      claimInstructions: body.claimInstructions,
      description: body.description,
      inventoryTotal: body.inventoryTotalValue,
      requiredStampCount: body.requiredStampCountValue,
      rewardTierId: body.rewardTierId,
      rewardType: body.rewardType,
      status: body.status,
      title: body.title,
      updatedBy: userId,
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

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unknown reward tier route error.",
        status: "ROUTE_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}
