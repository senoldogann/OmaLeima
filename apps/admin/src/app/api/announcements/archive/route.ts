import { NextResponse } from "next/server";

import {
    archiveAnnouncementAsync,
    requireAnnouncementAccessAsync,
} from "@/features/announcements/transport";
import {
    AnnouncementValidationError,
    parseAnnouncementIdOrThrow,
    parseOptionalAnnouncementClubIdOrThrow,
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

        const requestBody = (await request.json()) as Record<string, string>;
        const announcementId = parseAnnouncementIdOrThrow(requestBody.announcementId);
        const clubId = parseOptionalAnnouncementClubIdOrThrow(requestBody.clubId);
        const result = await archiveAnnouncementAsync(supabase, {
            announcementId,
            clubId,
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
                message: error instanceof Error ? error.message : "Unknown announcement archive route error.",
                status: "ROUTE_ERROR",
            },
            {
                status: 500,
            }
        );
    }
}