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
  max_participants: number | null;
};

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
      .select("id,status,end_at,max_participants")
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
      .maybeSingle();

    if (registrationError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read event registration.", {
        eventId: event.id,
        userId: user.id,
        registrationError: registrationError.message,
      });
    }

    if (registration === null) {
      if (event.max_participants !== null) {
        const { count, error: countError } = await supabase
          .from("event_registrations")
          .select("id", { count: "exact", head: true })
          .eq("event_id", event.id)
          .eq("status", "REGISTERED");

        if (countError !== null) {
          return errorResponse(500, "INTERNAL_ERROR", "Failed to count event registrations.", {
            eventId: event.id,
            countError: countError.message,
          });
        }

        if (typeof count === "number" && count >= event.max_participants) {
          return errorResponse(400, "EVENT_FULL", "Event is full.", {
            eventId: event.id,
            maxParticipants: event.max_participants,
            currentRegistrations: count,
          });
        }
      }

      const { error: insertError } = await supabase
        .from("event_registrations")
        .insert({
          event_id: event.id,
          student_id: user.id,
          status: "REGISTERED",
        });

      if (insertError !== null && insertError.code !== "23505") {
        return errorResponse(500, "INTERNAL_ERROR", "Failed to register student for event.", {
          eventId: event.id,
          userId: user.id,
          insertError: insertError.message,
          insertErrorCode: insertError.code,
        });
      }
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
