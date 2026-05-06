import { resolveAdminAccessAsync } from "@/features/auth/access";
import { AnnouncementsPanel } from "@/features/announcements/components/announcements-panel";
import { fetchAdminAnnouncementsSnapshotAsync } from "@/features/announcements/read-model";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getDashboardLocaleAsync } from "@/features/dashboard/i18n";
import { adminDashboardNavigationItems } from "@/features/dashboard/sections";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function AdminAnnouncementsPage() {
  const supabase = await createServerComponentClient();
  const [access, snapshot, locale] = await Promise.all([
    resolveAdminAccessAsync(supabase),
    fetchAdminAnnouncementsSnapshotAsync(supabase),
    getDashboardLocaleAsync(),
  ]);

  return (
    <DashboardShell
      activeHref="/admin/announcements"
      areaLabel="Platform admin"
      locale={locale}
      navigationItems={adminDashboardNavigationItems}
      roleLabel={access.primaryRole}
      subtitle="Publish platform-wide in-app messages before adding push fan-out and read receipts."
      title="Announcements"
      userEmail={access.userEmail}
    >
      <AnnouncementsPanel locale={locale} snapshot={snapshot} />
    </DashboardShell>
  );
}
