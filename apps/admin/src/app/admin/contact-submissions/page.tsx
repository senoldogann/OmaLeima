import { resolveAdminAccessAsync } from "@/features/auth/access";
import { ContactSubmissionsPanel } from "@/features/contact-submissions/components/contact-submissions-panel";
import { fetchContactSubmissionsSnapshotAsync } from "@/features/contact-submissions/read-model";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { adminDashboardNavigationItems } from "@/features/dashboard/sections";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminContactSubmissionsPage() {
  const supabase = await createServerComponentClient();
  const [access, snapshot] = await Promise.all([
    resolveAdminAccessAsync(supabase),
    fetchContactSubmissionsSnapshotAsync(supabase),
  ]);

  return (
    <DashboardShell
      activeHref="/admin/contact-submissions"
      areaLabel="Platform admin"
      navigationItems={adminDashboardNavigationItems}
      roleLabel={access.primaryRole}
      subtitle="Public site iletişim formundan gelen başvuruları görüntüle, durumlarını güncelle ve eklere eriş."
      title="Contact submissions"
      userEmail={access.userEmail}
    >
      <ContactSubmissionsPanel snapshot={snapshot} />
    </DashboardShell>
  );
}
