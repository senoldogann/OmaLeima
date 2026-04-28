import { DashboardSectionsGrid } from "@/features/dashboard/components/dashboard-sections-grid";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { clubDashboardNavigationItems, clubDashboardSections } from "@/features/dashboard/sections";
import { resolveAdminAccessAsync } from "@/features/auth/access";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function ClubPage() {
  const supabase = await createServerComponentClient();
  const access = await resolveAdminAccessAsync(supabase);

  return (
    <DashboardShell
      activeHref="/club"
      areaLabel="Club operations"
      navigationItems={clubDashboardNavigationItems}
      roleLabel={access.primaryRole}
      subtitle="Configure club-owned events, track reward flow, and keep organizer-facing moderation surfaces in one place."
      title="Organizer dashboard"
      userEmail={access.userEmail}
    >
      <DashboardSectionsGrid sections={clubDashboardSections} />
    </DashboardShell>
  );
}
