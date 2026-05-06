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

export const GET = (request: Request): NextResponse => {
  const requestUrl = new URL(request.url);
  const rawLocale = requestUrl.searchParams.get("locale");
  const rawReturnTo = requestUrl.searchParams.get("returnTo");
  const locale = rawLocale !== null && isDashboardLocale(rawLocale) ? rawLocale : "fi";
  const returnTo =
    rawReturnTo !== null && isSafeDashboardReturnPath(rawReturnTo) ? rawReturnTo : fallbackReturnTo;
  const response = NextResponse.redirect(new URL(returnTo, requestUrl.origin));

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
