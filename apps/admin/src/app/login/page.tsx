import { redirect } from "next/navigation";

import { AdminLoginPanel } from "@/features/auth/components/admin-login-panel";
import { resolveAdminAccessByUserIdAsync } from "@/features/auth/access";
import { getDashboardLocaleAsync } from "@/features/dashboard/i18n";
import { loginSlideFallbackRecords } from "@/features/login-slides/read-model";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createServerComponentClient();
  const isProtectionRequired =
    process.env.VERCEL === "1" || process.env.REQUIRE_CONTACT_TURNSTILE === "1";
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;
  const [userResult, locale] = await Promise.all([
    supabase.auth.getUser(),
    getDashboardLocaleAsync(),
  ]);
  const userId = userResult.data.user?.id ?? null;

  if (userResult.error !== null && userId !== null) {
    throw new Error("Failed to resolve hosted login session.");
  }

  if (userId === null) {
    return (
      <main className="login-page">
        <AdminLoginPanel
          isProtectionRequired={isProtectionRequired}
          locale={locale}
          slides={loginSlideFallbackRecords}
          turnstileSiteKey={turnstileSiteKey}
        />
      </main>
    );
  }

  const access = await resolveAdminAccessByUserIdAsync(supabase, userId);

  if (access.homeHref !== "/login") {
    redirect(access.homeHref);
  }

  return (
    <main className="login-page">
      <AdminLoginPanel
        isProtectionRequired={isProtectionRequired}
        locale={locale}
        slides={loginSlideFallbackRecords}
        turnstileSiteKey={turnstileSiteKey}
      />
    </main>
  );
}
