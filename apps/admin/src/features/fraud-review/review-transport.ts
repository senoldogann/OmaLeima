import type { SupabaseClient } from "@supabase/supabase-js";

import type { FraudSignalReviewMutationResponse } from "@/features/fraud-review/types";

type FraudReviewTransportResult = {
  response: FraudSignalReviewMutationResponse;
  status: number;
};

type FraudReviewRpcPayload = {
  currentStatus?: string;
  status?: string;
};

const buildFraudReviewMessage = (status: string | null, fallbackMessage: string): string => {
  if (status === null) {
    return fallbackMessage;
  }

  const messages: Record<string, string> = {
    AUTH_REQUIRED: "Sign in again before reviewing fraud signals.",
    FRAUD_SIGNAL_ALREADY_REVIEWED: "This fraud signal was already resolved by another reviewer.",
    FRAUD_SIGNAL_NOT_ALLOWED: "You can only review fraud signals for events you manage.",
    FRAUD_SIGNAL_NOT_FOUND: "The selected fraud signal could not be found anymore.",
    FRAUD_SIGNAL_STATUS_INVALID: "Choose a valid fraud review outcome.",
    FUNCTION_ERROR: fallbackMessage,
    SUCCESS: fallbackMessage,
  };

  return messages[status] ?? fallbackMessage;
};

const mapFraudReviewStatusCode = (status: string | null): number => {
  if (status === "AUTH_REQUIRED") {
    return 401;
  }

  if (status === "FRAUD_SIGNAL_NOT_ALLOWED") {
    return 403;
  }

  if (status === "FRAUD_SIGNAL_NOT_FOUND") {
    return 404;
  }

  if (status === "FRAUD_SIGNAL_STATUS_INVALID") {
    return 400;
  }

  return 200;
};

export const invokeReviewFraudSignalRpcAsync = async (
  supabase: SupabaseClient,
  signalId: string,
  status: string,
  resolutionNote: string
): Promise<FraudReviewTransportResult> => {
  const { data, error } = await supabase.rpc("review_fraud_signal_atomic", {
    p_resolution_note: resolutionNote,
    p_signal_id: signalId,
    p_status: status,
  });

  if (error !== null) {
    return {
      response: {
        message: error.message,
        status: "FUNCTION_ERROR",
      },
      status: 502,
    };
  }

  const payload = data as FraudReviewRpcPayload | null;
  const responseStatus = typeof payload?.status === "string" ? payload.status : null;

  return {
    response: {
      message: buildFraudReviewMessage(
        responseStatus,
        responseStatus === "SUCCESS"
          ? "Fraud signal review saved."
          : "Fraud signal review request completed."
      ),
      status: responseStatus,
    },
    status: mapFraudReviewStatusCode(responseStatus),
  };
};
