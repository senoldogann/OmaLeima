import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveClientIp } from "@/features/security/client-ip";
import { validateTurnstileTokenAsync } from "@/features/security/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const turnstileAction = "admin_login";

const requestSchema = z.object({
  turnstileToken: z.string().max(2048).optional(),
});

type ResponseBody =
  | { ok: true }
  | { error: string };

export const POST = async (request: Request): Promise<NextResponse<ResponseBody>> => {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown JSON parse error.";

    return NextResponse.json({ error: `Invalid verification request JSON: ${message}` }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Verification token is invalid." }, { status: 400 });
  }

  let validationResult;

  try {
    validationResult = await validateTurnstileTokenAsync({
      action: turnstileAction,
      clientIp: resolveClientIp(request),
      context: "admin login",
      requestHost: request.headers.get("host"),
      token: parsed.data.turnstileToken,
    });
  } catch (error) {
    console.error("[admin-login] turnstile configuration failed", {
      message: error instanceof Error ? error.message : "Unknown Turnstile configuration error.",
    });

    return NextResponse.json({ error: "Login protection is not configured." }, { status: 503 });
  }

  if (!validationResult.ok) {
    const status = validationResult.reason === "misconfigured" ? 503 : 400;

    return NextResponse.json({ error: "Verification failed." }, { status });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
};
