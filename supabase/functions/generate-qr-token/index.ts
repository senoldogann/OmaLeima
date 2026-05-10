import { errorResponse, getBearerToken, jsonResponse, readJsonBody, assertPostRequest } from "../_shared/http.ts";
import { readRuntimeEnv } from "../_shared/env.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";
import { qrRefreshAfterSeconds, signQrToken } from "../_shared/qrJwt.ts";
import { isUuid } from "../_shared/validation.ts";

type GenerateQrTokenRequest = {
  eventId: string;
};

type ProfileRow = {
  id: string;
  status: string;
};

type EventRow = {
  id: string;
  status: string;
  end_at: string;
};

type EventRegistrationRow = {
  id: string;
  status: "REGISTERED" | "CANCELLED" | "BANNED";
};

type RegisterEventAtomicResult = {
  status:
    | "SUCCESS"
    | "ALREADY_REGISTERED"
    | "AUTH_REQUIRED"
    | "ACTOR_NOT_ALLOWED"
    | "PROFILE_NOT_FOUND"
    | "PROFILE_NOT_ACTIVE"
    | "ROLE_NOT_ALLOWED"
    | "EVENT_NOT_FOUND"
    | "EVENT_NOT_AVAILABLE"
    | "EVENT_REGISTRATION_CLOSED"
    | "EVENT_FULL"
    | "STUDENT_BANNED";
  registrationId?: string;
  startAt?: string;
  joinDeadlineAt?: string;
  maxParticipants?: number;
  currentRegistrations?: number;
};

type RateLimitResult =
  | {
      status: "ALLOWED";
      remainingInWindow?: number;
      remainingToday?: number;
    }
  | {
      status: "RATE_LIMITED";
      retryAfterSeconds?: number;
      windowSeconds?: number;
      limit?: number;
    };

const qrGenerationWindowSeconds = 20;
const qrGenerationWindowMaxRequests = 12;
const qrGenerationDayMaxRequests = 4000;

const parseRequestBody = (body: Record<string, unknown>): GenerateQrTokenRequest => {
  if (!isUuid(body.eventId)) {
    throw new Error("eventId must be a valid UUID.");
  }

  return {
    eventId: body.eventId,
  };
};

