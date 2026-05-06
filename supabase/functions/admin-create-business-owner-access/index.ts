import { assertPostRequest, errorResponse, getBearerToken, jsonResponse, readJsonBody } from "../_shared/http.ts";
import { readRuntimeEnv } from "../_shared/env.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";
import { isUuid } from "../_shared/validation.ts";

type CreateBusinessOwnerAccessRequest = {
  applicationId: string;
};

type BusinessApplicationRow = {
  business_name: string;
  contact_email: string;
  contact_name: string;
  id: string;
  status: string;
};

type BusinessRow = {
  id: string;
  name: string;
};

type ProfileRow = {
  id: string;
};

type CreateBusinessOwnerAccessResult =
  | {
      status: "SUCCESS";
      businessId: string;
      ownerUserId: string;
    }
  | {
      status: string;
    };

const temporaryPasswordLength = 28;
const temporaryPasswordAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!_-";

const parseRequestBody = (body: Record<string, unknown>): CreateBusinessOwnerAccessRequest => {
  if (!isUuid(body.applicationId)) {
    throw new Error("applicationId must be a valid UUID.");
  }

  return {
    applicationId: body.applicationId,
  };
};

const createTemporaryPassword = (): string => {
  const randomValues = new Uint32Array(temporaryPasswordLength);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues, (value) => temporaryPasswordAlphabet[value % temporaryPasswordAlphabet.length]).join("");
};

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const isCreateBusinessOwnerAccessResult = (value: unknown): value is CreateBusinessOwnerAccessResult => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.status === "SUCCESS") {
    return typeof candidate.businessId === "string" && typeof candidate.ownerUserId === "string";
  }

  return typeof candidate.status === "string";
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

    const { user: adminUser } = authResult.value;
    const { data: application, error: applicationError } = await supabase
      .from("business_applications")
      .select("id,business_name,contact_email,contact_name,status")
      .eq("id", body.applicationId)
      .maybeSingle<BusinessApplicationRow>();

    if (applicationError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to load business application.", {
        applicationId: body.applicationId,
        applicationError: applicationError.message,
      });
    }

    if (application === null) {
      return jsonResponse({
        status: "APPLICATION_NOT_FOUND",
        message: "Business application was not found.",
      }, 404);
    }

    if (application.status !== "APPROVED") {
      return jsonResponse({
        status: "APPLICATION_NOT_APPROVED",
        message: "Owner access can only be created after approval.",
        applicationStatus: application.status,
      }, 400);
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id,name")
      .eq("application_id", application.id)
      .maybeSingle<BusinessRow>();

    if (businessError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to load approved business.", {
        applicationId: application.id,
        businessError: businessError.message,
      });
    }

    if (business === null) {
      return jsonResponse({
        status: "BUSINESS_NOT_FOUND",
        message: "Approved application does not have a linked business yet.",
      }, 404);
    }

    const ownerEmail = normalizeEmail(application.contact_email);
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", ownerEmail)
      .maybeSingle<ProfileRow>();

    if (existingProfileError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to check existing owner profile.", {
        ownerEmail,
        existingProfileError: existingProfileError.message,
      });
    }

    let ownerUserId = existingProfile?.id ?? null;
    let authUserCreated = false;

    if (ownerUserId === null) {
      const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: ownerEmail,
        email_confirm: true,
        password: createTemporaryPassword(),
        user_metadata: {
          display_name: application.contact_name,
          business_name: business.name,
        },
      });

      if (createUserError !== null || typeof createdUser.user?.id !== "string") {
        return errorResponse(500, "INTERNAL_ERROR", "Failed to create business owner auth user.", {
          ownerEmail,
          createUserError: createUserError?.message,
        });
      }

      ownerUserId = createdUser.user.id;
      authUserCreated = true;
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc("create_business_owner_access_atomic", {
      p_admin_user_id: adminUser.id,
      p_business_id: business.id,
      p_owner_user_id: ownerUserId,
    });

    if (rpcError !== null) {
      return errorResponse(500, "INTERNAL_ERROR", "Failed to create owner membership.", {
        applicationId: application.id,
        businessId: business.id,
        ownerUserId,
        rpcError: rpcError.message,
      });
    }

    if (!isCreateBusinessOwnerAccessResult(rpcResult)) {
      return errorResponse(500, "INTERNAL_ERROR", "Owner access RPC returned an invalid response.", {
        applicationId: application.id,
        businessId: business.id,
        ownerUserId,
      });
    }

    if (rpcResult.status !== "SUCCESS") {
      return jsonResponse({
        ...rpcResult,
        message: "Owner access creation was rejected by the database.",
      }, 403);
    }

    const { data: recoveryLink, error: recoveryLinkError } = await supabase.auth.admin.generateLink({
      email: ownerEmail,
      type: "recovery",
    });

    return jsonResponse({
      status: "SUCCESS",
      message: "Business owner access is ready.",
      applicationId: application.id,
      businessId: business.id,
      businessName: business.name,
      ownerEmail,
      ownerUserId,
      authUserCreated,
      onboardingLink: recoveryLinkError === null ? recoveryLink.properties?.action_link ?? null : null,
      onboardingLinkError: recoveryLinkError?.message ?? null,
    }, 200);
  } catch (error) {
    return errorResponse(400, "VALIDATION_ERROR", "Failed to create business owner access.", {
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
});
