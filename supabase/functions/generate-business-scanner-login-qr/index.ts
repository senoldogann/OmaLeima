import { businessScannerLoginRefreshAfterSeconds, signBusinessScannerLoginToken } from "../_shared/businessScannerLoginJwt.ts";
import { readRuntimeEnv } from "../_shared/env.ts";
import { assertPostRequest, errorResponse, getBearerToken, jsonResponse, readJsonBody } from "../_shared/http.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";
import { isUuid } from "../_shared/validation.ts";

type GenerateBusinessScannerLoginQrRequest = {
  businessId: string;
};

type BusinessStaffRow = {
  role: "MANAGER" | "OWNER" | "SCANNER";
  status: "ACTIVE" | "DISABLED";
};

type BusinessRow = {
  id: string;
  name: string;
  status: "ACTIVE" | "DELETED" | "SUSPENDED";
};

const parseRequestBody = (body: Record<string, unknown>): GenerateBusinessScannerLoginQrRequest => {
  if (!isUuid(body.businessId)) {
    throw new Error("businessId must be a valid UUID.");
  }

  return {
    businessId: body.businessId,
  };
};

const canIssueScannerQr = (staff: BusinessStaffRow | null): boolean =>
  staff !== null && staff.status === "ACTIVE" && (staff.role === "OWNER" || staff.role === "MANAGER");

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
    const [{ data: business, error: businessError }, { data: staff, error: staffError }] = await Promise.all([
      supabase.from("businesses").select("id,name,status").eq("id", body.businessId).single<BusinessRow>(),
      supabase
        .from("business_staff")
        .select("role,status")
        .eq("business_id", body.businessId)
        .eq("user_id", user.id)
        .maybeSingle<BusinessStaffRow>(),
    ]);

    if (businessError !== null || business === null) {
      return errorResponse(404, "BUSINESS_NOT_FOUND", "Business was not found.", {
        businessId: body.businessId,
        businessError: businessError?.message,
      });
    }

    if (business.status !== "ACTIVE") {
      return errorResponse(403, "BUSINESS_NOT_FOUND", "Business is not active.", {
        businessId: body.businessId,
        businessStatus: business.status,
      });
    }

    if (staffError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read business staff access.", {
        businessId: body.businessId,
        staffError: staffError.message,
      });
    }

    if (!canIssueScannerQr(staff)) {
      return errorResponse(403, "ACTOR_NOT_ALLOWED", "Only active business owners and managers can issue scanner QR codes.", {
        businessId: body.businessId,
        userId: user.id,
      });
    }

    const signedToken = await signBusinessScannerLoginToken(env.qrSigningSecret, user.id, business.id);
    const { error: grantError } = await supabase.from("business_scanner_login_grants").insert({
      jti: signedToken.jti,
      business_id: business.id,
      issued_by: user.id,
      expires_at: signedToken.expiresAt,
    });

    if (grantError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to create business scanner QR grant.", {
        businessId: business.id,
        userId: user.id,
        grantError: grantError.message,
      });
    }

    return jsonResponse({
      qrPayload: {
        v: 1,
        type: "LEIMA_BUSINESS_SCANNER_LOGIN_QR",
        token: signedToken.token,
      },
      businessId: business.id,
      businessName: business.name,
      expiresAt: signedToken.expiresAt,
      refreshAfterSeconds: businessScannerLoginRefreshAfterSeconds,
    }, 200);
  } catch (error) {
    return errorResponse(400, "VALIDATION_ERROR", "Failed to generate business scanner QR.", {
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
});
