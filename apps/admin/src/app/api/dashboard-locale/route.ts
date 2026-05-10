import { NextResponse } from "next/server";

import {
  getDashboardLocaleCookieName,
  isDashboardLocale,
} from "@/features/dashboard/i18n";

const fallbackReturnTo = "/admin";

const isSafeDashboardReturnPath = (value: string): boolean =>
  (value === "/admin" || value.startsWith("/admin/") || value === "/club" || value.startsWith("/club/")) &&
  !value.startsWith("//") &&
  !value.includes("\\");

const isSafeHostHeader = (value: string): boolean =>
  value.length > 0 &&
  !value.includes("/") &&
  !value.includes("\\") &&
  !value.includes("@") &&
  !/\s/.test(value);

const getRequestOrigin = (request: Request, requestUrl: URL): string => {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost !== null && isSafeHostHeader(forwardedHost)
    ? forwardedHost
    : request.headers.get("host");

  if (host === null || !isSafeHostHeader(host)) {
    return requestUrl.origin;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProto === "https" || requestUrl.protocol === "https:" ? "https" : "http";

  return `${protocol}://${host}`;
};

export const GET = (request: Request): NextResponse => {
  const requestUrl = new URL(request.url);
  const rawLocale = requestUrl.searchParams.get("locale");
  const rawReturnTo = requestUrl.searchParams.get("returnTo");
  const locale = rawLocale !== null && isDashboardLocale(rawLocale) ? rawLocale : "fi";
  const returnTo =
    rawReturnTo !== null && isSafeDashboardReturnPath(rawReturnTo) ? rawReturnTo : fallbackReturnTo;
  const response = NextResponse.redirect(new URL(returnTo, getRequestOrigin(request, requestUrl)));

  response.cookies.set({
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    name: getDashboardLocaleCookieName(),
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: locale,
  });

  return response;
};
