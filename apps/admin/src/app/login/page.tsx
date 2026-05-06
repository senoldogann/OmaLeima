import { redirect } from "next/navigation";

import { AdminLoginPanel } from "@/features/auth/components/admin-login-panel";
import { resolveAdminAccessByUserIdAsync } from "@/features/auth/access";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createServerComponentClient();
  const isProtectionRequired =
    process.env.VERCEL === "1" || process.env.REQUIRE_CONTACT_TURNSTILE === "1";
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;
  const userResult = await supabase.auth.getUser();
  const userId = userResult.data.user?.id ?? null;

  if (userResult.error !== null && userId !== null) {
    throw new Error(`Failed to resolve hosted login user ${userId}: ${userResult.error.message}`);
  }

  if (userId === null) {
    return (
      <main className="login-page">
        <AdminLoginPanel isProtectionRequired={isProtectionRequired} turnstileSiteKey={turnstileSiteKey} />
      </main>
    );
  }

  const access = await resolveAdminAccessByUserIdAsync(supabase, userId);

  if (access.homeHref !== "/login") {
    redirect(access.homeHref);
  }

  return (
    <main className="login-page">
      <AdminLoginPanel isProtectionRequired={isProtectionRequired} turnstileSiteKey={turnstileSiteKey} />
    </main>
  );
}
