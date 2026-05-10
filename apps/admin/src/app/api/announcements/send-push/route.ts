import { NextResponse } from "next/server";

import {
  requireAnnouncementAccessAsync,
  sendAnnouncementPushAsync,
} from "@/features/announcements/transport";
import {
  AnnouncementValidationError,
  parseAnnouncementIdOrThrow,
} from "@/features/announcements/validation";
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
    const accessError = await requireAnnouncementAccessAsync(supabase);

    if (accessError !== null) {
      return NextResponse.json(accessError.response, {
        status: accessError.status,
      });
    }

    const userId = await resolveAuthenticatedRouteUserIdAsync(supabase);

    if (userId === null) {
      return NextResponse.json({ message: "Sign in again before sending announcement pushes.", status: "AUTH_REQUIRED" }, { status: 401 });
    }

    const rateLimitResponse = await enforceDashboardMutationRateLimitAsync(userId, "announcement-send-push");

    if (rateLimitResponse !== null) {
      return rateLimitResponse;
    }

    const body = (await request.json()) as Record<string, unknown>;
    const result = await sendAnnouncementPushAsync(
      supabase,
      parseAnnouncementIdOrThrow(body.announcementId)
    );

    return NextResponse.json(result.response, {
      status: result.status,
    });
  } catch (error) {
    if (error instanceof AnnouncementValidationError) {
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

    console.error("[announcement-send-push] failed", {
      message: error instanceof Error ? error.message : "Unknown announcement push route error.",
    });

    return NextResponse.json(
      {
        message: "Announcement push could not be sent.",
        status: "ROUTE_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}
