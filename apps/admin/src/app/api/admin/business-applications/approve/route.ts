import { NextResponse } from "next/server";

import { invokeReviewEdgeFunctionAsync, requireAdminReviewAccessAsync } from "@/features/business-applications/review-transport";
import { resolveAuthenticatedRouteUserIdAsync } from "@/features/auth/route-user";
import { isUuid } from "@/features/business-applications/validation";
import { enforceDashboardMutationRateLimitAsync } from "@/features/security/dashboard-rate-limit";
import { validateDashboardMutationRequest } from "@/features/security/dashboard-mutation-request";
import { createRouteHandlerClient } from "@/lib/supabase/server";

type ApproveRequestBody = {
  applicationId?: unknown;
};

const parseApproveRequestBody = async (request: Request): Promise<{ applicationId: string }> => {
  const body = (await request.json()) as ApproveRequestBody;

  if (typeof body.applicationId !== "string" || !isUuid(body.applicationId)) {
    throw new Error("applicationId must be a valid UUID.");
  }

  return {
    applicationId: body.applicationId,
  };
};

export async function POST(request: Request) {
  try {
    const requestGuardResponse = validateDashboardMutationRequest(request, { requireJsonContentType: true });

    if (requestGuardResponse !== null) {
      return requestGuardResponse;
    }

    const supabase = await createRouteHandlerClient();
    const accessError = await requireAdminReviewAccessAsync(supabase);

    if (accessError !== null) {
      return NextResponse.json(accessError.response, {
        status: accessError.status,
      });
    }

    const userId = await resolveAuthenticatedRouteUserIdAsync(supabase);

    if (userId === null) {
      return NextResponse.json({ message: "Sign in again before approving applications.", status: "AUTH_REQUIRED" }, { status: 401 });
    }

    const rateLimitResponse = await enforceDashboardMutationRateLimitAsync(userId, "admin-business-application-approve");

    if (rateLimitResponse !== null) {
      return rateLimitResponse;
    }

    const body = await parseApproveRequestBody(request);
    const result = await invokeReviewEdgeFunctionAsync(supabase, "admin-approve-business", body);

    return NextResponse.json(result.response, {
      status: result.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unknown approve route error.",
        status: "VALIDATION_ERROR",
      },
      {
        status: 400,
      }
    );
  }
}
