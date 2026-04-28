import { resolveAdminAccessAsync } from "@/features/auth/access";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { adminDashboardNavigationItems } from "@/features/dashboard/sections";
import { DepartmentTagsPanel } from "@/features/department-tags/components/department-tags-panel";
import { fetchDepartmentTagModerationSnapshotAsync } from "@/features/department-tags/read-model";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function AdminDepartmentTagsPage() {
  const supabase = await createServerComponentClient();
  const [access, snapshot] = await Promise.all([
    resolveAdminAccessAsync(supabase),
    fetchDepartmentTagModerationSnapshotAsync(supabase),
  ]);

  return (
    <DashboardShell
      activeHref="/admin/department-tags"
      areaLabel="Platform admin"
      navigationItems={adminDashboardNavigationItems}
      roleLabel={access.primaryRole}
      subtitle="Merge duplicate department tags into canonical labels or block low-quality tags without leaving the admin area."
      title="Department tags"
      userEmail={access.userEmail}
    >
      <DepartmentTagsPanel snapshot={snapshot} />
    </DashboardShell>
  );
}
