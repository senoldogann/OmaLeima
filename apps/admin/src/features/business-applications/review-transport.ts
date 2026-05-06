import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveAdminAccessAsync } from "@/features/auth/access";
import type { OwnerAccessMutationResponse, ReviewMutationResponse } from "@/features/business-applications/types";

type ReviewTransportResult = {
  response: ReviewMutationResponse;
  status: number;
};

export const requireAdminReviewAccessAsync = async (
  supabase: SupabaseClient
): Promise<ReviewTransportResult | null> => {
  const access = await resolveAdminAccessAsync(supabase);

  if (access.area === "admin") {
    return null;
  }

  return {
    response: {
      message: "Only platform admins can review business applications.",
      status: "ADMIN_NOT_ALLOWED",
    },
    status: 403,
  };
};

export const invokeReviewEdgeFunctionAsync = async (
  supabase: SupabaseClient,
  functionName: "admin-approve-business" | "admin-reject-business",
  body: Record<string, string>
): Promise<ReviewTransportResult> => {
  const invokeResult = await supabase.functions.invoke<ReviewMutationResponse>(functionName, {
    body,
  });

  if (invokeResult.error !== null) {
    return {
      response: {
        message: invokeResult.error.message,
        status: "FUNCTION_ERROR",
      },
      status: 502,
    };
  }

  return {
    response: {
      message:
        typeof invokeResult.data?.message === "string"
          ? invokeResult.data.message
          : "Business application review request completed.",
      status: typeof invokeResult.data?.status === "string" ? invokeResult.data.status : null,
    },
    status: 200,
  };
};

export const invokeOwnerAccessEdgeFunctionAsync = async (
  supabase: SupabaseClient,
  body: Record<string, string>
): Promise<{
  response: OwnerAccessMutationResponse;
  status: number;
}> => {
  const invokeResult = await supabase.functions.invoke<OwnerAccessMutationResponse>("admin-create-business-owner-access", {
    body,
  });

  if (invokeResult.error !== null) {
    return {
      response: {
        message: invokeResult.error.message,
        status: "FUNCTION_ERROR",
      },
      status: 502,
    };
  }

  return {
    response: {
      authUserCreated: invokeResult.data?.authUserCreated,
      businessId: invokeResult.data?.businessId,
      businessName: invokeResult.data?.businessName,
      message:
        typeof invokeResult.data?.message === "string"
          ? invokeResult.data.message
          : "Business owner access request completed.",
      onboardingLink: invokeResult.data?.onboardingLink ?? null,
      onboardingLinkError: invokeResult.data?.onboardingLinkError ?? null,
      ownerEmail: invokeResult.data?.ownerEmail,
      ownerUserId: invokeResult.data?.ownerUserId,
      status: typeof invokeResult.data?.status === "string" ? invokeResult.data.status : null,
    },
    status: 200,
  };
};
