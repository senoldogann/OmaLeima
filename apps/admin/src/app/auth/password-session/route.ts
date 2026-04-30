import { NextResponse, type NextRequest } from "next/server";

import { resolveAdminAccessAsync } from "@/features/auth/access";
import { createRouteHandlerClient } from "@/lib/supabase/server";

type PasswordSessionRequestBody = {
  accessToken: string;
  refreshToken: string;
};

type PasswordSessionResponseBody =
  | {
      homeHref: string;
    }
  | {
      error: string;
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isPasswordSessionRequestBody = (value: unknown): value is PasswordSessionRequestBody =>
  isRecord(value) &&
  typeof value.accessToken === "string" &&
  value.accessToken.length > 0 &&
  typeof value.refreshToken === "string" &&
  value.refreshToken.length > 0;

const createJsonResponse = (
  body: PasswordSessionResponseBody,
  status: number
): NextResponse<PasswordSessionResponseBody> => NextResponse.json(body, { status });

export async function POST(request: NextRequest): Promise<NextResponse<PasswordSessionResponseBody>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown JSON parse error.";

    return createJsonResponse(
      { error: `Password session request body was not valid JSON: ${message}` },
      400
    );
  }

  if (!isPasswordSessionRequestBody(body)) {
    return createJsonResponse({ error: "Password session request requires accessToken and refreshToken." }, 400);
  }

  const supabase = await createRouteHandlerClient();
  const sessionResult = await supabase.auth.setSession({
    access_token: body.accessToken,
    refresh_token: body.refreshToken,
  });

  if (sessionResult.error !== null) {
    return createJsonResponse(
      { error: `Failed to persist password session: ${sessionResult.error.message}` },
      401
    );
  }

  const access = await resolveAdminAccessAsync(supabase);

  return createJsonResponse({ homeHref: access.homeHref }, 200);
}
