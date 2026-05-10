import { createHash } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

import { FINLAND_CITY_OPTIONS, FINLAND_COUNTRY } from "@/features/location/finland";
import { resolveClientIp } from "@/features/security/client-ip";
import { validateTurnstileTokenAsync, isHostedRuntime, readOptionalServerEnv, type TurnstileValidationResult } from "@/features/security/turnstile";
import { publicEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const minHumanFillMs = 1500;
const turnstileAction = "business_application";
const businessApplicationRateLimitFormKey = "business_application";
const rateLimitWindowMs = 60_000;
const rateLimitMaxRequests = 3;
const rateLimitDailyMaxRequests = 12;

const applicationSchema = z.object({
  address: z.string().min(2).max(240),
  businessName: z.string().min(2).max(180),
  city: z.enum(FINLAND_CITY_OPTIONS),
  consent: z.literal("yes"),
  contactEmail: z.string().min(5).max(200).email(),
  contactName: z.string().min(2).max(120),
  country: z.literal(FINLAND_COUNTRY),
  elapsedMs: z.number().min(0).max(60 * 60 * 1000),
  instagramUrl: z.string().max(300).optional(),
  message: z.string().max(2000).optional(),
  phone: z.string().max(80).optional(),
  turnstileToken: z.string().max(2048).optional(),
  website: z.string().max(0),
  websiteUrl: z.string().max(300).optional(),
});

type ApplicationPayload = z.infer<typeof applicationSchema>;
type FieldErrorMap = Partial<Record<keyof ApplicationPayload, string>>;
type ResponseBody =
  | { ok: true }
  | { message: string; retryAfterSeconds: number }
  | { fieldErrors?: FieldErrorMap; message: string };
type RateLimitResult = "allowed" | "recent_limited" | "daily_limited";

const stripControlChars = (value: string): string =>
  value.replace(/[\u0000-\u001f\u007f]/g, "").trim();

const normalizeOptional = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const stripped = stripControlChars(value);

  return stripped.length > 0 ? stripped : undefined;
};

const readRequiredServerEnv = (name: string): string => {
  const value = readOptionalServerEnv(name);

  if (value === null) {
    throw new Error(`${name} is required for business application intake.`);
  }

  return value;
};

const buildServiceRoleClient = (): SupabaseClient =>
  createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, readRequiredServerEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
    },
  });

const readIpHashSecret = (): string => {
  const secret =
    readOptionalServerEnv("BUSINESS_APPLICATION_IP_HASH_SECRET") ??
    readOptionalServerEnv("CONTACT_IP_HASH_SECRET");

  if (secret !== null) {
    return secret;
  }

  if (isHostedRuntime()) {
    throw new Error("BUSINESS_APPLICATION_IP_HASH_SECRET or CONTACT_IP_HASH_SECRET is required for business application rate limiting.");
  }

  return "local-development";
};

const hashIp = (ip: string): string =>
  createHash("sha256").update(`${readIpHashSecret()}:${ip}`).digest("hex");

