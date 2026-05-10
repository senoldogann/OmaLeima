import { NextResponse } from "next/server";

type DashboardMutationRequestOptions = {
  requireJsonContentType: boolean;
};

type DashboardMutationRequestErrorBody = {
  message: string;
  status: "CSRF_TOKEN_MISMATCH" | "INVALID_REQUEST_ORIGIN" | "UNSUPPORTED_MEDIA_TYPE";
};

export const dashboardCsrfCookieName = "omaleima_dashboard_csrf";
export const dashboardCsrfHeaderName = "x-omaleima-csrf";

const loopbackHostnames: ReadonlySet<string> = new Set(["127.0.0.1", "localhost", "::1"]);

const hasJsonContentType = (request: Request): boolean => {
  const contentType = request.headers.get("content-type");

  return typeof contentType === "string" && contentType.toLowerCase().includes("application/json");
};

const isSameOriginOrLoopbackAlias = (actualOrigin: string, expectedOrigin: string): boolean => {
  if (actualOrigin === expectedOrigin) {
    return true;
  }

  const actualUrl = new URL(actualOrigin);
  const expectedUrl = new URL(expectedOrigin);

  return (
    actualUrl.protocol === expectedUrl.protocol &&
    actualUrl.port === expectedUrl.port &&
    loopbackHostnames.has(actualUrl.hostname) &&
    loopbackHostnames.has(expectedUrl.hostname)
  );
};

const hasTrustedRequestOrigin = (request: Request): boolean => {
  const expectedOrigin = new URL(request.url).origin;
  const originHeader = request.headers.get("origin");

  if (typeof originHeader === "string" && originHeader.length > 0) {
    try {
      return isSameOriginOrLoopbackAlias(originHeader, expectedOrigin);
    } catch {
      return false;
    }
  }

  const refererHeader = request.headers.get("referer");

  if (typeof refererHeader !== "string" || refererHeader.length === 0) {
    return false;
  }

  try {
    return isSameOriginOrLoopbackAlias(new URL(refererHeader).origin, expectedOrigin);
  } catch {
    return false;
  }
};

const createMutationGuardResponse = (
  body: DashboardMutationRequestErrorBody,
  status: 403 | 415
): NextResponse<DashboardMutationRequestErrorBody> => NextResponse.json(body, { status });

const readCookieValue = (request: Request, cookieName: string): string | null => {
  const cookieHeader = request.headers.get("cookie");

  if (cookieHeader === null) {
    return null;
  }

  const cookiePrefix = `${cookieName}=`;
  const cookieValue = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(cookiePrefix));

  if (typeof cookieValue !== "string") {
    return null;
  }

  return decodeURIComponent(cookieValue.slice(cookiePrefix.length));
};

const hasValidCsrfToken = (request: Request): boolean => {
  const cookieToken = readCookieValue(request, dashboardCsrfCookieName);
  const headerToken = request.headers.get(dashboardCsrfHeaderName);

  return (
    typeof cookieToken === "string" &&
    typeof headerToken === "string" &&
    cookieToken.length >= 32 &&
    headerToken.length >= 32 &&
    cookieToken === headerToken
  );
};

export const validateDashboardMutationRequest = (
  request: Request,
  options: DashboardMutationRequestOptions
): NextResponse<DashboardMutationRequestErrorBody> | null => {
  if (!hasTrustedRequestOrigin(request)) {
    return createMutationGuardResponse(
      {
        message: "Dashboard mutation requests must come from the same site.",
        status: "INVALID_REQUEST_ORIGIN",
      },
      403
    );
  }

  if (!hasValidCsrfToken(request)) {
    return createMutationGuardResponse(
      {
        message: "Dashboard mutation request CSRF token is missing or invalid.",
        status: "CSRF_TOKEN_MISMATCH",
      },
      403
    );
  }

  if (options.requireJsonContentType && !hasJsonContentType(request)) {
    return createMutationGuardResponse(
      {
        message: "Dashboard mutation request must use application/json.",
        status: "UNSUPPORTED_MEDIA_TYPE",
      },
      415
    );
  }

  return null;
};
