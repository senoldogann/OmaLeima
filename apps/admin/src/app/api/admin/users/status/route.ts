import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveAdminAccessAsync } from "@/features/auth/access";
import { isUuid } from "@/features/business-applications/validation";
import { enforceDashboardMutationRateLimitAsync } from "@/features/security/dashboard-rate-limit";
import { validateDashboardMutationRequest } from "@/features/security/dashboard-mutation-request";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UserStatusMutationResponse = {
  message: string;
  status: string;
};

type UserStatusRpcResponse = {
  message?: unknown;
  status?: unknown;
};

const requestSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]),
  userId: z.string().refine((value) => isUuid(value), {
    message: "userId must be a valid UUID.",
  }),
});

type UserStatusMutationPayload = z.infer<typeof requestSchema>;

const parseRequestPayloadAsync = async (request: Request): Promise<UserStatusMutationPayload> => {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const path = firstIssue?.path.join(".") ?? "request";
    const message = firstIssue?.message ?? "Invalid user status request.";

    throw new Error(`${path}: ${message}`);
  }

  return parsed.data;
};

const readRpcResponse = (data: unknown): UserStatusRpcResponse => {
  if (typeof data !== "object" || data === null) {
    return {};
  }

  return data as UserStatusRpcResponse;
};

const readStringValue = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const updateUserStatusAsync = async (
  adminUserId: string,
  payload: UserStatusMutationPayload
): Promise<UserStatusMutationResponse> => {
  const serviceRole = createServiceRoleClient("admin user status mutation");
  const { data, error } = await serviceRole.rpc("admin_update_profile_status_atomic", {
    p_admin_user_id: adminUserId,
    p_status: payload.status,
    p_target_user_id: payload.userId,
  });

  if (error !== null) {
    throw new Error(`Failed to update profile status for ${payload.userId}: ${error.message}`);
  }

  const rpcResponse = readRpcResponse(data);
  const status = readStringValue(rpcResponse.status) ?? "UNKNOWN_STATUS";

  if (status !== "SUCCESS") {
    throw new Error(`User status update failed with status ${status}.`);
  }

  if (payload.status === "DELETED") {
    const { error: deleteUserError } = await serviceRole.auth.admin.deleteUser(payload.userId, true);

    if (deleteUserError !== null) {
      throw new Error(`Failed to revoke auth user ${payload.userId} after profile deletion: ${deleteUserError.message}`);
    }
  }

  return {
    message:
      readStringValue(rpcResponse.message) ??
      (payload.status === "ACTIVE"
        ? "User activated."
        : payload.status === "SUSPENDED"
          ? "User set to passive."
          : "User account deleted and anonymized."),
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
          message: "Only active platform admins can change user status.",
          status: "ADMIN_NOT_ALLOWED",
        },
        {
          status: 403,
        }
      );
    }

    const rateLimitResponse = await enforceDashboardMutationRateLimitAsync(access.userId, "admin-user-status");

    if (rateLimitResponse !== null) {
      return rateLimitResponse;
    }

    const payload = await parseRequestPayloadAsync(request);

    if (payload.userId === access.userId) {
      return NextResponse.json(
        {
          message: "You cannot change the status of your own active admin session.",
          status: "SELF_STATUS_CHANGE_BLOCKED",
        },
        {
          status: 400,
        }
      );
    }

    const response = await updateUserStatusAsync(access.userId, payload);

    return NextResponse.json(response, {
      status: 200,
    });
  } catch (error) {
    console.error("[admin-user-status] failed", {
      message: error instanceof Error ? error.message : "Unknown user status mutation error.",
    });

    return NextResponse.json(
      {
        message: "User status could not be updated.",
        status: "USER_STATUS_UPDATE_FAILED",
      },
      {
        status: 400,
      }
    );
  }
}
