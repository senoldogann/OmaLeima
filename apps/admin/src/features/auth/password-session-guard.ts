import type { NextRequest } from "next/server";

export type PasswordSessionRequestError = {
  error: string;
  status: number;
};

const hasJsonContentType = (request: NextRequest): boolean => {
  const contentType = request.headers.get("content-type");

  return typeof contentType === "string" && contentType.toLowerCase().includes("application/json");
};

const loopbackHostnames = new Set(["127.0.0.1", "localhost", "::1"]);

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

const hasTrustedRequestOrigin = (request: NextRequest): boolean => {
  const expectedOrigin = request.nextUrl.origin;
  const originHeader = request.headers.get("origin");

  if (typeof originHeader === "string" && originHeader.length > 0) {
    return isSameOriginOrLoopbackAlias(originHeader, expectedOrigin);
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

export const validatePasswordSessionRequest = (
  request: NextRequest
): PasswordSessionRequestError | null => {
  if (!hasTrustedRequestOrigin(request)) {
    return {
      error: "Password session requests must come from the same site.",
      status: 403,
    };
  }

  if (!hasJsonContentType(request)) {
    return {
      error: "Password session request must use application/json.",
      status: 415,
    };
  }

  return null;
};
