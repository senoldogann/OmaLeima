import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getClubDashboardNavigationItems } from "@/features/dashboard/sections";
import { fetchClubEventContextAsync } from "@/features/club-events/context";
import { ClubRewardsPanel } from "@/features/club-rewards/components/club-rewards-panel";
import { fetchClubRewardsSnapshotAsync } from "@/features/club-rewards/read-model";
import { createServerComponentClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ClubRewardsPage() {
  const supabase = await createServerComponentClient();
  const context = await fetchClubEventContextAsync(supabase);
  const canManageRewards = context.memberships.some((membership) => membership.canCreateEvents);

  if (!canManageRewards) {
    redirect("/forbidden");
  }

  const snapshot = await fetchClubRewardsSnapshotAsync(supabase);

  return (
    <DashboardShell
      activeHref="/club/rewards"
      areaLabel="Club operations"
      navigationItems={getClubDashboardNavigationItems(canManageRewards)}
      roleLabel={context.access.primaryRole}
      subtitle="Manage event reward thresholds, stock visibility, and claim handoff instructions from one organizer surface."
      title="Reward tiers"
      userEmail={context.access.userEmail}
    >
      <ClubRewardsPanel snapshot={snapshot} />
    </DashboardShell>
  );
}