Deno.serve(async (request: Request): Promise<Response> => {
  const methodResponse = assertPostRequest(request);

  if (methodResponse !== null) {
    return methodResponse;
  }

  try {
    const env = readRuntimeEnv();
    const authToken = getBearerToken(request);

    if (authToken === null) {
      return errorResponse(401, "UNAUTHORIZED", "Missing or invalid Authorization bearer token.", {});
    }

    const body = parseRequestBody(await readJsonBody(request));
    const supabase = createServiceClient(env);
    const authResult = await getAuthenticatedUser(supabase, authToken);

    if (!authResult.ok) {
      return errorResponse(401, "UNAUTHORIZED", "Invalid Supabase access token.", {
        authError: authResult.message,
      });
    }

    const { user } = authResult.value;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,status")
      .eq("id", user.id)
      .single<ProfileRow>();

    if (profileError !== null || profile === null) {
      return errorResponse(403, "FORBIDDEN", "User profile was not found.", {
        userId: user.id,
        profileError: profileError?.message,
      });
    }

    if (profile.status !== "ACTIVE") {
      return errorResponse(403, "PROFILE_NOT_ACTIVE", "User profile is not active.", {
        userId: user.id,
        profileStatus: profile.status,
      });
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id,status,end_at")
      .eq("id", body.eventId)
      .single<EventRow>();

    if (eventError !== null || event === null) {
      return errorResponse(404, "EVENT_NOT_FOUND", "Event was not found.", {
        eventId: body.eventId,
        eventError: eventError?.message,
      });
    }

    if (!["PUBLISHED", "ACTIVE"].includes(event.status)) {
      return errorResponse(400, "EVENT_NOT_AVAILABLE", "Event is not available for QR generation.", {
        eventId: event.id,
        eventStatus: event.status,
      });
    }

    if (Date.now() > new Date(event.end_at).getTime()) {
      return errorResponse(400, "EVENT_ENDED", "Event has already ended.", {
        eventId: event.id,
        eventEndAt: event.end_at,
      });
    }

    const { data: registration, error: registrationError } = await supabase
      .from("event_registrations")
      .select("id,status")
      .eq("event_id", event.id)
      .eq("student_id", user.id)
      .maybeSingle<EventRegistrationRow>();

    if (registrationError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read event registration.", {
        eventId: event.id,
        userId: user.id,
        registrationError: registrationError.message,
      });
    }

    if (registration?.status === "BANNED") {
      return errorResponse(403, "STUDENT_BANNED", "Student is banned from this event.", {
        eventId: event.id,
        userId: user.id,
      });
    }

    if (registration === null || registration.status === "CANCELLED") {
      const { data: registerResult, error: registerError } = await supabase.rpc("register_event_atomic", {
        p_event_id: event.id,
        p_student_id: user.id,
      });

      if (registerError !== null) {
        return errorResponse(500, "INTERNAL_ERROR", "Failed to register student for event.", {
          eventId: event.id,
          userId: user.id,
          registerError: registerError.message,
          registerErrorCode: registerError.code,
        });
      }

      const parsedResult = registerResult as RegisterEventAtomicResult | null;

      if (parsedResult === null) {
        return errorResponse(500, "INTERNAL_ERROR", "Registration RPC returned no data.", {
          eventId: event.id,
          userId: user.id,
        });
      }

      if (parsedResult.status === "EVENT_FULL") {
        return errorResponse(400, "EVENT_FULL", "Event is full.", {
          eventId: event.id,
          maxParticipants: parsedResult.maxParticipants,
          currentRegistrations: parsedResult.currentRegistrations,
        });
      }

      if (parsedResult.status === "EVENT_REGISTRATION_CLOSED") {
        return errorResponse(400, "EVENT_REGISTRATION_CLOSED", "Event registration is closed.", {
          eventId: event.id,
          startAt: parsedResult.startAt,
          joinDeadlineAt: parsedResult.joinDeadlineAt,
        });
      }

      if (parsedResult.status === "STUDENT_BANNED") {
        return errorResponse(403, "STUDENT_BANNED", "Student is banned from this event.", {
          eventId: event.id,
          userId: user.id,
        });
      }

      if (parsedResult.status === "PROFILE_NOT_ACTIVE" || parsedResult.status === "ROLE_NOT_ALLOWED") {
        return errorResponse(403, parsedResult.status, "Student profile is not allowed to register for this event.", {
          eventId: event.id,
          userId: user.id,
        });
      }

      if (parsedResult.status === "AUTH_REQUIRED" || parsedResult.status === "ACTOR_NOT_ALLOWED") {
        return errorResponse(401, "UNAUTHORIZED", "Student registration RPC rejected the caller.", {
          eventId: event.id,
          userId: user.id,
          registrationStatus: parsedResult.status,
        });
      }

      if (parsedResult.status === "EVENT_NOT_FOUND" || parsedResult.status === "EVENT_NOT_AVAILABLE") {
        return errorResponse(400, parsedResult.status, "Event is not available for registration.", {
          eventId: event.id,
        });
      }

      if (parsedResult.status !== "SUCCESS" && parsedResult.status !== "ALREADY_REGISTERED") {
        return errorResponse(500, "INTERNAL_ERROR", "Registration RPC returned an unexpected status.", {
          eventId: event.id,
          userId: user.id,
          registrationStatus: parsedResult.status,
        });
      }
    }

    const { data: rateLimitResult, error: rateLimitError } = await supabase.rpc("check_generate_qr_token_rate_limit", {
      p_actor_user_id: user.id,
      p_event_id: event.id,
      p_window_seconds: qrGenerationWindowSeconds,
      p_window_max_requests: qrGenerationWindowMaxRequests,
      p_day_max_requests: qrGenerationDayMaxRequests,
    });

    if (rateLimitError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to check QR generation rate limit.", {
        userId: user.id,
        eventId: event.id,
        rateLimitError: rateLimitError.message,
        rateLimitErrorCode: rateLimitError.code,
      });
    }

    const parsedRateLimitResult = rateLimitResult as RateLimitResult | null;

    if (parsedRateLimitResult === null) {
      return errorResponse(500, "INTERNAL_ERROR", "QR generation rate limit returned no data.", {
        userId: user.id,
        eventId: event.id,
      });
    }

    if (parsedRateLimitResult.status === "RATE_LIMITED") {
      return errorResponse(429, "QR_RATE_LIMITED", "QR generation is temporarily rate limited.", {
        userId: user.id,
        eventId: event.id,
        retryAfterSeconds: parsedRateLimitResult.retryAfterSeconds,
        windowSeconds: parsedRateLimitResult.windowSeconds,
        limit: parsedRateLimitResult.limit,
      });
    }

    const signedToken = await signQrToken(env.qrSigningSecret, user.id, event.id);

    return jsonResponse({
      qrPayload: {
        v: 1,
        type: "LEIMA_STAMP_QR",
        token: signedToken.token,
      },
      expiresAt: signedToken.expiresAt,
      refreshAfterSeconds: qrRefreshAfterSeconds,
    }, 200);
  } catch (error) {
    return errorResponse(400, "VALIDATION_ERROR", "Failed to generate QR token.", {
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
});
