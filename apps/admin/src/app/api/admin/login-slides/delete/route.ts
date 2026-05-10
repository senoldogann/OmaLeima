import { NextResponse } from "next/server";

import { resolveAdminAccessAsync } from "@/features/auth/access";
import { deleteLoginSlideAsync } from "@/features/login-slides/transport";
import {
  LoginSlideValidationError,
  parseLoginSlideIdOrThrow,
} from "@/features/login-slides/validation";
import { enforceDashboardMutationRateLimitAsync } from "@/features/security/dashboard-rate-limit";
import { validateDashboardMutationRequest } from "@/features/security/dashboard-mutation-request";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const requestGuardResponse = validateDashboardMutationRequest(request, { requireJsonContentType: true });

    if (requestGuardResponse !== null) {
      return requestGuardResponse;
    }

    const supabase = await createRouteHandlerClient();
    const access = await resolveAdminAccessAsync(supabase);

    if (access.area !== "admin" || access.userId === null) {
      return NextResponse.json(
        {
          message: "Only active platform admins can delete login slides.",
          status: "ADMIN_NOT_ALLOWED",
        },
        {
          status: 403,
        }
      );
    }

    const rateLimitResponse = await enforceDashboardMutationRateLimitAsync(access.userId, "admin-login-slide-delete");

    if (rateLimitResponse !== null) {
      return rateLimitResponse;
    }

    const requestBody = (await request.json()) as { slideId?: unknown };
    const slideId = parseLoginSlideIdOrThrow(requestBody.slideId);
    const result = await deleteLoginSlideAsync(supabase, slideId);

    return NextResponse.json(result.response, {
      status: result.status,
    });
  } catch (error) {
    if (error instanceof LoginSlideValidationError) {
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

    console.error("[admin-login-slide-delete] failed", {
      message: error instanceof Error ? error.message : "Unknown login slide delete route error.",
    });

    return NextResponse.json(
      {
        message: "Login slide could not be deleted.",
        status: "ROUTE_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}
