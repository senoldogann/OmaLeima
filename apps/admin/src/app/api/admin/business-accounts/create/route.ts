import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveAdminAccessAsync } from "@/features/auth/access";
import { FINLAND_CITY_OPTIONS, FINLAND_COUNTRY } from "@/features/location/finland";
import { enforceDashboardMutationRateLimitAsync } from "@/features/security/dashboard-rate-limit";
import { validateDashboardMutationRequest } from "@/features/security/dashboard-mutation-request";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateBusinessAccountResponse = {
  authUserCreated?: boolean;
  businessId?: string;
  businessSlug?: string;
  message: string;
  ownerEmail?: string;
  ownerUserId?: string;
  status: string;
};

type ProfileByEmailRow = {
  id: string;
  email: string;
};

type CreateBusinessOwnerRpcResponse = {
  applicationId?: unknown;
  businessId?: unknown;
  businessSlug?: unknown;
  ownerUserId?: unknown;
  status?: unknown;
};

type CreatedOwnerUser = {
  ownerUserId: string;
};

const optionalTextSchema = z.string().max(300).optional();
const optionalEmailSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.string().trim().email().max(200).optional()
);

const requestSchema = z.object({
  address: z.string().trim().min(2).max(240),
  businessName: z.string().trim().min(2).max(180),
  city: z.enum(FINLAND_CITY_OPTIONS),
  contactEmail: optionalEmailSchema,
  country: z.literal(FINLAND_COUNTRY),
  instagramUrl: optionalTextSchema,
  ownerEmail: z.string().trim().email().max(200),
  ownerName: z.string().trim().min(2).max(120),
  ownerPassword: z.string().min(10).max(128),
  phone: z.string().trim().max(80).optional(),
  websiteUrl: optionalTextSchema,
  yTunnus: z.string().trim().max(32).optional(),
});

type CreateBusinessAccountPayload = z.infer<typeof requestSchema>;

const normalizeOptionalText = (value: string | undefined): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const parseRequestPayloadAsync = async (request: Request): Promise<CreateBusinessAccountPayload> => {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const path = firstIssue?.path.join(".") ?? "request";
    const message = firstIssue?.message ?? "Invalid business account request.";

    throw new Error(`${path}: ${message}`);
  }

  return parsed.data;
};

const readRpcStatus = (data: unknown): CreateBusinessOwnerRpcResponse => {
  if (typeof data !== "object" || data === null) {
    return {};
  }

  return data as CreateBusinessOwnerRpcResponse;
};

const readStringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const createOwnerUserAsync = async (
  payload: CreateBusinessAccountPayload
): Promise<CreatedOwnerUser> => {
  const serviceRole = createServiceRoleClient("manual business owner account creation");
  const ownerEmail = payload.ownerEmail.toLowerCase();
  const { data: existingProfile, error: profileError } = await serviceRole
    .from("profiles")
    .select("id,email")
    .eq("email", ownerEmail)
    .maybeSingle<ProfileByEmailRow>();

  if (profileError !== null) {
    throw new Error(`Failed to check existing owner profile for ${ownerEmail}: ${profileError.message}`);
  }

  if (existingProfile !== null) {
    throw new Error(`Owner email ${ownerEmail} already belongs to an existing account. Use a new email or manage the existing user from the Users page.`);
  }

  const createResult = await serviceRole.auth.admin.createUser({
    email: ownerEmail,
    email_confirm: true,
    password: payload.ownerPassword,
    user_metadata: {
      full_name: payload.ownerName,
    },
  });

  if (createResult.error !== null) {
    throw new Error(`Failed to create owner auth user for ${ownerEmail}: ${createResult.error.message}`);
  }

  const ownerUserId = createResult.data.user?.id;

  if (typeof ownerUserId !== "string") {
    throw new Error(`Owner auth user creation for ${ownerEmail} returned without a user id.`);
  }

  return {
    ownerUserId,
  };
};

