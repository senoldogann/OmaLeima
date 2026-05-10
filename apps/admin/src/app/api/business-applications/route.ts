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
  | { fieldErrors?: FieldErrorMap; message: string };

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

  try {
    const supabase = buildServiceRoleClient();
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
