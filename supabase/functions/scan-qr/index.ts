import {
  errorResponse,
  getBearerToken,
  getClientIp,
  jsonResponse,
  readJsonBody,
  assertPostRequest,
} from "../_shared/http.ts";
import { readRuntimeEnv } from "../_shared/env.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";
import { verifyQrToken } from "../_shared/qrJwt.ts";
import { isOptionalLatitude, isOptionalLongitude, isOptionalUuid, isString } from "../_shared/validation.ts";

type ScannerLocation = {
  latitude: number | null;
  longitude: number | null;
};

type ScanQrRequest = {
  qrToken: string;
  businessId: string | undefined;
  scannerDeviceId: string | null;
  scannerLocation: ScannerLocation;
};

type BusinessStaffRow = {
  business_id: string;
};

type ScanStampResult = {
  status: string;
  stampId?: string;
  stampCount?: number;
};

const responseMessages: Record<string, string> = {
  SUCCESS: "Leima added successfully.",
  EVENT_NOT_FOUND: "Event was not found.",
  EVENT_NOT_ACTIVE: "Event is not active.",
  STUDENT_NOT_REGISTERED: "Student is not registered for this event.",
  VENUE_NOT_IN_EVENT: "Venue is not part of this event.",
  VENUE_JOINED_TOO_LATE: "Venue joined this event too late.",
  BUSINESS_STAFF_NOT_ALLOWED: "Scanner is not allowed to scan for this business.",
  QR_ALREADY_USED_OR_REPLAYED: "QR code was already used.",
  ALREADY_STAMPED: "This student already has a leima from this venue for this event.",
};

const parseScannerLocation = (value: unknown): ScannerLocation => {
  if (typeof value === "undefined" || value === null) {
    return {
      latitude: null,
      longitude: null,
    };
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("scannerLocation must be an object when provided.");
  }

  const location = value as Record<string, unknown>;

  if (!isOptionalLatitude(location.latitude)) {
    throw new Error("scannerLocation.latitude must be between -90 and 90.");
  }

  if (!isOptionalLongitude(location.longitude)) {
    throw new Error("scannerLocation.longitude must be between -180 and 180.");
  }

  return {
    latitude: location.latitude ?? null,
    longitude: location.longitude ?? null,
  };
};

const parseRequestBody = (body: Record<string, unknown>): ScanQrRequest => {
  if (!isString(body.qrToken)) {
    throw new Error("qrToken must be a non-empty string.");
  }

  if (!isOptionalUuid(body.businessId)) {
    throw new Error("businessId must be a valid UUID when provided.");
  }

  if (typeof body.scannerDeviceId !== "undefined" && body.scannerDeviceId !== null && !isString(body.scannerDeviceId)) {
    throw new Error("scannerDeviceId must be a non-empty string when provided.");
  }

  return {
    qrToken: body.qrToken,
    businessId: body.businessId,
    scannerDeviceId: body.scannerDeviceId ?? null,
    scannerLocation: parseScannerLocation(body.scannerLocation),
  };
};

const resolveBusinessId = (rows: BusinessStaffRow[], requestedBusinessId: string | undefined): string | null => {
  if (typeof requestedBusinessId === "string") {
    const match = rows.find((row: BusinessStaffRow): boolean => row.business_id === requestedBusinessId);
    return typeof match === "undefined" ? null : match.business_id;
  }

  if (rows.length === 1) {
    return rows[0].business_id;
  }

  return null;
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
    const verifiedQrToken = await verifyQrToken(env.qrSigningSecret, body.qrToken);

    if (!verifiedQrToken.ok) {
      return errorResponse(
        verifiedQrToken.status === "QR_EXPIRED" ? 400 : 400,
        verifiedQrToken.status,
        verifiedQrToken.message,
        {},
      );
    }

    const { data: businessStaffRows, error: businessStaffError } = await supabase
      .from("business_staff")
      .select("business_id")
      .eq("user_id", user.id)
      .eq("status", "ACTIVE")
      .returns<BusinessStaffRow[]>();

    if (businessStaffError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read business staff membership.", {
        scannerUserId: user.id,
        businessStaffError: businessStaffError.message,
      });
    }

    if (businessStaffRows.length === 0) {
      return errorResponse(403, "NOT_BUSINESS_STAFF", "Authenticated user is not active business staff.", {
        scannerUserId: user.id,
      });
    }

    const businessId = resolveBusinessId(businessStaffRows, body.businessId);

    if (businessId === null) {
      return errorResponse(400, "BUSINESS_CONTEXT_REQUIRED", "Business context is required or not allowed.", {
        scannerUserId: user.id,
        requestedBusinessId: body.businessId,
        activeBusinessCount: businessStaffRows.length,
      });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc("scan_stamp_atomic", {
      p_event_id: verifiedQrToken.payload.eventId,
      p_student_id: verifiedQrToken.payload.sub,
      p_qr_jti: verifiedQrToken.payload.jti,
      p_business_id: businessId,
      p_scanner_user_id: user.id,
      p_scanner_device_id: body.scannerDeviceId,
      p_scanner_latitude: body.scannerLocation.latitude,
      p_scanner_longitude: body.scannerLocation.longitude,
      p_ip: getClientIp(request),
      p_user_agent: request.headers.get("user-agent"),
    });

    if (rpcError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to scan QR token.", {
        rpcError: rpcError.message,
        rpcErrorCode: rpcError.code,
      });
    }

    const result = rpcResult as ScanStampResult;

    return jsonResponse({
      ...result,
      message: responseMessages[result.status] ?? "QR scan completed.",
    }, 200);
  } catch (error) {
    return errorResponse(400, "VALIDATION_ERROR", "Failed to scan QR token.", {
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
});
