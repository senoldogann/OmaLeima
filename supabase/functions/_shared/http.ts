import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type ErrorCode =
  | "METHOD_NOT_ALLOWED"
  | "INVALID_JSON"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "INVALID_EXPO_PUSH_TOKEN"
  | "DEVICE_TOKEN_NOT_FOUND"
  | "PUSH_SEND_FAILED"
  | "NOTIFICATION_NOT_ALLOWED"
  | "NOTIFICATION_RECIPIENTS_NOT_FOUND"
  | "ANNOUNCEMENT_NOT_FOUND"
  | "ANNOUNCEMENT_NOT_ACTIVE"
  | "ANNOUNCEMENT_PUSH_NOT_ALLOWED"
  | "ANNOUNCEMENT_ALREADY_SENT"
  | "PROMOTION_NOT_FOUND"
  | "PROMOTION_NOT_ACTIVE"
  | "PROMOTION_EVENT_REQUIRED"
  | "PROMOTION_NOT_JOINED_EVENT"
  | "PROMOTION_ALREADY_SENT"
  | "PROMOTION_LIMIT_REACHED"
  | "SUPPORT_REQUEST_NOT_FOUND"
  | "EVENT_NOT_FOUND"
  | "EVENT_NOT_AVAILABLE"
  | "EVENT_ENDED"
  | "EVENT_FULL"
  | "EVENT_REGISTRATION_CLOSED"
  | "INSTALLATION_ID_REQUIRED"
  | "INSTALLATION_ID_TOO_LONG"
  | "PROFILE_NOT_ACTIVE"
  | "PROFILE_NOT_FOUND"
  | "ROLE_NOT_ALLOWED"
  | "STUDENT_BANNED"
  | "NOT_BUSINESS_STAFF"
  | "BUSINESS_CONTEXT_REQUIRED"
  | "ACTOR_NOT_ALLOWED"
  | "BUSINESS_NOT_FOUND"
  | "SCANNER_DEVICE_NOT_FOUND"
  | "SCANNER_DEVICE_NOT_ALLOWED"
  | "SELF_REVOKE_NOT_ALLOWED"
  | "INVALID_QR"
  | "INVALID_QR_TYPE"
  | "QR_CONTEXT_MISMATCH"
  | "QR_EXPIRED"
  | "QR_ALREADY_USED"
  | "QR_RATE_LIMITED"
  | "QR_INVALID"
  | "QR_NOT_FOUND"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type ErrorResponse = {
  status: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export type JsonObject = Record<string, unknown>;

export type EdgeActorRateLimitOptions = {
  dayMaxRequests: number;
  windowMaxRequests: number;
  windowSeconds: number;
};

type EdgeRateLimitRpcResponse = {
  limit?: unknown;
  remainingInWindow?: unknown;
  remainingToday?: unknown;
  retryAfterSeconds?: unknown;
  scope?: unknown;
  status?: unknown;
  windowSeconds?: unknown;
};

export const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const jsonResponse = (body: JsonObject, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const isSensitiveErrorDetailKey = (key: string): boolean => {
  const normalizedKey = key.toLowerCase();

  return (
    normalizedKey === "error" ||
    normalizedKey.endsWith("error") ||
    normalizedKey.includes("errorcode") ||
    normalizedKey.includes("errormessage") ||
    normalizedKey.includes("secret") ||
    normalizedKey.includes("password") ||
    normalizedKey.includes("token") ||
    normalizedKey === "id" ||
    normalizedKey.endsWith("id") ||
    /(^|[_-])ids?$/i.test(key) ||
    /Ids?$/.test(key)
  );
};

const sanitizeErrorDetailValue = (key: string, value: unknown): unknown => {
  if (isSensitiveErrorDetailKey(key)) {
    return typeof value === "undefined" || value === null ? value : "redacted";
  }

  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "object" && item !== null ? sanitizeErrorDetails(item as Record<string, unknown>) : item));
  }

  if (typeof value === "object" && value !== null) {
    return sanitizeErrorDetails(value as Record<string, unknown>);
  }

  return value;
};

const sanitizeErrorDetails = (details: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(details).map(([key, value]) => [key, sanitizeErrorDetailValue(key, value)]));

export const errorResponse = (
  status: number,
  code: ErrorCode,
  message: string,
  details: Record<string, unknown>,
): Response => jsonResponse({ status: code, message, details: sanitizeErrorDetails(details) }, status);

const readRetryAfterSeconds = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 60;
  }

  return Math.max(1, Math.ceil(value));
};

const readRateLimitStatus = (value: unknown): string | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const response = value as EdgeRateLimitRpcResponse;

  return typeof response.status === "string" ? response.status : null;
};

export const enforceEdgeActorRateLimitAsync = async (
  supabase: SupabaseClient,
  actorUserId: string,
  scope: string,
  options: EdgeActorRateLimitOptions,
): Promise<Response | null> => {
  const { data, error } = await supabase.rpc("check_dashboard_mutation_rate_limit", {
    p_actor_user_id: actorUserId,
    p_day_max_requests: options.dayMaxRequests,
    p_scope: scope,
    p_window_max_requests: options.windowMaxRequests,
    p_window_seconds: options.windowSeconds,
  });

  if (error !== null) {
    return errorResponse(500, "INTERNAL_ERROR", "Failed to check endpoint rate limit.", {
      actorUserId,
      rateLimitError: error.message,
      rateLimitErrorCode: error.code,
      scope,
    });
  }

  const status = readRateLimitStatus(data);

  if (status === "ALLOWED") {
    return null;
  }

  if (status === "RATE_LIMITED") {
    const response = data as EdgeRateLimitRpcResponse;
    const retryAfterSeconds = readRetryAfterSeconds(response.retryAfterSeconds);

    return jsonResponse(
      {
        message: "Too many push requests. Please wait and try again.",
        retryAfterSeconds,
        status: "RATE_LIMITED",
      },
      429,
    );
  }

  return errorResponse(500, "INTERNAL_ERROR", "Endpoint rate limit returned an unexpected status.", {
    actorUserId,
    rateLimitStatus: status,
    scope,
  });
};

export const optionsResponse = (): Response => new Response("ok", { headers: corsHeaders });

export const assertPostRequest = (request: Request): Response | null => {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  if (request.method !== "POST") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "Only POST requests are allowed.", {
      method: request.method,
    });
  }

  return null;
};

export const readJsonBody = async (request: Request): Promise<JsonObject> => {
  try {
    const body: unknown = await request.json();

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new Error("Request body must be a JSON object.");
    }

    return body as JsonObject;
  } catch (error) {
    throw new Error(`Invalid JSON body: ${error instanceof Error ? error.message : "unknown error"}`);
  }
};

export const getBearerToken = (request: Request): string | null => {
  const authorization = request.headers.get("Authorization");

  if (authorization === null) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || typeof token !== "string" || token.length === 0) {
    return null;
  }

  return token;
};

export const getClientIp = (request: Request): string | null => {
  // Supabase Edge sits behind platform-managed proxies, so forwarded IP headers are expected to be injected upstream.
  // We still use this only for fraud telemetry and never as an authorization primitive.
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor !== null && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip");
};
