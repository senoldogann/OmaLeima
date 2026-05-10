import { NextResponse, type NextRequest } from "next/server";

const allowedCountry = "FI";
const dashboardCsrfCookieName = "omaleima_dashboard_csrf";
const modeValues = ["off", "admin", "all"] as const;

type GeofenceMode = (typeof modeValues)[number];

const isGeofenceMode = (value: string): value is GeofenceMode =>
  modeValues.includes(value as GeofenceMode);

const getGeofenceMode = (): GeofenceMode => {
  const rawMode = process.env.OMALEIMA_GEOFENCE_MODE;

  if (typeof rawMode !== "string" || !isGeofenceMode(rawMode)) {
    return "off";
  }

  return rawMode;
};

const getCountry = (request: NextRequest): string | null => {
  const vercelCountry = request.headers.get("x-vercel-ip-country");

  if (vercelCountry !== null && vercelCountry.trim().length > 0) {
    return vercelCountry.trim().toUpperCase();
  }

  const cloudflareCountry = request.headers.get("cf-ipcountry");

  if (cloudflareCountry !== null && cloudflareCountry.trim().length > 0) {
    return cloudflareCountry.trim().toUpperCase();
  }

  return null;
};

const isProtectedAdminPath = (pathname: string): boolean =>
  pathname === "/login" ||
  pathname === "/forbidden" ||
  pathname.startsWith("/admin") ||
  pathname.startsWith("/club") ||
  pathname.startsWith("/auth") ||
  pathname.startsWith("/api/admin") ||
  pathname.startsWith("/api/club") ||
  pathname.startsWith("/api/auth");

const isDashboardPath = (pathname: string): boolean =>
  pathname === "/login" || pathname.startsWith("/admin") || pathname.startsWith("/club");

const attachDashboardCsrfCookie = (request: NextRequest, response: NextResponse): NextResponse => {
  if (!isDashboardPath(request.nextUrl.pathname)) {
    return response;
  }

  const existingToken = request.cookies.get(dashboardCsrfCookieName)?.value;

  if (typeof existingToken === "string" && existingToken.length >= 32) {
    return response;
  }

  response.cookies.set(dashboardCsrfCookieName, crypto.randomUUID(), {
    httpOnly: false,
    sameSite: "strict",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
  });

  return response;
};

const shouldApplyGeofence = (mode: GeofenceMode, pathname: string): boolean => {
  if (mode === "off") {
    return false;
  }

  if (mode === "admin") {
    return isProtectedAdminPath(pathname);
  }

  return true;
};

export const proxy = (request: NextRequest): NextResponse => {
  const mode = getGeofenceMode();
  const pathname = request.nextUrl.pathname;

  if (!shouldApplyGeofence(mode, pathname)) {
    return attachDashboardCsrfCookie(request, NextResponse.next());
  }

  const country = getCountry(request);

  if (country === null || country === allowedCountry) {
    return attachDashboardCsrfCookie(request, NextResponse.next());
  }

  return new NextResponse("OmaLeima is currently available in Finland.", {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
    status: 451,
  });
};

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|robots.txt|sitemap.xml|manifest.webmanifest).*)"],
};
