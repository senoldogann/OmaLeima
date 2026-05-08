import { resolveCurrentAdminAccessAsync } from "@/features/auth/access";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getDashboardLocaleAsync } from "@/features/dashboard/i18n";
import { adminDashboardNavigationItems } from "@/features/dashboard/sections";
import { SupportRequestsPanel } from "@/features/support-requests/components/support-requests-panel";
import { fetchSupportRequestsSnapshotAsync } from "@/features/support-requests/read-model";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminSupportRequestsPage() {
  const supabase = await createServerComponentClient();
  const [access, locale, snapshot] = await Promise.all([
    resolveCurrentAdminAccessAsync(),
    getDashboardLocaleAsync(),
    fetchSupportRequestsSnapshotAsync(supabase),
  ]);

  return (
    <DashboardShell
      activeHref="/admin/support-requests"
      areaLabel="Platform admin"
      locale={locale}
      navigationItems={adminDashboardNavigationItems}
      roleLabel={access.primaryRole}
      subtitle="Review mobile support requests from students, businesses, and organizers, then answer in-app."
      title="Mobile support"
      userEmail={access.userEmail}
    >
      <SupportRequestsPanel locale={locale} snapshot={snapshot} />
    </DashboardShell>
  );
}
