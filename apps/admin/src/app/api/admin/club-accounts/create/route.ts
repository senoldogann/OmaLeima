import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveAdminAccessAsync } from "@/features/auth/access";
import { enforceDashboardMutationRateLimitAsync } from "@/features/security/dashboard-rate-limit";
import { validateDashboardMutationRequest } from "@/features/security/dashboard-mutation-request";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateClubAccountResponse = {
  authUserCreated?: boolean;
  clubId?: string;
  clubSlug?: string;
  message: string;
  ownerEmail?: string;
  ownerUserId?: string;
  status: string;
};

type ProfileByEmailRow = {
  email: string;
  id: string;
};

type CreateClubOwnerRpcResponse = {
  clubId?: unknown;
  clubSlug?: unknown;
  ownerUserId?: unknown;
  status?: unknown;
};

type CreatedOwnerUser = {
  ownerUserId: string;
};

const optionalTextSchema = z.string().max(500).optional();
const optionalLongTextSchema = z.string().max(1200).optional();
const optionalEmailSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.string().trim().email().max(200).optional()
);

const requestSchema = z.object({
  address: z.string().trim().max(240).optional(),
  announcement: optionalLongTextSchema,
  city: z.string().trim().min(2).max(120),
  clubName: z.string().trim().min(2).max(180),
  contactEmail: optionalEmailSchema,
  country: z.string().trim().min(2).max(80),
  coverImageUrl: optionalTextSchema,
  instagramUrl: optionalTextSchema,
  logoUrl: optionalTextSchema,
  ownerEmail: z.string().trim().email().max(200),
  ownerName: z.string().trim().min(2).max(120),
  ownerPassword: z.string().min(10).max(128),
  phone: z.string().trim().max(80).optional(),
  universityName: z.string().trim().max(180).optional(),
  websiteUrl: optionalTextSchema,
});

type CreateClubAccountPayload = z.infer<typeof requestSchema>;

const normalizeOptionalText = (value: string | undefined): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const parseRequestPayloadAsync = async (request: Request): Promise<CreateClubAccountPayload> => {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const path = firstIssue?.path.join(".") ?? "request";
    const message = firstIssue?.message ?? "Invalid organization account request.";

    throw new Error(`${path}: ${message}`);
  }

  return parsed.data;
};

const readRpcStatus = (data: unknown): CreateClubOwnerRpcResponse => {
  if (typeof data !== "object" || data === null) {
    return {};
  }

  return data as CreateClubOwnerRpcResponse;
};

const readStringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const createOwnerUserAsync = async (payload: CreateClubAccountPayload): Promise<CreatedOwnerUser> => {
  const serviceRole = createServiceRoleClient("manual organization owner account creation");
  const ownerEmail = payload.ownerEmail.toLowerCase();
  const { data: existingProfile, error: profileError } = await serviceRole
    .from("profiles")
    .select("id,email")
    .eq("email", ownerEmail)
    .maybeSingle<ProfileByEmailRow>();

  if (profileError !== null) {
    throw new Error(`Failed to check existing organization owner profile for ${ownerEmail}: ${profileError.message}`);
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
    throw new Error(`Failed to create organization owner auth user for ${ownerEmail}: ${createResult.error.message}`);
  }

  const ownerUserId = createResult.data.user?.id;

  if (typeof ownerUserId !== "string") {
    throw new Error(`Organization owner auth user creation for ${ownerEmail} returned without a user id.`);
  }

  return {
    ownerUserId,
  };
};

const deleteCreatedOwnerUserAsync = async (ownerUserId: string, originalError: Error): Promise<never> => {
  const serviceRole = createServiceRoleClient("manual organization owner account rollback");
  const deleteResult = await serviceRole.auth.admin.deleteUser(ownerUserId);

  if (deleteResult.error !== null) {
    throw new Error(
      `${originalError.message} Created organization owner auth user ${ownerUserId} could not be rolled back: ${deleteResult.error.message}`
    );
  }

  throw originalError;
};

const createClubOwnerAccountWithRollbackAsync = async (
  adminUserId: string,
  ownerUserId: string,
  payload: CreateClubAccountPayload
): Promise<CreateClubAccountResponse> => {
  try {
    return await createClubOwnerAccountAsync(adminUserId, ownerUserId, payload);
  } catch (error) {
    const originalError = error instanceof Error ? error : new Error("Unknown database organization account creation error.");

    return deleteCreatedOwnerUserAsync(ownerUserId, originalError);
  }
};

const createClubOwnerAccountAsync = async (
  adminUserId: string,
  ownerUserId: string,
  payload: CreateClubAccountPayload
): Promise<CreateClubAccountResponse> => {
  const serviceRole = createServiceRoleClient("manual organization owner account creation");
  const contactEmail = payload.contactEmail?.toLowerCase() ?? payload.ownerEmail.toLowerCase();
  const { data, error } = await serviceRole.rpc("admin_create_club_owner_account_atomic", {
    p_address: normalizeOptionalText(payload.address),
    p_admin_user_id: adminUserId,
    p_announcement: normalizeOptionalText(payload.announcement),
    p_city: payload.city,
    p_club_name: payload.clubName,
    p_contact_email: contactEmail,
    p_country: payload.country,
    p_cover_image_url: normalizeOptionalText(payload.coverImageUrl),
    p_instagram_url: normalizeOptionalText(payload.instagramUrl),
    p_logo_url: normalizeOptionalText(payload.logoUrl),
    p_owner_email: payload.ownerEmail.toLowerCase(),
    p_owner_name: payload.ownerName,
    p_owner_user_id: ownerUserId,
    p_phone: normalizeOptionalText(payload.phone),
    p_university_name: normalizeOptionalText(payload.universityName),
    p_website_url: normalizeOptionalText(payload.websiteUrl),
  });

  if (error !== null) {
    throw new Error(`Failed to create organization owner account in database: ${error.message}`);
  }

  const rpcResponse = readRpcStatus(data);
  const status = readStringValue(rpcResponse.status) ?? "UNKNOWN_STATUS";

  if (status !== "SUCCESS") {
    throw new Error(`Organization owner account creation failed with status ${status}.`);
  }

  return {
    clubId: readStringValue(rpcResponse.clubId),
    clubSlug: readStringValue(rpcResponse.clubSlug),
    message: "Organization account and owner access created.",
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
          message: "Only active platform admins can create organization owner accounts.",
          status: "ADMIN_NOT_ALLOWED",
        },
        {
          status: 403,
        }
      );
    }

    const rateLimitResponse = await enforceDashboardMutationRateLimitAsync(access.userId, "admin-club-account-create");

    if (rateLimitResponse !== null) {
      return rateLimitResponse;
    }

    const payload = await parseRequestPayloadAsync(request);
    const owner = await createOwnerUserAsync(payload);
    const result = await createClubOwnerAccountWithRollbackAsync(access.userId, owner.ownerUserId, payload);

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
    console.error("[admin-club-account-create] failed", {
      message: error instanceof Error ? error.message : "Unknown organization account creation error.",
    });

    return NextResponse.json(
      {
        message: "Organization account could not be created.",
        status: "CLUB_ACCOUNT_CREATE_FAILED",
      },
      {
        status: 400,
      }
    );
  }
}
