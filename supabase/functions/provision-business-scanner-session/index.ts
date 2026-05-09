import { verifyBusinessScannerLoginToken } from "../_shared/businessScannerLoginJwt.ts";
import { readRuntimeEnv } from "../_shared/env.ts";
import { assertPostRequest, errorResponse, getBearerToken, jsonResponse, readJsonBody, type ErrorCode } from "../_shared/http.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";

type ProvisionBusinessScannerSessionRequest = {
  deviceModel: string | null;
  installationId: string;
  label: string | null;
  platform: ScannerPlatform;
  qrToken: string;
};

type ScannerPlatform = "ANDROID" | "IOS" | "UNKNOWN" | "WEB";

type ProvisionBusinessScannerDeviceResult =
  | {
      status: "SUCCESS";
      businessId: string;
      scannerDeviceId: string;
      label: string;
      platform: "ANDROID" | "IOS" | "UNKNOWN" | "WEB";
      pinRequired: boolean;
    }
  | {
      status:
        | "ACTOR_NOT_ALLOWED"
        | "INSTALLATION_ID_REQUIRED"
        | "INSTALLATION_ID_TOO_LONG"
        | "PROFILE_NOT_FOUND"
        | "QR_ALREADY_USED"
        | "QR_CONTEXT_MISMATCH"
        | "QR_EXPIRED"
        | "QR_INVALID"
        | "QR_NOT_FOUND";
    };

const validPlatforms = new Set<ScannerPlatform>(["ANDROID", "IOS", "UNKNOWN", "WEB"]);

const isScannerPlatform = (value: unknown): value is ScannerPlatform =>
  typeof value === "string" && validPlatforms.has(value as ScannerPlatform);

const parseRequestBody = (body: Record<string, unknown>): ProvisionBusinessScannerSessionRequest => {
  if (typeof body.qrToken !== "string" || body.qrToken.length === 0) {
    throw new Error("qrToken is required.");
  }

  if (typeof body.installationId !== "string" || body.installationId.length === 0) {
    throw new Error("installationId is required.");
  }

  if (!isScannerPlatform(body.platform)) {
    throw new Error("platform must be IOS, ANDROID, WEB, or UNKNOWN.");
  }

  if (typeof body.label !== "string" && body.label !== null && typeof body.label !== "undefined") {
    throw new Error("label must be a string when provided.");
  }

  if (typeof body.deviceModel !== "string" && body.deviceModel !== null && typeof body.deviceModel !== "undefined") {
    throw new Error("deviceModel must be a string when provided.");
  }

  return {
    qrToken: body.qrToken,
    deviceModel: typeof body.deviceModel === "string" ? body.deviceModel : null,
    installationId: body.installationId,
    platform: body.platform,
    label: typeof body.label === "string" ? body.label : null,
  };
};

const isProvisionBusinessScannerDeviceResult = (value: unknown): value is ProvisionBusinessScannerDeviceResult => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.status === "SUCCESS") {
    return (
      typeof candidate.businessId === "string" &&
      typeof candidate.scannerDeviceId === "string" &&
      typeof candidate.label === "string" &&
      typeof candidate.pinRequired === "boolean" &&
      typeof candidate.platform === "string"
    );
  }

  return typeof candidate.status === "string";
};

type ProvisioningFailureStatus = Exclude<ProvisionBusinessScannerDeviceResult["status"], "SUCCESS">;

const resolveProvisioningFailureStatusCode = (status: ProvisioningFailureStatus): number => {
  if (status === "ACTOR_NOT_ALLOWED") {
    return 403;
  }

  if (status === "PROFILE_NOT_FOUND") {
    return 409;
  }

  return 400;
};

const resolveProvisioningFailureMessage = (status: ProvisioningFailureStatus): string => {
  switch (status) {
    case "ACTOR_NOT_ALLOWED":
      return "The owner QR is no longer allowed to provision scanner access.";
    case "INSTALLATION_ID_REQUIRED":
      return "Scanner device installation id is missing.";
    case "INSTALLATION_ID_TOO_LONG":
      return "Scanner device installation id is too long.";
    case "PROFILE_NOT_FOUND":
      return "Anonymous scanner profile was not created before provisioning.";
    case "QR_ALREADY_USED":
      return "This scanner QR was already used. Ask the owner to show a fresh QR.";
    case "QR_CONTEXT_MISMATCH":
      return "Scanner QR context does not match the approved business.";
    case "QR_EXPIRED":
      return "Scanner QR expired. Ask the owner to show a fresh QR.";
    case "QR_INVALID":
      return "Scanner QR is invalid.";
    case "QR_NOT_FOUND":
      return "Scanner QR grant was not found. Ask the owner to show a fresh QR.";
  }
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

    const verifiedToken = await verifyBusinessScannerLoginToken(env.qrSigningSecret, body.qrToken);

    if (!verifiedToken.ok) {
      return errorResponse(400, verifiedToken.status, verifiedToken.message, {});
    }

    const { user } = authResult.value;
    const { data: provisionResult, error: provisionError } = await supabase.rpc(
      "provision_business_scanner_device_atomic",
      {
        p_business_id: verifiedToken.payload.businessId,
        p_device_model: body.deviceModel,
        p_installation_id: body.installationId,
        p_issued_by: verifiedToken.payload.sub,
        p_jti: verifiedToken.payload.jti,
        p_label: body.label,
        p_platform: body.platform,
        p_scanner_user_id: user.id,
      },
    );

    if (provisionError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to provision scanner device.", {
        businessId: verifiedToken.payload.businessId,
        scannerUserId: user.id,
        provisionError: provisionError.message,
      });
    }

    if (!isProvisionBusinessScannerDeviceResult(provisionResult)) {
      return errorResponse(500, "INTERNAL_ERROR", "Provisioning RPC returned an invalid response.", {
        businessId: verifiedToken.payload.businessId,
        scannerUserId: user.id,
      });
    }

    if (provisionResult.status !== "SUCCESS") {
      const provisioningStatus = provisionResult.status;

      return errorResponse(resolveProvisioningFailureStatusCode(provisioningStatus), provisioningStatus as ErrorCode, resolveProvisioningFailureMessage(provisioningStatus), {
        businessId: verifiedToken.payload.businessId,
        scannerUserId: user.id,
        provisionStatus: provisioningStatus,
      });
    }

    return jsonResponse({
      status: "SUCCESS",
      businessId: provisionResult.businessId,
      scannerDeviceId: provisionResult.scannerDeviceId,
      label: provisionResult.label,
      platform: provisionResult.platform,
      pinRequired: provisionResult.pinRequired,
      homeHref: "/business/scanner",
    }, 200);
  } catch (error) {
    return errorResponse(400, "VALIDATION_ERROR", "Failed to provision business scanner session.", {
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
});
