import { assertPostRequest, errorResponse, getBearerToken, jsonResponse, readJsonBody } from "../_shared/http.ts";
import { readRuntimeEnv } from "../_shared/env.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";
import { isUuid } from "../_shared/validation.ts";

type RejectBusinessRequest = {
  applicationId: string;
  rejectionReason: string;
};

type RejectBusinessResult = {
  status: string;
  applicationId?: string;
  applicationStatus?: string;
};

const responseMessages: Record<string, string> = {
  SUCCESS: "Business application rejected successfully.",
  ADMIN_NOT_ALLOWED: "Authenticated user is not allowed to review business applications.",
  APPLICATION_NOT_FOUND: "Business application was not found.",
  APPLICATION_NOT_PENDING: "Business application is no longer pending review.",
  REJECTION_REASON_REQUIRED: "A rejection reason is required.",
};

const parseRequestBody = (body: Record<string, unknown>): RejectBusinessRequest => {
  if (!isUuid(body.applicationId)) {
    throw new Error("applicationId must be a valid UUID.");
  }

  if (typeof body.rejectionReason !== "string") {
    throw new Error("rejectionReason must be a string.");
  }

  return {
    applicationId: body.applicationId,
    rejectionReason: body.rejectionReason,
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

    const { data: rpcResult, error: rpcError } = await supabase.rpc("reject_business_application_atomic", {
      p_application_id: body.applicationId,
      p_reviewed_by: user.id,
      p_rejection_reason: body.rejectionReason,
    });

    if (rpcError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to reject business application.", {
        applicationId: body.applicationId,
        reviewedBy: user.id,
        rpcError: rpcError.message,
        rpcErrorCode: rpcError.code,
      });
    }

    const result = rpcResult as RejectBusinessResult;

    return jsonResponse({
      ...result,
      message: responseMessages[result.status] ?? "Business application review completed.",
    }, 200);
  } catch (error) {
    return errorResponse(400, "VALIDATION_ERROR", "Failed to reject business application.", {
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
});
