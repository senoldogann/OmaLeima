import { resolveCurrentAdminAccessAsync } from "@/features/auth/access";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getDashboardLocaleAsync } from "@/features/dashboard/i18n";
import { adminDashboardNavigationItems } from "@/features/dashboard/sections";
import { DepartmentTagsPanel } from "@/features/department-tags/components/department-tags-panel";
import { fetchDepartmentTagModerationSnapshotAsync } from "@/features/department-tags/read-model";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function AdminDepartmentTagsPage() {
  const supabase = await createServerComponentClient();
  const [access, snapshot, locale] = await Promise.all([
    resolveCurrentAdminAccessAsync(),
    fetchDepartmentTagModerationSnapshotAsync(supabase),
    getDashboardLocaleAsync(),
  ]);

  return (
    <DashboardShell
      activeHref="/admin/department-tags"
      areaLabel="Platform admin"
      locale={locale}
      navigationItems={adminDashboardNavigationItems}
      roleLabel={access.primaryRole}
      subtitle="Merge duplicate department tags into canonical labels or block low-quality tags without leaving the admin area."
      title="Department tags"
      userEmail={access.userEmail}
    >
      <DepartmentTagsPanel locale={locale} snapshot={snapshot} />
    </DashboardShell>
  );
}
