import { NextResponse } from "next/server";

import {
  invokeCreateClubDepartmentTagRpcAsync,
  requireClubDepartmentTagEditorAccessAsync,
} from "@/features/club-department-tags/department-tag-transport";
import {
  ClubDepartmentTagValidationError,
  parseClubDepartmentTagCreatePayloadOrThrow,
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
          message: "Sign in again before creating an official department tag.",
          status: "AUTH_REQUIRED",
        },
        {
          status: 401,
        }
      );
    }

    const rateLimitResponse = await enforceDashboardMutationRateLimitAsync(userId, "club-department-tag-create");

    if (rateLimitResponse !== null) {
      return rateLimitResponse;
    }

    const body = parseClubDepartmentTagCreatePayloadOrThrow(
      (await request.json()) as Record<string, string>
    );
    const result = await invokeCreateClubDepartmentTagRpcAsync(supabase, {
      clubId: body.clubId,
      createdBy: userId,
      title: body.title,
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

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unknown club department tag route error.",
        status: "ROUTE_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}
