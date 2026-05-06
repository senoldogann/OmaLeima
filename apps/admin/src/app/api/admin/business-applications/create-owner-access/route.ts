import { NextResponse } from "next/server";

import { invokeOwnerAccessEdgeFunctionAsync, requireAdminReviewAccessAsync } from "@/features/business-applications/review-transport";
import { isUuid } from "@/features/business-applications/validation";
import { createRouteHandlerClient } from "@/lib/supabase/server";

type CreateOwnerAccessRequestBody = {
  applicationId?: unknown;
};

const parseCreateOwnerAccessRequestBody = async (request: Request): Promise<{ applicationId: string }> => {
  const body = (await request.json()) as CreateOwnerAccessRequestBody;

  if (typeof body.applicationId !== "string" || !isUuid(body.applicationId)) {
    throw new Error("applicationId must be a valid UUID.");
  }

  return {
    applicationId: body.applicationId,
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

    const body = await parseCreateOwnerAccessRequestBody(request);
    const result = await invokeOwnerAccessEdgeFunctionAsync(supabase, body);

    return NextResponse.json(result.response, {
      status: result.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unknown owner access route error.",
        status: "VALIDATION_ERROR",
      },
      {
        status: 400,
      }
    );
  }
}
