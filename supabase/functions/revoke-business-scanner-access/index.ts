import { readRuntimeEnv } from "../_shared/env.ts";
import { assertPostRequest, errorResponse, getBearerToken, jsonResponse, readJsonBody } from "../_shared/http.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";
import { isUuid } from "../_shared/validation.ts";

type RevokeBusinessScannerAccessRequest = {
  businessId: string;
  scannerDeviceId: string;
};

type BusinessStaffRow = {
  role: "MANAGER" | "OWNER" | "SCANNER";
  status: "ACTIVE" | "DISABLED";
};

type ScannerDeviceRow = {
  id: string;
  business_id: string;
  scanner_user_id: string | null;
  status: "ACTIVE" | "REVOKED";
};

const parseRequestBody = (body: Record<string, unknown>): RevokeBusinessScannerAccessRequest => {
  if (!isUuid(body.businessId)) {
    throw new Error("businessId must be a valid UUID.");
  }

  if (!isUuid(body.scannerDeviceId)) {
    throw new Error("scannerDeviceId must be a valid UUID.");
  }

  return {
    businessId: body.businessId,
    scannerDeviceId: body.scannerDeviceId,
  };
};

const canRevokeScannerAccess = (staff: BusinessStaffRow | null): boolean =>
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
    const { data: staff, error: staffError } = await supabase
      .from("business_staff")
      .select("role,status")
      .eq("business_id", body.businessId)
      .eq("user_id", user.id)
      .maybeSingle<BusinessStaffRow>();

    if (staffError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read business staff access.", {
        businessId: body.businessId,
        staffError: staffError.message,
      });
    }

    if (!canRevokeScannerAccess(staff)) {
      return errorResponse(403, "ACTOR_NOT_ALLOWED", "Only active business owners and managers can revoke scanner devices.", {
        businessId: body.businessId,
        userId: user.id,
      });
    }

    const { data: device, error: deviceError } = await supabase
      .from("business_scanner_devices")
      .select("id,business_id,scanner_user_id,status")
      .eq("id", body.scannerDeviceId)
      .eq("business_id", body.businessId)
      .maybeSingle<ScannerDeviceRow>();

    if (deviceError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to read scanner device.", {
        businessId: body.businessId,
        scannerDeviceId: body.scannerDeviceId,
        deviceError: deviceError.message,
      });
    }

    if (device === null) {
      return errorResponse(404, "SCANNER_DEVICE_NOT_FOUND", "Scanner device was not found.", {
        businessId: body.businessId,
        scannerDeviceId: body.scannerDeviceId,
      });
    }

    if (device.scanner_user_id === user.id) {
      return errorResponse(
        409,
        "SELF_REVOKE_NOT_ALLOWED",
        "The currently signed-in scanner device cannot revoke its own scanner access.",
        {
          businessId: body.businessId,
          scannerDeviceId: device.id,
          userId: user.id,
        },
      );
    }

    const { error: revokeError } = await supabase
      .from("business_scanner_devices")
      .update({
        status: "REVOKED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", device.id)
      .eq("business_id", body.businessId);

    if (revokeError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to revoke scanner device.", {
        businessId: body.businessId,
        scannerDeviceId: device.id,
        revokeError: revokeError.message,
      });
    }

    if (device.scanner_user_id !== null && device.scanner_user_id !== user.id) {
      const { error: staffDisableError } = await supabase
        .from("business_staff")
        .update({ status: "DISABLED" })
        .eq("business_id", body.businessId)
        .eq("user_id", device.scanner_user_id)
        .eq("role", "SCANNER");

      if (staffDisableError !== null) {
        return errorResponse(500, "INTERNAL_ERROR", "Failed to disable scanner staff membership.", {
          businessId: body.businessId,
          scannerUserId: device.scanner_user_id,
          staffDisableError: staffDisableError.message,
        });
      }

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          status: "DELETED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", device.scanner_user_id);

      if (profileUpdateError !== null) {
        return errorResponse(500, "INTERNAL_ERROR", "Failed to mark scanner profile deleted.", {
          scannerUserId: device.scanner_user_id,
          profileUpdateError: profileUpdateError.message,
        });
      }

      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(device.scanner_user_id);

      if (deleteUserError !== null) {
        return errorResponse(500, "INTERNAL_ERROR", "Failed to delete scanner auth user after revocation.", {
          scannerUserId: device.scanner_user_id,
          deleteUserError: deleteUserError.message,
        });
      }
    }

    return jsonResponse({
      status: "SUCCESS",
      scannerDeviceId: device.id,
      statusValue: "REVOKED",
      scannerUserDeleted: device.scanner_user_id !== null && device.scanner_user_id !== user.id,
    }, 200);
  } catch (error) {
    return errorResponse(400, "VALIDATION_ERROR", "Failed to revoke business scanner access.", {
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
});
