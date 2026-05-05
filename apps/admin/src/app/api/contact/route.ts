import { createHash, randomUUID } from "node:crypto";

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { z } from "zod";

import { contactSubjectValues } from "@/features/public-site/contact-content";
import { publicEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Genel sınırlar */
const maxAttachmentBytes = 5 * 1024 * 1024;
const minHumanFillMs = 1500;
const rateLimitWindowMs = 60_000;
const rateLimitMaxRequests = 3;
const rateLimitDailyMax = 12;

const allowedMimeTypes: ReadonlyArray<string> = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

/* Manyetik bayt imzaları (magic bytes) — MIME doğrulamasını destekler */
const magicByteSignatures: ReadonlyArray<{
    mime: string;
    prefix: ReadonlyArray<number>;
}> = [
        { mime: "image/jpeg", prefix: [0xff, 0xd8, 0xff] },
        { mime: "image/png", prefix: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
        { mime: "image/webp", prefix: [0x52, 0x49, 0x46, 0x46] },
    ];

const matchesMagicBytes = (mime: string, head: Uint8Array): boolean => {
    const signature = magicByteSignatures.find((entry) => entry.mime === mime);

    if (!signature) {
        return false;
    }

    if (head.length < signature.prefix.length) {
        return false;
    }

    return signature.prefix.every((byte, index) => head[index] === byte);
};

/* Bellekte basit kayan pencere oran sınırlayıcısı (per process) */
type RateLimitBuckets = {
    daily: number[];
    recent: number[];
};

const rateLimitStore: Map<string, RateLimitBuckets> = new Map();

const checkRateLimit = (key: string): boolean => {
    const now = Date.now();
    const dayWindow = 24 * 60 * 60 * 1000;
    const buckets = rateLimitStore.get(key) ?? { daily: [], recent: [] };

    buckets.recent = buckets.recent.filter((ts) => now - ts < rateLimitWindowMs);
    buckets.daily = buckets.daily.filter((ts) => now - ts < dayWindow);

    if (buckets.recent.length >= rateLimitMaxRequests) {
        rateLimitStore.set(key, buckets);
        return false;
    }

    if (buckets.daily.length >= rateLimitDailyMax) {
        rateLimitStore.set(key, buckets);
        return false;
    }

    buckets.recent.push(now);
    buckets.daily.push(now);
    rateLimitStore.set(key, buckets);
    return true;
};

const stripControlChars = (value: string): string =>
    value.replace(/[\u0000-\u001f\u007f]/g, "").trim();

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
    website: z.string().max(0, "Honeypot triggered."),
});

type SubmissionPayload = z.infer<typeof submissionSchema>;

const hashIp = (ip: string): string =>
    createHash("sha256").update(`omaleima:${ip}`).digest("hex");

const resolveClientIp = (request: Request): string => {
    const forwarded = request.headers.get("x-forwarded-for");

    if (forwarded) {
        const first = forwarded.split(",")[0]?.trim();

        if (first) {
            return first;
        }
    }

    return request.headers.get("x-real-ip") ?? "unknown";
};

const buildAnonClient = () =>
    createServerClient(
        publicEnv.NEXT_PUBLIC_SUPABASE_URL,
        publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        {
            cookies: {
                getAll() {
                    return [];
                },
                setAll() {
                    // İletişim formu çağrısı oturum çerezi yazmaz.
                },
            },
        },
    );

type FieldErrorMap = Partial<Record<keyof SubmissionPayload | "attachment", string>>;

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

export async function POST(request: Request) {
    /* Origin kontrolü — basit CSRF önlemi */
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    if (origin && host) {
        try {
            const originHost = new URL(origin).host;

            if (originHost !== host) {
                return NextResponse.json(
                    { message: "Invalid origin." },
                    { status: 403 },
                );
            }
        } catch {
            return NextResponse.json(
                { message: "Invalid origin." },
                { status: 403 },
            );
        }
    }

    /* Oran sınırlayıcı */
    const clientIp = resolveClientIp(request);
    const ipHash = hashIp(clientIp);

    if (!checkRateLimit(ipHash)) {
        return NextResponse.json(
            { message: "Too many requests." },
            { status: 429 },
        );
    }

    /* FormData okuma */
    let formData: FormData;

    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json(
            { message: "Malformed request body." },
            { status: 400 },
        );
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
            { status: 400 },
        );
    }

    const submission = parsed.data;

    /* İnsan davranışı kontrolü — formu çok hızlı doldurmak bot belirtisi */
    if (submission.elapsedMs < minHumanFillMs) {
        return NextResponse.json(
            { message: "Submission rejected." },
            { status: 400 },
        );
    }

    /* Dosya doğrulama */
    const attachment = formData.get("attachment");
    let attachmentPath: string | null = null;
    let attachmentBuffer: Buffer | null = null;
    let attachmentMime: string | null = null;
    let attachmentExt: string | null = null;

    if (attachment instanceof File && attachment.size > 0) {
        if (attachment.size > maxAttachmentBytes) {
            return NextResponse.json(
                {
                    fieldErrors: { attachment: "File too large (max 5 MB)." },
                    message: "Validation failed.",
                },
                { status: 400 },
            );
        }

        if (!allowedMimeTypes.includes(attachment.type)) {
            return NextResponse.json(
                {
                    fieldErrors: { attachment: "Unsupported file type." },
                    message: "Validation failed.",
                },
                { status: 400 },
            );
        }

        const arrayBuffer = await attachment.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const head = bytes.slice(0, 16);

        if (!matchesMagicBytes(attachment.type, head)) {
            return NextResponse.json(
                {
                    fieldErrors: { attachment: "File contents do not match declared type." },
                    message: "Validation failed.",
                },
                { status: 400 },
            );
        }

        attachmentBuffer = Buffer.from(arrayBuffer);
        attachmentMime = attachment.type;
        attachmentExt =
            attachment.type === "image/jpeg"
                ? "jpg"
                : attachment.type === "image/png"
                    ? "png"
                    : "webp";
    }

    const supabase = buildAnonClient();

    /* Liyi yükleme — dosya varsa Storage'a koy, yola al */
    if (attachmentBuffer && attachmentMime && attachmentExt) {
        const objectKey = `submissions/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${attachmentExt}`;

        const { error: uploadError } = await supabase.storage
            .from("contact-attachments")
            .upload(objectKey, attachmentBuffer, {
                cacheControl: "3600",
                contentType: attachmentMime,
                upsert: false,
            });

        if (uploadError) {
            console.error("[contact-form] attachment upload failed", {
                error: uploadError.message,
            });

            return NextResponse.json(
                { message: "Attachment upload failed." },
                { status: 500 },
            );
        }

        attachmentPath = objectKey;
    }

    /* Veritabanına kayıt */
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

    if (insertError) {
        console.error("[contact-form] insert failed", {
            code: insertError.code,
            message: insertError.message,
        });

        return NextResponse.json(
            { message: "Could not save submission." },
            { status: 500 },
        );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
}
