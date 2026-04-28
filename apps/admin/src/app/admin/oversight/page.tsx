import { resolveAdminAccessAsync } from "@/features/auth/access";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { adminDashboardNavigationItems } from "@/features/dashboard/sections";
import { OversightPanel } from "@/features/oversight/components/oversight-panel";
import { fetchAdminOversightSnapshotAsync } from "@/features/oversight/read-model";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function AdminOversightPage() {
  const supabase = await createServerComponentClient();
  const [access, snapshot] = await Promise.all([
    resolveAdminAccessAsync(supabase),
    fetchAdminOversightSnapshotAsync(supabase),
  ]);

  return (
    <DashboardShell
      activeHref="/admin/oversight"
      areaLabel="Platform admin"
      navigationItems={adminDashboardNavigationItems}
      roleLabel={access.primaryRole}
      subtitle="Track platform-wide clubs, events, audit activity, and fraud signals from one operational surface."
      title="Platform oversight"
      userEmail={access.userEmail}
    >
      <OversightPanel snapshot={snapshot} />
    </DashboardShell>
  );
}
