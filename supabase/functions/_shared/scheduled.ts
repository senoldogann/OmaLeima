import { type RuntimeEnv } from "./env.ts";
import { errorResponse } from "./http.ts";

export const scheduledJobSecretHeader = "x-scheduled-job-secret";

export const assertScheduledJobRequest = (
  request: Request,
  env: RuntimeEnv,
): Response | null => {
  if (env.scheduledJobSecret === null) {
    return errorResponse(500, "INTERNAL_ERROR", "SCHEDULED_JOB_SECRET is not configured.", {});
  }

  const providedSecret = request.headers.get(scheduledJobSecretHeader);

  if (providedSecret === null || providedSecret !== env.scheduledJobSecret) {
    return errorResponse(401, "UNAUTHORIZED", "Missing or invalid scheduled job secret.", {
      header: scheduledJobSecretHeader,
    });
  }

  return null;
};
