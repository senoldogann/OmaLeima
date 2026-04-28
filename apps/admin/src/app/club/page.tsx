import { DashboardSectionsGrid } from "@/features/dashboard/components/dashboard-sections-grid";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getClubDashboardNavigationItems, getClubDashboardSections } from "@/features/dashboard/sections";
import { fetchClubEventContextAsync } from "@/features/club-events/context";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function ClubPage() {
  const supabase = await createServerComponentClient();
  const context = await fetchClubEventContextAsync(supabase);
  const canManageRewards = context.memberships.some((membership) => membership.canCreateEvents);

  return (
    <DashboardShell
      activeHref="/club"
      areaLabel="Club operations"
      navigationItems={getClubDashboardNavigationItems(canManageRewards)}
      roleLabel={context.access.primaryRole}
      subtitle="Configure club-owned events, track reward flow, and keep organizer-facing moderation surfaces in one place."
      title="Organizer dashboard"
      userEmail={context.access.userEmail}
    >
      <DashboardSectionsGrid sections={getClubDashboardSections(canManageRewards)} />
    </DashboardShell>
  );
}
