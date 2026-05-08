import { NextResponse } from "next/server";

import { resolveAdminAccessAsync } from "@/features/auth/access";
import { upsertLoginSlideAsync } from "@/features/login-slides/transport";
import {
  LoginSlideValidationError,
  parseLoginSlidePayloadOrThrow,
} from "@/features/login-slides/validation";
import { enforceDashboardMutationRateLimitAsync } from "@/features/security/dashboard-rate-limit";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const access = await resolveAdminAccessAsync(supabase);

    if (access.area !== "admin" || access.userId === null) {
      return NextResponse.json(
        {
          message: "Only active platform admins can manage login slides.",
          status: "ADMIN_NOT_ALLOWED",
        },
        {
          status: 403,
        }
      );
    }

    const rateLimitResponse = await enforceDashboardMutationRateLimitAsync(access.userId, "admin-login-slide-upsert");

    if (rateLimitResponse !== null) {
      return rateLimitResponse;
    }

    const payload = parseLoginSlidePayloadOrThrow(await request.json());
    const result = await upsertLoginSlideAsync(supabase, payload, access.userId);

    return NextResponse.json(result.response, {
      status: result.status,
    });
  } catch (error) {
    if (error instanceof LoginSlideValidationError) {
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
        message: error instanceof Error ? error.message : "Unknown login slide upsert route error.",
        status: "ROUTE_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}
