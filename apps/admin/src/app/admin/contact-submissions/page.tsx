import { resolveAdminAccessAsync } from "@/features/auth/access";
import { ContactSubmissionsPanel } from "@/features/contact-submissions/components/contact-submissions-panel";
import { fetchContactSubmissionsSnapshotAsync } from "@/features/contact-submissions/read-model";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getDashboardLocaleAsync } from "@/features/dashboard/i18n";
import { adminDashboardNavigationItems } from "@/features/dashboard/sections";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminContactSubmissionsPage() {
  const supabase = await createServerComponentClient();
  const [access, locale, snapshot] = await Promise.all([
    resolveAdminAccessAsync(supabase),
    getDashboardLocaleAsync(),
    fetchContactSubmissionsSnapshotAsync(supabase),
  ]);

  return (
    <DashboardShell
      activeHref="/admin/contact-submissions"
      areaLabel="Platform admin"
      locale={locale}
      navigationItems={adminDashboardNavigationItems}
      roleLabel={access.primaryRole}
      subtitle="Review public contact form messages, update their status, and open private attachments."
      title="Contact submissions"
      userEmail={access.userEmail}
    >
      <ContactSubmissionsPanel locale={locale} snapshot={snapshot} />
    </DashboardShell>
  );
}
