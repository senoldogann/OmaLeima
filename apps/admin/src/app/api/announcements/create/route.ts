import { NextResponse } from "next/server";

import {
  createAnnouncementAsync,
  requireAnnouncementAccessAsync,
} from "@/features/announcements/transport";
import {
  assertAnnouncementScopeAllowedForAccessOrThrow,
  AnnouncementValidationError,
  parseAnnouncementCreatePayloadOrThrow,
} from "@/features/announcements/validation";
import { resolveAdminAccessAsync } from "@/features/auth/access";
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
    const access = await resolveAdminAccessAsync(supabase);

    if (accessError !== null) {
      return NextResponse.json(accessError.response, {
        status: accessError.status,
      });
    }

    const userId = await resolveAuthenticatedRouteUserIdAsync(supabase);

    if (userId === null) {
      return NextResponse.json(
        {
          message: "Sign in again before creating announcements.",
          status: "AUTH_REQUIRED",
        },
        {
          status: 401,
        }
      );
    }

    const rateLimitResponse = await enforceDashboardMutationRateLimitAsync(userId, "announcement-create");

    if (rateLimitResponse !== null) {
      return rateLimitResponse;
    }

    const body = parseAnnouncementCreatePayloadOrThrow(
      (await request.json()) as Record<string, string>
    );
    assertAnnouncementScopeAllowedForAccessOrThrow(access.area, body);
    const result = await createAnnouncementAsync(supabase, {
      audience: body.audienceValue,
      body: body.body,
      clubId: body.clubIdValue,
      createdBy: userId,
      ctaLabel: body.ctaLabel.length === 0 ? null : body.ctaLabel,
      ctaUrl: body.ctaUrl.length === 0 ? null : body.ctaUrl,
      endsAt: body.endsAtValue,
      eventId: body.eventIdValue,
      imageStagingPath: body.imageStagingPathValue,
      imageUrl: body.imageUrlValue,
      priority: body.priorityValue,
      startsAt: body.startsAtValue,
      status: body.statusValue,
      targetCity: body.targetCityValue,
      title: body.title,
    });

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

    console.error("[announcement-create] failed", {
      message: error instanceof Error ? error.message : "Unknown announcement route error.",
    });

    return NextResponse.json(
      {
        message: "Announcement could not be created.",
        status: "ROUTE_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}
