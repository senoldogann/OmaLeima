import { NextResponse } from "next/server";

import {
  createAnnouncementAsync,
  requireAnnouncementAccessAsync,
} from "@/features/announcements/transport";
import {
  AnnouncementValidationError,
  parseAnnouncementCreatePayloadOrThrow,
} from "@/features/announcements/validation";
import { resolveAuthenticatedRouteUserIdAsync } from "@/features/auth/route-user";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const accessError = await requireAnnouncementAccessAsync(supabase);

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

    const body = parseAnnouncementCreatePayloadOrThrow(
      (await request.json()) as Record<string, string>
    );
    const result = await createAnnouncementAsync(supabase, {
      audience: body.audienceValue,
      body: body.body,
      clubId: body.clubIdValue,
      createdBy: userId,
      ctaLabel: body.ctaLabel.length === 0 ? null : body.ctaLabel,
      ctaUrl: body.ctaUrl.length === 0 ? null : body.ctaUrl,
      endsAt: body.endsAtValue,
      imageUrl: body.imageUrlValue,
      priority: body.priorityValue,
      startsAt: body.startsAtValue,
      status: body.statusValue,
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

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unknown announcement route error.",
        status: "ROUTE_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}
