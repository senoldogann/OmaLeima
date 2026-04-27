import { assertPostRequest, errorResponse, getBearerToken, jsonResponse, readJsonBody } from "../_shared/http.ts";
import { readRuntimeEnv } from "../_shared/env.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";
import { isUuid } from "../_shared/validation.ts";

type ApproveBusinessRequest = {
  applicationId: string;
};

type ApproveBusinessResult = {
  status: string;
  applicationId?: string;
  applicationStatus?: string;
  businessId?: string;
  businessSlug?: string;
};

const responseMessages: Record<string, string> = {
  SUCCESS: "Business application approved successfully.",
  ADMIN_NOT_ALLOWED: "Authenticated user is not allowed to review business applications.",
  APPLICATION_NOT_FOUND: "Business application was not found.",
  APPLICATION_NOT_PENDING: "Business application is no longer pending review.",
  BUSINESS_ALREADY_CREATED: "A business already exists for this application.",
  BUSINESS_SLUG_CONFLICT: "Business slug generation conflicted with an existing business.",
};

const parseRequestBody = (body: Record<string, unknown>): ApproveBusinessRequest => {
  if (!isUuid(body.applicationId)) {
    throw new Error("applicationId must be a valid UUID.");
  }

  return {
    applicationId: body.applicationId,
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

    const { data: rpcResult, error: rpcError } = await supabase.rpc("approve_business_application_atomic", {
      p_application_id: body.applicationId,
      p_reviewed_by: user.id,
    });

    if (rpcError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to approve business application.", {
        applicationId: body.applicationId,
        reviewedBy: user.id,
        rpcError: rpcError.message,
        rpcErrorCode: rpcError.code,
      });
    }

    const result = rpcResult as ApproveBusinessResult;

    return jsonResponse({
      ...result,
      message: responseMessages[result.status] ?? "Business application review completed.",
    }, 200);
  } catch (error) {
    return errorResponse(400, "VALIDATION_ERROR", "Failed to approve business application.", {
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
});
