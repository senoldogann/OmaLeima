import { NextResponse } from "next/server";

import { invokeReviewFraudSignalRpcAsync } from "@/features/fraud-review/review-transport";
import {
  FraudSignalReviewValidationError,
  parseFraudSignalReviewPayloadOrThrow,
} from "@/features/fraud-review/validation";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const body = parseFraudSignalReviewPayloadOrThrow(
      (await request.json()) as Record<string, unknown>
    );
    const result = await invokeReviewFraudSignalRpcAsync(
      supabase,
      body.signalId,
      body.status,
      body.resolutionNote
    );

    return NextResponse.json(result.response, {
      status: result.status,
    });
  } catch (error) {
    if (error instanceof FraudSignalReviewValidationError) {
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
        message: error instanceof Error ? error.message : "Unknown fraud signal review route error.",
        status: "ROUTE_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}
