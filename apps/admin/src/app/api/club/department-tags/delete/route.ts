import { NextResponse } from "next/server";

import {
  invokeDeleteClubDepartmentTagRpcAsync,
  requireClubDepartmentTagEditorAccessAsync,
} from "@/features/club-department-tags/department-tag-transport";
import {
  ClubDepartmentTagValidationError,
  parseClubDepartmentTagDeletePayloadOrThrow,
} from "@/features/club-department-tags/validation";
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
    const accessError = await requireClubDepartmentTagEditorAccessAsync(supabase);

    if (accessError !== null) {
      return NextResponse.json(accessError.response, {
        status: accessError.status,
      });
    }

    const userId = await resolveAuthenticatedRouteUserIdAsync(supabase);

    if (userId === null) {
      return NextResponse.json(
        {
          message: "Sign in again before deleting an official department tag.",
          status: "AUTH_REQUIRED",
        },
        {
          status: 401,
        }
      );
    }

    const rateLimitResponse = await enforceDashboardMutationRateLimitAsync(userId, "club-department-tag-delete");

    if (rateLimitResponse !== null) {
      return rateLimitResponse;
    }

    const body = parseClubDepartmentTagDeletePayloadOrThrow(
      (await request.json()) as Record<string, string>
    );
    const result = await invokeDeleteClubDepartmentTagRpcAsync(supabase, {
      actorUserId: userId,
      departmentTagId: body.departmentTagId,
    });

    return NextResponse.json(result.response, {
      status: result.status,
    });
  } catch (error) {
    if (error instanceof ClubDepartmentTagValidationError) {
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

    console.error("[club-department-tag-delete] failed", {
      message: error instanceof Error ? error.message : "Unknown club department tag delete route error.",
    });

    return NextResponse.json(
      {
        message: "Department tag could not be deleted.",
        status: "ROUTE_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}
