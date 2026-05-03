import { NextResponse } from "next/server";

import {
  requireAnnouncementAccessAsync,
  sendAnnouncementPushAsync,
} from "@/features/announcements/transport";
import {
  AnnouncementValidationError,
  parseAnnouncementIdOrThrow,
} from "@/features/announcements/validation";
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

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unknown announcement push route error.",
        status: "ROUTE_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}
