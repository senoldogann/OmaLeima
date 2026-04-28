import { NextResponse } from "next/server";

import {
  invokeMergeDepartmentTagRpcAsync,
  requireAdminDepartmentTagAccessAsync,
} from "@/features/department-tags/moderation-transport";
import { isUuid } from "@/features/department-tags/validation";
import { createRouteHandlerClient } from "@/lib/supabase/server";

type MergeRequestBody = {
  sourceTagId?: unknown;
  targetTagId?: unknown;
};

const parseMergeRequestBody = async (
  request: Request
): Promise<{ sourceTagId: string; targetTagId: string }> => {
  const body = (await request.json()) as MergeRequestBody;

  if (typeof body.sourceTagId !== "string" || !isUuid(body.sourceTagId)) {
    throw new Error("sourceTagId must be a valid UUID.");
  }

  if (typeof body.targetTagId !== "string" || !isUuid(body.targetTagId)) {
    throw new Error("targetTagId must be a valid UUID.");
  }

  if (body.sourceTagId === body.targetTagId) {
    throw new Error("sourceTagId and targetTagId must be different.");
  }

  return {
    sourceTagId: body.sourceTagId,
    targetTagId: body.targetTagId,
  };
};

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const accessError = await requireAdminDepartmentTagAccessAsync(supabase);

    if (accessError !== null) {
      return NextResponse.json(accessError.response, {
        status: accessError.status,
      });
    }

    const body = await parseMergeRequestBody(request);
    const result = await invokeMergeDepartmentTagRpcAsync(
      supabase,
      body.sourceTagId,
      body.targetTagId
    );

    return NextResponse.json(result.response, {
      status: result.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unknown merge route error.",
        status: "VALIDATION_ERROR",
      },
      {
        status: 400,
      }
    );
  }
}
