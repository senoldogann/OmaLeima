import { NextResponse } from "next/server";

import { invokeReviewEdgeFunctionAsync, requireAdminReviewAccessAsync } from "@/features/business-applications/review-transport";
import { isUuid } from "@/features/business-applications/validation";
import { createRouteHandlerClient } from "@/lib/supabase/server";

type RejectRequestBody = {
  applicationId?: unknown;
  rejectionReason?: unknown;
};

const parseRejectRequestBody = async (
  request: Request
): Promise<{ applicationId: string; rejectionReason: string }> => {
  const body = (await request.json()) as RejectRequestBody;

  if (typeof body.applicationId !== "string" || !isUuid(body.applicationId)) {
    throw new Error("applicationId must be a valid UUID.");
  }

  if (typeof body.rejectionReason !== "string") {
    throw new Error("rejectionReason must be a string.");
  }

  const rejectionReason = body.rejectionReason.trim();

  if (rejectionReason.length === 0) {
    throw new Error("rejectionReason must not be empty.");
  }

  return {
    applicationId: body.applicationId,
    rejectionReason,
  };
};

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const accessError = await requireAdminReviewAccessAsync(supabase);

    if (accessError !== null) {
      return NextResponse.json(accessError.response, {
        status: accessError.status,
      });
    }

    const body = await parseRejectRequestBody(request);
    const result = await invokeReviewEdgeFunctionAsync(supabase, "admin-reject-business", body);

    return NextResponse.json(result.response, {
      status: result.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unknown reject route error.",
        status: "VALIDATION_ERROR",
      },
      {
        status: 400,
      }
    );
  }
}