const countRateLimitRowsSinceAsync = async (
  supabase: SupabaseClient,
  ipHash: string,
  sinceIso: string
): Promise<number> => {
  const { count, error } = await supabase
    .from("public_form_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("form_key", businessApplicationRateLimitFormKey)
    .eq("ip_hash", ipHash)
    .gte("created_at", sinceIso);

  if (error !== null) {
    throw new Error(`Failed to check business application rate limit: ${error.message}`);
  }

  return count ?? 0;
};

const checkBusinessApplicationRateLimitAsync = async (
  supabase: SupabaseClient,
  ipHash: string
): Promise<RateLimitResult> => {
  const now = Date.now();
  const recentSinceIso = new Date(now - rateLimitWindowMs).toISOString();
  const dailySinceIso = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const [recentCount, dailyCount] = await Promise.all([
    countRateLimitRowsSinceAsync(supabase, ipHash, recentSinceIso),
    countRateLimitRowsSinceAsync(supabase, ipHash, dailySinceIso),
  ]);

  if (recentCount >= rateLimitMaxRequests) {
    return "recent_limited";
  }

  if (dailyCount >= rateLimitDailyMaxRequests) {
    return "daily_limited";
  }

  const { error } = await supabase.from("public_form_rate_limits").insert({
    form_key: businessApplicationRateLimitFormKey,
    ip_hash: ipHash,
  });

  if (error !== null) {
    throw new Error(`Failed to record business application rate limit row: ${error.message}`);
  }

  return "allowed";
};

const flattenZodErrors = (issues: z.ZodIssue[]): FieldErrorMap => {
  const result: FieldErrorMap = {};

  for (const issue of issues) {
    const key = issue.path[0];

    if (typeof key === "string" && !(key in result)) {
      (result as Record<string, string>)[key] = issue.message;
    }
  }

  return result;
};

const validateOrigin = (request: Request): boolean => {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (origin === null || host === null) {
    return !isHostedRuntime();
  }

  try {
    const originHost = new URL(origin).host;

    return originHost === host;
  } catch {
    return false;
  }
};

const parsePayload = async (request: Request): Promise<ApplicationPayload | { fieldErrors: FieldErrorMap; message: string }> => {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch (error) {
    console.warn("[business-application] invalid json body", {
      message: error instanceof Error ? error.message : "Unknown JSON parse error.",
    });

    return { fieldErrors: {}, message: "Invalid JSON." };
  }

  const record = typeof rawBody === "object" && rawBody !== null ? rawBody as Record<string, unknown> : {};
  const parsed = applicationSchema.safeParse({
    address: normalizeOptional(record.address) ?? "",
    businessName: normalizeOptional(record.businessName) ?? "",
    city: normalizeOptional(record.city) ?? "",
    consent: record.consent,
    contactEmail: normalizeOptional(record.contactEmail) ?? "",
    contactName: normalizeOptional(record.contactName) ?? "",
    country: normalizeOptional(record.country) ?? "Finland",
    elapsedMs: typeof record.elapsedMs === "number" ? record.elapsedMs : Number(record.elapsedMs),
    instagramUrl: normalizeOptional(record.instagramUrl),
    message: normalizeOptional(record.message),
    phone: normalizeOptional(record.phone),
    turnstileToken: normalizeOptional(record.turnstileToken),
    website: normalizeOptional(record.website) ?? "",
    websiteUrl: normalizeOptional(record.websiteUrl),
  });

  if (!parsed.success) {
    return {
      fieldErrors: flattenZodErrors(parsed.error.issues),
      message: "Validation failed.",
    };
  }

  return parsed.data;
};

const validateProtectionAsync = async (
  request: Request,
  token: string | undefined
): Promise<TurnstileValidationResult> =>
  validateTurnstileTokenAsync({
    action: turnstileAction,
    clientIp: resolveClientIp(request),
    context: "business application intake",
    requestHost: request.headers.get("host"),
    token,
  });

export const POST = async (request: Request): Promise<NextResponse<ResponseBody>> => {
  if (!validateOrigin(request)) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }

  const payload = await parsePayload(request);

  if ("message" in payload && "fieldErrors" in payload) {
    return NextResponse.json(payload, { status: 400 });
  }

  if (payload.elapsedMs < minHumanFillMs) {
    return NextResponse.json({ message: "Submission rejected." }, { status: 400 });
  }

  let turnstileResult: TurnstileValidationResult;

  try {
    turnstileResult = await validateProtectionAsync(request, payload.turnstileToken);
  } catch (error) {
    console.error("[business-application] turnstile configuration failed", {
      message: error instanceof Error ? error.message : "Unknown Turnstile configuration error.",
    });

    turnstileResult = { ok: false, reason: "misconfigured" };
  }

  if (!turnstileResult.ok) {
    const status = turnstileResult.reason === "misconfigured" ? 503 : 400;

    return NextResponse.json({ message: "Verification failed." }, { status });
  }

  let supabase: SupabaseClient;

  try {
    supabase = buildServiceRoleClient();
    const rateLimitResult = await checkBusinessApplicationRateLimitAsync(
      supabase,
      hashIp(resolveClientIp(request))
    );

    if (rateLimitResult !== "allowed") {
      return NextResponse.json(
        {
          message: "Too many requests.",
          retryAfterSeconds: rateLimitResult === "recent_limited" ? 60 : 24 * 60 * 60,
        },
        { status: 429 }
      );
    }
  } catch (error) {
    console.error("[business-application] rate limit check failed", {
      message: error instanceof Error ? error.message : "Unknown rate limit error.",
    });

    return NextResponse.json({ message: "Could not check rate limit." }, { status: 500 });
  }

  try {
    const { error } = await supabase
      .from("business_applications")
      .insert({
        address: payload.address,
        business_name: payload.businessName,
        city: payload.city,
        contact_email: payload.contactEmail,
        contact_name: payload.contactName,
        country: payload.country,
        instagram_url: payload.instagramUrl ?? null,
        message: payload.message ?? null,
        phone: payload.phone ?? null,
        status: "PENDING",
        website_url: payload.websiteUrl ?? null,
      });

    if (error !== null) {
      throw new Error(`Failed to create business application: ${error.message}`);
    }
  } catch (error) {
    console.error("[business-application] insert failed", {
      message: error instanceof Error ? error.message : "Unknown insert error.",
    });

    return NextResponse.json({ message: "Could not create business application." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
};
