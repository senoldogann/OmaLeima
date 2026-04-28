import { NextResponse } from "next/server";

import {
  invokeRewardClaimRpcAsync,
  requireClubRewardClaimAccessAsync,
} from "@/features/club-claims/reward-claim-transport";
import {
  ClubRewardClaimValidationError,
  parseRewardClaimConfirmPayloadOrThrow,
} from "@/features/club-claims/validation";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const accessError = await requireClubRewardClaimAccessAsync(supabase);

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
          message: "Sign in again before confirming reward handoff.",
          status: "AUTH_REQUIRED",
        },
        {
          status: 401,
        }
      );
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

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unknown reward claim route error.",
        status: "ROUTE_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}
