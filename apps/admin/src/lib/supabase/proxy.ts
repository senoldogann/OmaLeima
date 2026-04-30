import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";

const isMissingSessionError = (message: string): boolean =>
  message.toLowerCase().includes("auth session missing") ||
  message.toLowerCase().includes("session_not_found");

export const updateSession = async (request: NextRequest): Promise<NextResponse> => {
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

  const userResult = await supabase.auth.getUser();

  if (userResult.error !== null) {
    if (isMissingSessionError(userResult.error.message)) {
      return response;
    }

    throw new Error(`Failed to refresh Supabase auth user in proxy: ${userResult.error.message}`);
  }

  return response;
};
