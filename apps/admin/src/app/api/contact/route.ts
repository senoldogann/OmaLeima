import { createHash, randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

import { contactSubjectValues } from "@/features/public-site/contact-content";
import { publicEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxAttachmentBytes = 5 * 1024 * 1024;
const minHumanFillMs = 1500;
const rateLimitWindowMs = 60_000;
const rateLimitMaxRequests = 3;
const rateLimitDailyMaxRequests = 12;
const turnstileAction = "contact_form";
const turnstileSiteverifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const turnstileRequestTimeoutMs = 3500;

const allowedMimeTypes: ReadonlyArray<string> = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

type MagicByteSignature = {
  mime: string;
  matches: (head: Uint8Array) => boolean;
};

const startsWithBytes = (head: Uint8Array, prefix: ReadonlyArray<number>): boolean =>
  head.length >= prefix.length && prefix.every((byte, index) => head[index] === byte);

const magicByteSignatures: ReadonlyArray<MagicByteSignature> = [
  {
    mime: "image/jpeg",
    matches: (head: Uint8Array): boolean => startsWithBytes(head, [0xff, 0xd8, 0xff]),
  },
  {
    mime: "image/png",
    matches: (head: Uint8Array): boolean =>
      startsWithBytes(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    mime: "image/webp",
    matches: (head: Uint8Array): boolean =>
      startsWithBytes(head, [0x52, 0x49, 0x46, 0x46]) &&
      head.length >= 12 &&
      head[8] === 0x57 &&
      head[9] === 0x45 &&
      head[10] === 0x42 &&
      head[11] === 0x50,
  },
];

const submissionSchema = z.object({
  consent: z.literal("yes", {
    error: "Hyväksy tietosuojaseloste / Please accept the privacy notice.",
  }),
  email: z
    .string()
    .min(5)
    .max(200)
    .email("Tarkista sähköpostiosoite / Invalid email."),
  elapsedMs: z.coerce.number().min(0).max(60 * 60 * 1000),
  locale: z.enum(["fi", "en"]),
  message: z.string().min(10).max(5000),
  name: z.string().min(2).max(120),
  organization: z
    .string()
    .max(200)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  subject: z.enum(contactSubjectValues),
  turnstileToken: z.string().max(2048).optional(),
  website: z.string().max(0, "Honeypot triggered."),
});

type SubmissionPayload = z.infer<typeof submissionSchema>;
type FieldErrorMap = Partial<Record<keyof SubmissionPayload | "attachment", string>>;
type RateLimitResult = "allowed" | "recent_limited" | "daily_limited";
type TurnstileValidationResult =
  | { ok: true }
  | { ok: false; reason: "misconfigured" | "missing_token" | "failed" | "unavailable" };

type TurnstileSiteverifyResponse = {
  action?: string;
  challenge_ts?: string;
  "error-codes"?: string[];
  hostname?: string;
  success?: boolean;
};

const isHostedRuntime = (): boolean =>
  process.env.VERCEL === "1" || process.env.REQUIRE_CONTACT_TURNSTILE === "1";

const readRequiredServerEnv = (name: string): string => {
  const value = process.env[name];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required for the public contact form backend.`);
  }

  return value;
};

const readOptionalServerEnv = (name: string): string | null => {
  const value = process.env[name];

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value;
};

const buildServiceRoleClient = (): SupabaseClient =>
  createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, readRequiredServerEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
    },
  });

const matchesMagicBytes = (mime: string, head: Uint8Array): boolean => {
  const signature = magicByteSignatures.find((entry) => entry.mime === mime);

  if (typeof signature === "undefined") {
    return false;
  }

  return signature.matches(head);
};

const stripControlChars = (value: string): string =>
  value.replace(/[\u0000-\u001f\u007f]/g, "").trim();

const hashIp = (ip: string): string => {
  const secret = readOptionalServerEnv("CONTACT_IP_HASH_SECRET");
  const salt = secret ?? (isHostedRuntime() ? readRequiredServerEnv("CONTACT_IP_HASH_SECRET") : "local-development");

  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
};

const resolveClientIp = (request: Request): string => {
  const cloudflareIp = request.headers.get("cf-connecting-ip");

  if (cloudflareIp !== null && cloudflareIp.trim().length > 0) {
    return cloudflareIp.trim();
  }

  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded !== null) {
    const first = forwarded.split(",")[0]?.trim();

    if (typeof first === "string" && first.length > 0) {
      return first;
    }
  }

  return request.headers.get("x-real-ip") ?? "unknown";
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

const hasMultipartFormDataContentType = (request: Request): boolean => {
  const contentType = request.headers.get("content-type");

  return contentType !== null && contentType.toLowerCase().includes("multipart/form-data");
};

const countSubmissionsSinceAsync = async (
  supabase: SupabaseClient,
  ipHash: string,
  sinceIso: string
): Promise<number> => {
  const { count, error } = await supabase
    .from("public_contact_submissions")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", sinceIso);

  if (error !== null) {
    throw new Error(`Failed to check contact form rate limit: ${error.message}`);
  }

  return count ?? 0;
};

const checkRateLimitAsync = async (
  supabase: SupabaseClient,
  ipHash: string
): Promise<RateLimitResult> => {
  const now = Date.now();
  const recentSinceIso = new Date(now - rateLimitWindowMs).toISOString();
  const dailySinceIso = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const [recentCount, dailyCount] = await Promise.all([
    countSubmissionsSinceAsync(supabase, ipHash, recentSinceIso),
    countSubmissionsSinceAsync(supabase, ipHash, dailySinceIso),
  ]);

  if (recentCount >= rateLimitMaxRequests) {
    return "recent_limited";
  }

  if (dailyCount >= rateLimitDailyMaxRequests) {
    return "daily_limited";
  }

  return "allowed";
};

const readTurnstileSecret = (): string | null => {
  const secret = readOptionalServerEnv("TURNSTILE_SECRET_KEY");

  if (secret !== null) {
    return secret;
  }

  if (isHostedRuntime()) {
    throw new Error("TURNSTILE_SECRET_KEY is required for hosted contact form submissions.");
  }

  return null;
};

const validateTurnstileAsync = async (
  token: string | undefined,
  clientIp: string,
  requestHost: string | null
): Promise<TurnstileValidationResult> => {
  const secret = readTurnstileSecret();

  if (secret === null) {
    return { ok: true };
  }

  if (typeof token !== "string" || token.trim().length === 0) {
    return { ok: false, reason: "missing_token" };
  }

  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  body.set("remoteip", clientIp);
  body.set("idempotency_key", randomUUID());

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), turnstileRequestTimeoutMs);

  try {
    const response = await fetch(turnstileSiteverifyUrl, {
      body,
      method: "POST",
      signal: abortController.signal,
    });
    const result = (await response.json()) as TurnstileSiteverifyResponse;

    if (!response.ok || result.success !== true) {
      console.warn("[contact-form] turnstile validation failed", {
        errors: result["error-codes"] ?? [],
      });

      return { ok: false, reason: "failed" };
    }

    const expectedHostname = requestHost === null ? null : requestHost.split(":")[0];
    const hostnameMatches =
      expectedHostname === null ||
      typeof result.hostname !== "string" ||
      result.hostname === expectedHostname;
    const actionMatches = typeof result.action !== "string" || result.action === turnstileAction;

    if (!hostnameMatches || !actionMatches) {
      console.warn("[contact-form] turnstile context mismatch", {
        action: result.action ?? null,
        hostname: result.hostname ?? null,
      });

      return { ok: false, reason: "failed" };
    }

    return { ok: true };
  } catch (error) {
    console.error("[contact-form] turnstile validation unavailable", {
      message: error instanceof Error ? error.message : "Unknown Turnstile validation error.",
    });

    return { ok: false, reason: "unavailable" };
  } finally {
    clearTimeout(timeoutId);
  }
};

const readAttachmentAsync = async (
  formData: FormData
): Promise<
  | { ok: true; buffer: Buffer | null; extension: string | null; mime: string | null }
  | { ok: false; fieldErrors: FieldErrorMap; message: string }
> => {
  const attachment = formData.get("attachment");

  if (!(attachment instanceof File) || attachment.size === 0) {
    return { ok: true, buffer: null, extension: null, mime: null };
  }

  if (attachment.size > maxAttachmentBytes) {
    return {
      fieldErrors: { attachment: "File too large (max 5 MB)." },
      message: "Validation failed.",
      ok: false,
    };
  }

  if (!allowedMimeTypes.includes(attachment.type)) {
    return {
      fieldErrors: { attachment: "Unsupported file type." },
      message: "Validation failed.",
      ok: false,
    };
  }

  const arrayBuffer = await attachment.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const head = bytes.slice(0, 16);

  if (!matchesMagicBytes(attachment.type, head)) {
    return {
      fieldErrors: { attachment: "File contents do not match declared type." },
      message: "Validation failed.",
      ok: false,
    };
  }

  return {
    buffer: Buffer.from(arrayBuffer),
    extension: attachment.type === "image/jpeg" ? "jpg" : attachment.type === "image/png" ? "png" : "webp",
    mime: attachment.type,
    ok: true,
  };
};

const uploadAttachmentAsync = async (
  supabase: SupabaseClient,
  attachment: { buffer: Buffer | null; extension: string | null; mime: string | null }
): Promise<string | null> => {
  if (attachment.buffer === null || attachment.mime === null || attachment.extension === null) {
    return null;
  }

  const objectKey = `submissions/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${attachment.extension}`;
  const { error } = await supabase.storage
    .from("contact-attachments")
    .upload(objectKey, attachment.buffer, {
      cacheControl: "3600",
      contentType: attachment.mime,
      upsert: false,
    });

  if (error !== null) {
    throw new Error(`Attachment upload failed: ${error.message}`);
  }

  return objectKey;
};

const deleteUploadedAttachmentAsync = async (
  supabase: SupabaseClient,
  attachmentPath: string | null
): Promise<void> => {
  if (attachmentPath === null) {
    return;
  }

  const { error } = await supabase.storage.from("contact-attachments").remove([attachmentPath]);

  if (error !== null) {
    console.warn("[contact-form] uploaded attachment cleanup failed", {
      error: error.message,
      path: attachmentPath,
    });
  }
};

export async function POST(request: Request): Promise<NextResponse> {
  if (!validateOrigin(request)) {
    return NextResponse.json({ message: "Invalid origin." }, { status: 403 });
  }

  if (!hasMultipartFormDataContentType(request)) {
    return NextResponse.json({ message: "Expected multipart form data." }, { status: 415 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Malformed request body." }, { status: 400 });
  }

  const rawValues: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      rawValues[key] = stripControlChars(value);
    }
  }

  const parsed = submissionSchema.safeParse(rawValues);

  if (!parsed.success) {
    return NextResponse.json(
      {
        fieldErrors: flattenZodErrors(parsed.error.issues),
        message: "Validation failed.",
      },
      { status: 400 }
    );
  }

  const submission = parsed.data;

  if (submission.elapsedMs < minHumanFillMs) {
    return NextResponse.json({ message: "Submission rejected." }, { status: 400 });
  }

  const clientIp = resolveClientIp(request);
  let turnstileResult: TurnstileValidationResult;

  try {
    turnstileResult = await validateTurnstileAsync(
      submission.turnstileToken,
      clientIp,
      request.headers.get("host")
    );
  } catch (error) {
    console.error("[contact-form] turnstile configuration failed", {
      message: error instanceof Error ? error.message : "Unknown Turnstile configuration error.",
    });

    turnstileResult = { ok: false, reason: "misconfigured" };
  }

  if (!turnstileResult.ok) {
    const status = turnstileResult.reason === "misconfigured" ? 503 : 400;

    return NextResponse.json({ message: "Verification failed." }, { status });
  }

  let supabase: SupabaseClient;
  let ipHash: string;

  try {
    supabase = buildServiceRoleClient();
    ipHash = hashIp(clientIp);
  } catch (error) {
    console.error("[contact-form] server configuration failed", {
      message: error instanceof Error ? error.message : "Unknown server configuration error.",
    });

    return NextResponse.json({ message: "Contact form is not configured." }, { status: 503 });
  }

  try {
    const rateLimitResult = await checkRateLimitAsync(supabase, ipHash);

    if (rateLimitResult !== "allowed") {
      return NextResponse.json({ message: "Too many requests." }, { status: 429 });
    }
  } catch (error) {
    console.error("[contact-form] rate limit check failed", {
      message: error instanceof Error ? error.message : "Unknown rate limit error.",
    });

    return NextResponse.json({ message: "Could not check rate limit." }, { status: 500 });
  }

  const attachment = await readAttachmentAsync(formData);

  if (!attachment.ok) {
    return NextResponse.json(
      {
        fieldErrors: attachment.fieldErrors,
        message: attachment.message,
      },
      { status: 400 }
    );
  }

  let attachmentPath: string | null = null;

  try {
    attachmentPath = await uploadAttachmentAsync(supabase, attachment);
  } catch (error) {
    console.error("[contact-form] attachment upload failed", {
      message: error instanceof Error ? error.message : "Unknown attachment upload error.",
    });

    return NextResponse.json({ message: "Attachment upload failed." }, { status: 500 });
  }

  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 500);
  const { error: insertError } = await supabase
    .from("public_contact_submissions")
    .insert({
      attachment_path: attachmentPath,
      email: submission.email,
      ip_hash: ipHash,
      message: submission.message,
      name: submission.name,
      organization: submission.organization ?? null,
      source_locale: submission.locale,
      status: "new",
      subject: submission.subject,
      user_agent: userAgent,
    });

  if (insertError !== null) {
    await deleteUploadedAttachmentAsync(supabase, attachmentPath);
    console.error("[contact-form] insert failed", {
      code: insertError.code,
      message: insertError.message,
    });

    return NextResponse.json({ message: "Could not save submission." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
