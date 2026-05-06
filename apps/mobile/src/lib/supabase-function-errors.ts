import { FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";

type EdgeFunctionErrorBody = {
  details?: Record<string, unknown>;
  message?: string;
  status?: string;
};

type SupabaseFunctionErrorMessageParams = {
  error: unknown;
  fallbackContext: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isEdgeFunctionErrorBody = (value: unknown): value is EdgeFunctionErrorBody => {
  if (!isRecord(value)) {
    return false;
  }

  const details = value.details;

  return (
    (typeof value.status === "string" || typeof value.status === "undefined") &&
    (typeof value.message === "string" || typeof value.message === "undefined") &&
    (isRecord(details) || typeof details === "undefined")
  );
};

const readResponseJsonAsync = async (response: Response): Promise<unknown | null> => {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
};

const readProvisionStatus = (body: EdgeFunctionErrorBody): string | null => {
  const provisionStatus = body.details?.provisionStatus;

  return typeof provisionStatus === "string" ? provisionStatus : null;
};

const formatFunctionErrorBody = (fallbackContext: string, body: EdgeFunctionErrorBody): string => {
  const status = body.status ?? readProvisionStatus(body);
  const message = body.message;

  if (typeof status === "string" && typeof message === "string") {
    return `${fallbackContext}: ${status} - ${message}`;
  }

  if (typeof status === "string") {
    return `${fallbackContext}: ${status}`;
  }

  if (typeof message === "string") {
    return `${fallbackContext}: ${message}`;
  }

  return fallbackContext;
};

export const readSupabaseFunctionErrorMessageAsync = async ({
  error,
  fallbackContext,
}: SupabaseFunctionErrorMessageParams): Promise<string> => {
  if (error instanceof FunctionsHttpError || error instanceof FunctionsRelayError) {
    const context = error.context as unknown;

    if (context instanceof Response) {
      const responseBody = await readResponseJsonAsync(context);

      if (isEdgeFunctionErrorBody(responseBody)) {
        return formatFunctionErrorBody(fallbackContext, responseBody);
      }

      return `${fallbackContext}: HTTP ${context.status}`;
    }
  }

  if (error instanceof Error) {
    return `${fallbackContext}: ${error.message}`;
  }

  return `${fallbackContext}: ${String(error)}`;
};
