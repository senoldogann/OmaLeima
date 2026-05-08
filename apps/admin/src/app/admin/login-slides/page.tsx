import { resolveCurrentAdminAccessAsync } from "@/features/auth/access";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getDashboardLocaleAsync } from "@/features/dashboard/i18n";
import { adminDashboardNavigationItems } from "@/features/dashboard/sections";
import { LoginSlidesPanel } from "@/features/login-slides/components/login-slides-panel";
import { fetchAdminLoginSlidesAsync } from "@/features/login-slides/read-model";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function AdminLoginSlidesPage() {
  const supabase = await createServerComponentClient();
  const [access, locale] = await Promise.all([
    resolveCurrentAdminAccessAsync(),
    getDashboardLocaleAsync(),
  ]);

  if (access.area !== "admin") {
    throw new Error("Login slides page requires an active platform admin session.");
  }

  const slides = await fetchAdminLoginSlidesAsync(supabase);

  return (
    <DashboardShell
      activeHref="/admin/login-slides"
      areaLabel="Platform admin"
      locale={locale}
      navigationItems={adminDashboardNavigationItems}
      roleLabel={access.primaryRole}
      subtitle="Manage the visual slides shown on the admin login page without a code deploy."
      title="Login slides"
      userEmail={access.userEmail}
    >
      <LoginSlidesPanel locale={locale} slides={slides} />
    </DashboardShell>
  );
}
