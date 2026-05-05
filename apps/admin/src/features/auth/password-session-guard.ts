import type { NextRequest } from "next/server";

export type PasswordSessionRequestError = {
  error: string;
  status: number;
};

const hasJsonContentType = (request: NextRequest): boolean => {
  const contentType = request.headers.get("content-type");

  return typeof contentType === "string" && contentType.toLowerCase().includes("application/json");
};

const hasTrustedRequestOrigin = (request: NextRequest): boolean => {
  const expectedOrigin = request.nextUrl.origin;
  const originHeader = request.headers.get("origin");

  if (typeof originHeader === "string" && originHeader.length > 0) {
    return originHeader === expectedOrigin;
  }

  const refererHeader = request.headers.get("referer");

  if (typeof refererHeader !== "string" || refererHeader.length === 0) {
    return false;
  }

  try {
    return new URL(refererHeader).origin === expectedOrigin;
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
