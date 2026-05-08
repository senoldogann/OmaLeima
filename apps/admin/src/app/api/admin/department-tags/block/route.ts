import { NextResponse } from "next/server";

import {
  invokeBlockDepartmentTagRpcAsync,
  requireAdminDepartmentTagAccessAsync,
} from "@/features/department-tags/moderation-transport";
import { resolveAuthenticatedRouteUserIdAsync } from "@/features/auth/route-user";
import { isUuid } from "@/features/department-tags/validation";
import { enforceDashboardMutationRateLimitAsync } from "@/features/security/dashboard-rate-limit";
import { createRouteHandlerClient } from "@/lib/supabase/server";

type BlockRequestBody = {
  tagId?: unknown;
};

const parseBlockRequestBody = async (request: Request): Promise<{ tagId: string }> => {
  const body = (await request.json()) as BlockRequestBody;

  if (typeof body.tagId !== "string" || !isUuid(body.tagId)) {
    throw new Error("tagId must be a valid UUID.");
  }

  return {
    tagId: body.tagId,
  };
};

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const accessError = await requireAdminDepartmentTagAccessAsync(supabase);

    if (accessError !== null) {
      return NextResponse.json(accessError.response, {
        status: accessError.status,
      });
    }

    const userId = await resolveAuthenticatedRouteUserIdAsync(supabase);

    if (userId === null) {
      return NextResponse.json({ message: "Sign in again before moderating tags.", status: "AUTH_REQUIRED" }, { status: 401 });
    }

    const rateLimitResponse = await enforceDashboardMutationRateLimitAsync(userId, "admin-department-tag-block");

    if (rateLimitResponse !== null) {
      return rateLimitResponse;
    }

    const body = await parseBlockRequestBody(request);
    const result = await invokeBlockDepartmentTagRpcAsync(supabase, body.tagId);

    return NextResponse.json(result.response, {
      status: result.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unknown block route error.",
        status: "VALIDATION_ERROR",
      },
      {
        status: 400,
      }
    );
  }
}
