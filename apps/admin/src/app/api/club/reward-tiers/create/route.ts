import { NextResponse } from "next/server";

import {
  invokeCreateRewardTierRpcAsync,
  requireClubRewardTierEditorAccessAsync,
} from "@/features/club-rewards/reward-tier-transport";
import {
  ClubRewardValidationError,
  parseRewardTierCreatePayloadOrThrow,
} from "@/features/club-rewards/validation";
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

    const claimsResult = await supabase.auth.getClaims();

    if (claimsResult.error !== null) {
      throw new Error(`Failed to resolve route claims: ${claimsResult.error.message}`);
    }

    const userId = claimsResult.data?.claims?.sub;

    if (typeof userId !== "string") {
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
