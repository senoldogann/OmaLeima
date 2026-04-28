import { NextResponse, type NextRequest } from "next/server";

import { resolveAdminAccessAsync } from "@/features/auth/access";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectBase = requestUrl.origin;
  const supabase = await createRouteHandlerClient();

  if (typeof code === "string") {
    const exchangeResult = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeResult.error !== null) {
      const loginUrl = new URL("/login", redirectBase);
      loginUrl.searchParams.set("error", exchangeResult.error.message);
      return NextResponse.redirect(loginUrl);
    }
  }

  const access = await resolveAdminAccessAsync(supabase);

  return NextResponse.redirect(new URL(access.homeHref, redirectBase));
}
