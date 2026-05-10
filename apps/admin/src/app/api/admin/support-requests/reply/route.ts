import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { resolveAdminAccessAsync } from "@/features/auth/access";
import { isUuid } from "@/features/business-applications/validation";
import { enforceDashboardMutationRateLimitAsync } from "@/features/security/dashboard-rate-limit";
import { validateDashboardMutationRequest } from "@/features/security/dashboard-mutation-request";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupportReplyResponse = {
  message: string;
  notificationsCreated?: number;
  notificationsFailed?: number;
  notificationsSent?: number;
  pushMessage?: string;
  pushStatus?: string;
  status: string;
};

type SupportReplyRpcResponse = {
  message?: unknown;
  status?: unknown;
};

type SupportReplyPushResponse = {
  message?: string;
  notificationsCreated?: number;
  notificationsFailed?: number;
  notificationsSent?: number;
  status?: string;
};

const requestSchema = z.object({
  reply: z.string().trim().min(2).max(2000),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
  supportRequestId: z.string().refine((value) => isUuid(value), {
    message: "supportRequestId must be a valid UUID.",
  }),
});

type SupportReplyPayload = z.infer<typeof requestSchema>;

const parseRequestPayloadAsync = async (request: Request): Promise<SupportReplyPayload> => {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const path = firstIssue?.path.join(".") ?? "request";
    const message = firstIssue?.message ?? "Invalid support reply request.";

    throw new Error(`${path}: ${message}`);
  }

  return parsed.data;
};

const readRpcResponse = (data: unknown): SupportReplyRpcResponse => {
  if (typeof data !== "object" || data === null) {
    return {};
  }

  return data as SupportReplyRpcResponse;
};

const readStringValue = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const readNumberValue = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const saveSupportReplyAsync = async (
  adminUserId: string,
  payload: SupportReplyPayload
): Promise<SupportReplyResponse> => {
  const serviceRole = createServiceRoleClient("admin support reply mutation");
  const { data, error } = await serviceRole.rpc("admin_reply_support_request_atomic", {
    p_admin_reply: payload.reply,
    p_admin_user_id: adminUserId,
    p_status: payload.status,
    p_support_request_id: payload.supportRequestId,
  });

  if (error !== null) {
    throw new Error(`Failed to save support reply for ${payload.supportRequestId}: ${error.message}`);
  }

  const rpcResponse = readRpcResponse(data);
  const status = readStringValue(rpcResponse.status) ?? "UNKNOWN_STATUS";

  if (status !== "SUCCESS") {
    throw new Error(`Support reply save failed with status ${status}.`);
  }

  return {
    message: readStringValue(rpcResponse.message) ?? "Support reply saved.",
    status,
  };
};

const sendSupportReplyPushAsync = async (
  supabase: SupabaseClient,
  supportRequestId: string
): Promise<SupportReplyPushResponse> => {
  const invokeResult = await supabase.functions.invoke<SupportReplyPushResponse>(
    "send-support-reply-push",
    {
      body: {
        supportRequestId,
      },
    }
  );

  if (invokeResult.error !== null) {
    return {
      message: invokeResult.error.message,
      notificationsCreated: 0,
      notificationsFailed: 1,
      notificationsSent: 0,
      status: "PUSH_FUNCTION_ERROR",
    };
  }

  return {
    message:
      typeof invokeResult.data?.message === "string"
        ? invokeResult.data.message
        : "Support reply push request completed.",
    notificationsCreated: readNumberValue(invokeResult.data?.notificationsCreated),
    notificationsFailed: readNumberValue(invokeResult.data?.notificationsFailed),
    notificationsSent: readNumberValue(invokeResult.data?.notificationsSent),
    status: typeof invokeResult.data?.status === "string" ? invokeResult.data.status : "UNKNOWN_PUSH_STATUS",
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
          message: "Only active platform admins can reply to support requests.",
          status: "ADMIN_NOT_ALLOWED",
        },
        {
          status: 403,
        }
      );
    }

    const rateLimitResponse = await enforceDashboardMutationRateLimitAsync(access.userId, "admin-support-reply");

    if (rateLimitResponse !== null) {
      return rateLimitResponse;
    }

    const payload = await parseRequestPayloadAsync(request);
    const response = await saveSupportReplyAsync(access.userId, payload);
    const pushResponse = await sendSupportReplyPushAsync(supabase, payload.supportRequestId);

    return NextResponse.json(
      {
        ...response,
        notificationsCreated: pushResponse.notificationsCreated,
        notificationsFailed: pushResponse.notificationsFailed,
        notificationsSent: pushResponse.notificationsSent,
        pushMessage: pushResponse.message,
        pushStatus: pushResponse.status,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("[admin-support-reply] failed", {
      message: error instanceof Error ? error.message : "Unknown support reply mutation error.",
    });

    return NextResponse.json(
      {
        message: "Support reply could not be saved.",
        status: "SUPPORT_REPLY_FAILED",
      },
      {
        status: 400,
      }
    );
  }
}
