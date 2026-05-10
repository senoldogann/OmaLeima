import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { resolveAdminAccessAsync } from "@/features/auth/access";
import { validatePasswordSessionRequest } from "@/features/auth/password-session-guard";
import { resolveClientIp } from "@/features/security/client-ip";
import { validateTurnstileTokenAsync } from "@/features/security/turnstile";
import { publicEnv } from "@/lib/env";

type PasswordSessionResponseBody =
  | {
      homeHref: string;
    }
  | {
      error: string;
    };

const createJsonResponse = (
  body: PasswordSessionResponseBody,
  status: number
): NextResponse<PasswordSessionResponseBody> => NextResponse.json(body, { status });

type CookieToSet = {
  name: string;
  value: string;
  options: object;
};

const turnstileAction = "admin_login";

const requestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  turnstileToken: z.string().max(2048).optional(),
});

type PasswordSessionRequestBody = z.infer<typeof requestSchema>;

const attachSessionCookies = (
  response: NextResponse<PasswordSessionResponseBody>,
  cookiesToSet: CookieToSet[]
): NextResponse<PasswordSessionResponseBody> => {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
};

const parseRequestBodyAsync = async (
  request: NextRequest
): Promise<PasswordSessionRequestBody | NextResponse<PasswordSessionResponseBody>> => {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.warn("[admin-login] invalid json body", {
      message: error instanceof Error ? error.message : "Unknown JSON parse error.",
    });

    return createJsonResponse({ error: "Password session request body was not valid JSON." }, 400);
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const issuePath = firstIssue?.path.join(".") ?? "request";
    const issueMessage = firstIssue?.message ?? "Invalid password session request.";

    return createJsonResponse({ error: `${issuePath}: ${issueMessage}` }, 400);
  }

  return parsed.data;
};

const validateLoginProtectionAsync = async (
  request: NextRequest,
  turnstileToken: string | undefined
): Promise<NextResponse<PasswordSessionResponseBody> | null> => {
  try {
    const validationResult = await validateTurnstileTokenAsync({
      action: turnstileAction,
      clientIp: resolveClientIp(request),
      context: "admin login",
      requestHost: request.headers.get("host"),
      token: turnstileToken,
    });

    if (!validationResult.ok) {
      const status = validationResult.reason === "misconfigured" ? 503 : 400;
      return createJsonResponse({ error: "Login verification failed." }, status);
    }

    return null;
  } catch (error) {
    console.error("[admin-login] turnstile configuration failed", {
      message: error instanceof Error ? error.message : "Unknown Turnstile configuration error.",
    });

    return createJsonResponse({ error: "Login protection is not configured." }, 503);
  }
};

export async function POST(request: NextRequest): Promise<NextResponse<PasswordSessionResponseBody>> {
  const requestError = validatePasswordSessionRequest(request);

  if (requestError !== null) {
    return createJsonResponse(
      { error: requestError.error },
      requestError.status
    );
  }

  const parsedBody = await parseRequestBodyAsync(request);

  if (parsedBody instanceof NextResponse) {
    return parsedBody;
  }

  const protectionError = await validateLoginProtectionAsync(request, parsedBody.turnstileToken);

  if (protectionError !== null) {
    return protectionError;
  }

  const cookiesToSet: CookieToSet[] = [];
  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(nextCookiesToSet) {
          nextCookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          cookiesToSet.push(...nextCookiesToSet);
        },
      },
    }
  );
  const signInResult = await supabase.auth.signInWithPassword({
    email: parsedBody.email,
    password: parsedBody.password,
  });

  if (signInResult.error !== null) {
    console.warn("[admin-login] password sign-in failed", {
      emailDomain: parsedBody.email.split("@")[1] ?? "unknown",
      message: signInResult.error.message,
    });

    return createJsonResponse({ error: "Email or password is incorrect." }, 401);
  }

  const access = await resolveAdminAccessAsync(supabase);

  return attachSessionCookies(createJsonResponse({ homeHref: access.homeHref }, 200), cookiesToSet);
}
