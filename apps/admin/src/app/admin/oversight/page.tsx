import { resolveAdminAccessAsync } from "@/features/auth/access";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getDashboardLocaleAsync } from "@/features/dashboard/i18n";
import { adminDashboardNavigationItems } from "@/features/dashboard/sections";
import { OversightPanel } from "@/features/oversight/components/oversight-panel";
import { fetchAdminOversightSnapshotAsync } from "@/features/oversight/read-model";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function AdminOversightPage() {
  const supabase = await createServerComponentClient();
  const [access, locale, snapshot] = await Promise.all([
    resolveAdminAccessAsync(supabase),
    getDashboardLocaleAsync(),
    fetchAdminOversightSnapshotAsync(supabase),
  ]);

  return (
    <DashboardShell
      activeHref="/admin/oversight"
      areaLabel="Platform admin"
      locale={locale}
      navigationItems={adminDashboardNavigationItems}
      roleLabel={access.primaryRole}
      subtitle="Track platform-wide clubs, events, audit activity, and fraud signals from one operational surface."
      title="Platform oversight"
      userEmail={access.userEmail}
    >
      <OversightPanel locale={locale} snapshot={snapshot} />
    </DashboardShell>
  );
}
