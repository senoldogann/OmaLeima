import { NextResponse } from "next/server";

import {
  cancelClubEventAsync,
  requireClubEventCreatorAccessAsync,
} from "@/features/club-events/event-transport";
import {
  ClubEventValidationError,
  parseClubEventCancelPayloadOrThrow,
} from "@/features/club-events/validation";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const accessError = await requireClubEventCreatorAccessAsync(supabase);

    if (accessError !== null) {
      return NextResponse.json(accessError.response, {
        status: accessError.status,
      });
    }

    const body = parseClubEventCancelPayloadOrThrow(
      (await request.json()) as Record<string, string>
    );
    const result = await cancelClubEventAsync(supabase, body.eventId);

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
