import { NextResponse } from "next/server";

import {
  cancelClubEventAsync,
  requireClubEventCreatorAccessAsync,
} from "@/features/club-events/event-transport";
import {
  ClubEventValidationError,
  parseClubEventCancelPayloadOrThrow,
} from "@/features/club-events/validation";
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
    const accessError = await requireClubEventCreatorAccessAsync(supabase);

    if (accessError !== null) {
      return NextResponse.json(accessError.response, {
        status: accessError.status,
      });
    }

    const userId = await resolveAuthenticatedRouteUserIdAsync(supabase);

    if (userId === null) {
      return NextResponse.json({ message: "Sign in again before cancelling events.", status: "AUTH_REQUIRED" }, { status: 401 });
    }

    const rateLimitResponse = await enforceDashboardMutationRateLimitAsync(userId, "club-event-cancel");

    if (rateLimitResponse !== null) {
      return rateLimitResponse;
    }

    const body = parseClubEventCancelPayloadOrThrow(
      (await request.json()) as Record<string, string>
    );
    const result = await cancelClubEventAsync(supabase, body.eventId, userId);

    return NextResponse.json(result.response, {
      status: result.status,
    });
  } catch (error) {
    if (error instanceof ClubEventValidationError) {
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
        message: error instanceof Error ? error.message : "Unknown club event cancel route error.",
        status: "ROUTE_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}
