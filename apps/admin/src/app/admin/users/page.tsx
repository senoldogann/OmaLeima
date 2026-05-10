import { resolveCurrentAdminAccessAsync } from "@/features/auth/access";
import { AdminUsersPanel } from "@/features/admin-users/components/admin-users-panel";
import { fetchAdminUsersSnapshotAsync } from "@/features/admin-users/read-model";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getDashboardLocaleAsync } from "@/features/dashboard/i18n";
import { adminDashboardNavigationItems } from "@/features/dashboard/sections";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function AdminUsersPage() {
  const supabase = await createServerComponentClient();
  const [access, locale] = await Promise.all([
    resolveCurrentAdminAccessAsync(),
    getDashboardLocaleAsync(),
  ]);

  if (access.area !== "admin" || access.userId === null) {
    throw new Error("Admin users page requires an active platform admin session.");
  }

  const snapshot = await fetchAdminUsersSnapshotAsync(supabase);

  return (
    <DashboardShell
      activeHref="/admin/users"
      areaLabel="Platform admin"
      locale={locale}
      navigationItems={adminDashboardNavigationItems}
      roleLabel={access.primaryRole}
      subtitle="Review every user account and activate or passivate profiles from one platform-admin table."
      title="Users"
      userEmail={access.userEmail}
    >
      <AdminUsersPanel currentUserId={access.userId} locale={locale} snapshot={snapshot} />
    </DashboardShell>
  );
}
