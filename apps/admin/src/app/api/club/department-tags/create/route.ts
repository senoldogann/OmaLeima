import { NextResponse } from "next/server";

import {
  invokeCreateClubDepartmentTagRpcAsync,
  requireClubDepartmentTagEditorAccessAsync,
} from "@/features/club-department-tags/department-tag-transport";
import {
  ClubDepartmentTagValidationError,
  parseClubDepartmentTagCreatePayloadOrThrow,
} from "@/features/club-department-tags/validation";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const accessError = await requireClubDepartmentTagEditorAccessAsync(supabase);

    if (accessError !== null) {
      return NextResponse.json(accessError.response, {
        status: accessError.status,
      });
    }

    const claimsResult = await supabase.auth.getClaims();

    if (claimsResult.error !== null) {
      throw new Error(`Failed to resolve route claims: ${claimsResult.error.message}`);
    }

    const userId = claimsResult.data?.claims?.sub;

    if (typeof userId !== "string") {
      return NextResponse.json(
        {
          message: "Sign in again before creating an official department tag.",
          status: "AUTH_REQUIRED",
        },
        {
          status: 401,
        }
      );
    }

    const body = parseClubDepartmentTagCreatePayloadOrThrow(
      (await request.json()) as Record<string, string>
    );
    const result = await invokeCreateClubDepartmentTagRpcAsync(supabase, {
      clubId: body.clubId,
      createdBy: userId,
      title: body.title,
    });

    return NextResponse.json(result.response, {
      status: result.status,
    });
  } catch (error) {
    if (error instanceof ClubDepartmentTagValidationError) {
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
        message: error instanceof Error ? error.message : "Unknown club department tag route error.",
        status: "ROUTE_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}
