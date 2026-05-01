import { NextResponse } from "next/server";

import {
  requireClubEventCreatorAccessAsync,
  updateClubEventAsync,
} from "@/features/club-events/event-transport";
import {
  ClubEventValidationError,
  parseClubEventUpdatePayloadOrThrow,
  parseIsoDateTimeOrThrow,
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

    const body = parseClubEventUpdatePayloadOrThrow(
      (await request.json()) as Record<string, string>
    );
    const result = await updateClubEventAsync(supabase, {
      city: body.city,
      coverImageUrl: body.coverImageUrl,
      description: body.description,
      endAtIso: parseIsoDateTimeOrThrow(body.endAt, "endAt"),
      eventId: body.eventId,
      joinDeadlineAtIso: parseIsoDateTimeOrThrow(body.joinDeadlineAt, "joinDeadlineAt"),
      maxParticipants: body.maxParticipantsValue,
      minimumStampsRequired: body.minimumStampsRequiredValue,
      name: body.name,
      rules: body.parsedRules,
      startAtIso: parseIsoDateTimeOrThrow(body.startAt, "startAt"),
      status: body.status,
      visibility: body.visibility,
    });

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
        message: error instanceof Error ? error.message : "Unknown club event update route error.",
        status: "ROUTE_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}
