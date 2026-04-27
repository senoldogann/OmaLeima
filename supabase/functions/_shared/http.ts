export type ErrorCode =
  | "METHOD_NOT_ALLOWED"
  | "INVALID_JSON"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "INVALID_EXPO_PUSH_TOKEN"
  | "DEVICE_TOKEN_NOT_FOUND"
  | "PUSH_SEND_FAILED"
  | "EVENT_NOT_FOUND"
  | "EVENT_NOT_AVAILABLE"
  | "EVENT_ENDED"
  | "EVENT_FULL"
  | "PROFILE_NOT_ACTIVE"
  | "NOT_BUSINESS_STAFF"
  | "BUSINESS_CONTEXT_REQUIRED"
  | "INVALID_QR"
  | "INVALID_QR_TYPE"
  | "QR_EXPIRED"
  | "INTERNAL_ERROR";

export type ErrorResponse = {
  status: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export type JsonObject = Record<string, unknown>;

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

export const errorResponse = (
  status: number,
  code: ErrorCode,
  message: string,
  details: Record<string, unknown>,
): Response => jsonResponse({ status: code, message, details }, status);

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
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor !== null && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip");
};
