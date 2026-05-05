import { NextResponse } from "next/server";

import {
    requireAnnouncementAccessAsync,
    updateAnnouncementAsync,
} from "@/features/announcements/transport";
import {
    AnnouncementValidationError,
    parseAnnouncementCreatePayloadOrThrow,
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

        const requestBody = (await request.json()) as Record<string, string>;
        const announcementId = parseAnnouncementIdOrThrow(requestBody.announcementId);
        const body = parseAnnouncementCreatePayloadOrThrow(requestBody);
        const result = await updateAnnouncementAsync(supabase, {
            announcementId,
            audience: body.audienceValue,
            body: body.body,
            clubId: body.clubIdValue,
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
                message: error instanceof Error ? error.message : "Unknown announcement update route error.",
                status: "ROUTE_ERROR",
            },
            {
                status: 500,
            }
        );
    }
}