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
import { resolveAuthenticatedRouteUserIdAsync } from "@/features/auth/route-user";
import { enforceDashboardMutationRateLimitAsync } from "@/features/security/dashboard-rate-limit";
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
            return NextResponse.json({ message: "Sign in again before archiving announcements.", status: "AUTH_REQUIRED" }, { status: 401 });
        }

        const rateLimitResponse = await enforceDashboardMutationRateLimitAsync(userId, "announcement-archive");

        if (rateLimitResponse !== null) {
            return rateLimitResponse;
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