const deleteCreatedOwnerUserAsync = async (ownerUserId: string, originalError: Error): Promise<never> => {
  const serviceRole = createServiceRoleClient("manual business owner account rollback");
  const deleteResult = await serviceRole.auth.admin.deleteUser(ownerUserId);

  if (deleteResult.error !== null) {
    throw new Error(
      `${originalError.message} Created owner auth user ${ownerUserId} could not be rolled back: ${deleteResult.error.message}`
    );
  }

  throw originalError;
};

const createBusinessOwnerAccountWithRollbackAsync = async (
  adminUserId: string,
  ownerUserId: string,
  payload: CreateBusinessAccountPayload
): Promise<CreateBusinessAccountResponse> => {
  try {
    return await createBusinessOwnerAccountAsync(adminUserId, ownerUserId, payload);
  } catch (error) {
    const originalError = error instanceof Error ? error : new Error("Unknown database account creation error.");

    return deleteCreatedOwnerUserAsync(ownerUserId, originalError);
  }
};

const createBusinessOwnerAccountAsync = async (
  adminUserId: string,
  ownerUserId: string,
  payload: CreateBusinessAccountPayload
): Promise<CreateBusinessAccountResponse> => {
  const serviceRole = createServiceRoleClient("manual business owner account creation");
  const contactEmail = payload.contactEmail?.toLowerCase() ?? payload.ownerEmail.toLowerCase();
  const { data, error } = await serviceRole.rpc("admin_create_business_owner_account_atomic", {
    p_address: payload.address,
    p_admin_user_id: adminUserId,
    p_business_name: payload.businessName,
    p_city: payload.city,
    p_contact_email: contactEmail,
    p_country: payload.country,
    p_instagram_url: normalizeOptionalText(payload.instagramUrl),
    p_owner_email: payload.ownerEmail.toLowerCase(),
    p_owner_name: payload.ownerName,
    p_owner_user_id: ownerUserId,
    p_phone: normalizeOptionalText(payload.phone),
    p_website_url: normalizeOptionalText(payload.websiteUrl),
    p_y_tunnus: normalizeOptionalText(payload.yTunnus),
  });

  if (error !== null) {
    throw new Error(`Failed to create business owner account in database: ${error.message}`);
  }

  const rpcResponse = readRpcStatus(data);
  const status = readStringValue(rpcResponse.status) ?? "UNKNOWN_STATUS";

  if (status !== "SUCCESS") {
    throw new Error(`Business owner account creation failed with status ${status}.`);
  }

  return {
    businessId: readStringValue(rpcResponse.businessId),
    businessSlug: readStringValue(rpcResponse.businessSlug),
    message: "Business account and owner access created.",
    ownerEmail: payload.ownerEmail.toLowerCase(),
    ownerUserId: readStringValue(rpcResponse.ownerUserId) ?? ownerUserId,
    status,
  };
};

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const requestGuardResponse = validateDashboardMutationRequest(request, { requireJsonContentType: true });

    if (requestGuardResponse !== null) {
      return requestGuardResponse;
    }

    const supabase = await createRouteHandlerClient();
    const access = await resolveAdminAccessAsync(supabase);

    if (access.area !== "admin" || access.userId === null) {
      return NextResponse.json(
        {
          message: "Only active platform admins can create business owner accounts.",
          status: "ADMIN_NOT_ALLOWED",
        },
        {
          status: 403,
        }
      );
    }

    const rateLimitResponse = await enforceDashboardMutationRateLimitAsync(access.userId, "admin-business-account-create");

    if (rateLimitResponse !== null) {
      return rateLimitResponse;
    }

    const payload = await parseRequestPayloadAsync(request);
    const owner = await createOwnerUserAsync(payload);
    const result = await createBusinessOwnerAccountWithRollbackAsync(access.userId, owner.ownerUserId, payload);

    return NextResponse.json(
      {
        ...result,
        authUserCreated: true,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("[admin-business-account-create] failed", {
      message: error instanceof Error ? error.message : "Unknown business account creation error.",
    });

    return NextResponse.json(
      {
        message: "Business account could not be created.",
        status: "BUSINESS_ACCOUNT_CREATE_FAILED",
      },
      {
        status: 400,
      }
    );
  }
}
