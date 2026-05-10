import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";

const isRecoverableSessionError = (message: string): boolean => {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("auth session missing") ||
    normalizedMessage.includes("session_not_found") ||
    normalizedMessage.includes("cannot create property 'user' on string") ||
    normalizedMessage.includes("invalid refresh token") ||
    normalizedMessage.includes("refresh token not found") ||
    normalizedMessage.includes("refresh_token_not_found")
  );
};

const isSupabaseAuthCookieName = (name: string): boolean => name.startsWith("sb-");

const isSupabaseSessionCookieName = (name: string): boolean =>
  isSupabaseAuthCookieName(name) && name.endsWith("-auth-token");

const isPotentialSessionCookieValue = (value: string): boolean => {
  const trimmedValue = value.trim();

  return (
    trimmedValue.length === 0 ||
    trimmedValue.startsWith("base64-") ||
    trimmedValue.startsWith("[") ||
    trimmedValue.startsWith("{")
  );
};

const hasSupabaseAuthCookie = (request: NextRequest): boolean =>
  request.cookies.getAll().some((cookie) => isSupabaseAuthCookieName(cookie.name));

const hasMalformedSupabaseSessionCookie = (request: NextRequest): boolean =>
  request.cookies
    .getAll()
    .some((cookie) => isSupabaseSessionCookieName(cookie.name) && !isPotentialSessionCookieValue(cookie.value));

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const expireSupabaseAuthCookies = (request: NextRequest, response: NextResponse): NextResponse => {
  request.cookies
    .getAll()
    .filter((cookie) => isSupabaseAuthCookieName(cookie.name))
    .forEach((cookie) => {
      response.cookies.set(cookie.name, "", {
        maxAge: 0,
        path: "/",
      });
    });

  return response;
};

const createExpiredSessionRedirect = (request: NextRequest): NextResponse => {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/login";
  redirectUrl.search = "";
  redirectUrl.searchParams.set("session", "expired");

  return expireSupabaseAuthCookies(request, NextResponse.redirect(redirectUrl, 303));
};

export const updateSession = async (request: NextRequest): Promise<NextResponse> => {
  if (hasMalformedSupabaseSessionCookie(request)) {
    return createExpiredSessionRedirect(request);
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const userResult = await supabase.auth.getUser().catch((error: unknown) => {
    const message = getErrorMessage(error);

    if (isRecoverableSessionError(message)) {
      return {
        data: {
          user: null,
        },
        error: {
          message,
        },
      };
    }

    throw new Error(`Failed to refresh Supabase auth user in proxy: ${message}`);
  });

  if (userResult.error !== null) {
    if (isRecoverableSessionError(userResult.error.message)) {
      if (hasSupabaseAuthCookie(request)) {
        return createExpiredSessionRedirect(request);
      }

      return response;
    }

    throw new Error(`Failed to refresh Supabase auth user in proxy: ${userResult.error.message}`);
  }

  return response;
};
