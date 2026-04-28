import { DashboardSectionsGrid } from "@/features/dashboard/components/dashboard-sections-grid";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { adminDashboardNavigationItems, adminDashboardSections } from "@/features/dashboard/sections";
import { resolveAdminAccessAsync } from "@/features/auth/access";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createServerComponentClient();
  const access = await resolveAdminAccessAsync(supabase);

  return (
    <DashboardShell
      activeHref="/admin"
      areaLabel="Platform admin"
      navigationItems={adminDashboardNavigationItems}
      roleLabel={access.primaryRole}
      subtitle="Moderate platform-wide supply, review incoming business applications, and keep event integrity visible from one operational surface."
      title="Operations dashboard"
      userEmail={access.userEmail}
    >
      <DashboardSectionsGrid sections={adminDashboardSections} />
    </DashboardShell>
  );
}
