import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RateLimitScope =
  | "admin-business-account-create"
  | "admin-business-application-approve"
  | "admin-business-application-reject"
  | "admin-club-account-create"
  | "admin-department-tag-block"
  | "admin-department-tag-merge"
  | "admin-login-slide-delete"
  | "admin-login-slide-upsert"
  | "admin-support-reply"
  | "admin-user-status"
  | "announcement-archive"
  | "announcement-create"
  | "announcement-delete"
  | "announcement-send-push"
  | "announcement-update"
  | "club-department-tag-create"
  | "club-event-cancel"
  | "club-event-create"
  | "club-event-update"
  | "club-profile-update"
  | "club-reward-claim-confirm"
  | "club-reward-tier-create"
  | "club-reward-tier-delete"
  | "club-reward-tier-update"
  | "fraud-signal-review";

type RateLimitOptions = {
  dayMaxRequests: number;
  windowMaxRequests: number;
  windowSeconds: number;
};

type DashboardRateLimitResponse = {
  limit?: unknown;
  remainingInWindow?: unknown;
  remainingToday?: unknown;
  retryAfterSeconds?: unknown;
  scope?: unknown;
  status?: unknown;
  windowSeconds?: unknown;
};

const defaultRateLimitOptions = {
  dayMaxRequests: 500,
  windowMaxRequests: 30,
  windowSeconds: 60,
} satisfies RateLimitOptions;

const pushRateLimitOptions = {
  dayMaxRequests: 80,
  windowMaxRequests: 10,
  windowSeconds: 60,
} satisfies RateLimitOptions;

const accountLifecycleRateLimitOptions = {
  dayMaxRequests: 120,
  windowMaxRequests: 12,
  windowSeconds: 60,
} satisfies RateLimitOptions;

const readRateLimitOptions = (scope: RateLimitScope): RateLimitOptions => {
  if (scope === "announcement-send-push") {
    return pushRateLimitOptions;
  }

  if (
    scope === "admin-business-account-create" ||
    scope === "admin-club-account-create" ||
    scope === "admin-user-status"
  ) {
    return accountLifecycleRateLimitOptions;
  }

  return defaultRateLimitOptions;
};

const readRetryAfterSeconds = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 60;
  }

  return Math.max(1, Math.ceil(value));
};

const readResponseStatus = (data: unknown): string | null => {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const candidate = data as DashboardRateLimitResponse;

  return typeof candidate.status === "string" ? candidate.status : null;
};

export const enforceDashboardMutationRateLimitAsync = async (
  actorUserId: string,
  scope: RateLimitScope
): Promise<NextResponse | null> => {
  const options = readRateLimitOptions(scope);
  const serviceRole = createServiceRoleClient(`dashboard mutation rate limit ${scope}`);
  const { data, error } = await serviceRole.rpc("check_dashboard_mutation_rate_limit", {
    p_actor_user_id: actorUserId,
    p_day_max_requests: options.dayMaxRequests,
    p_scope: scope,
    p_window_max_requests: options.windowMaxRequests,
    p_window_seconds: options.windowSeconds,
  });

  if (error !== null) {
    throw new Error(`Failed to check dashboard mutation rate limit for ${scope}: ${error.message}`);
  }

  const status = readResponseStatus(data);

  if (status === "ALLOWED") {
    return null;
  }

  if (status === "RATE_LIMITED") {
    const response = data as DashboardRateLimitResponse;
    const retryAfterSeconds = readRetryAfterSeconds(response.retryAfterSeconds);

    return NextResponse.json(
      {
        message: "Too many dashboard actions. Please wait and try again.",
        retryAfterSeconds,
        status: "RATE_LIMITED",
      },
      {
        headers: {
          "Retry-After": String(retryAfterSeconds),
        },
        status: 429,
      }
    );
  }

  throw new Error(`Unexpected dashboard mutation rate limit status for ${scope}: ${status ?? "null"}.`);
};
