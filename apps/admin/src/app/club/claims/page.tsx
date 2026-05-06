import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getDashboardLocaleAsync } from "@/features/dashboard/i18n";
import { getClubDashboardNavigationItems } from "@/features/dashboard/sections";
import { ClubClaimsPanel } from "@/features/club-claims/components/club-claims-panel";
import { fetchClubClaimsSnapshotAsync } from "@/features/club-claims/read-model";
import { fetchClubEventContextAsync } from "@/features/club-events/context";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function ClubClaimsPage() {
  const supabase = await createServerComponentClient();
  const [context, locale, snapshot] = await Promise.all([
    fetchClubEventContextAsync(supabase),
    getDashboardLocaleAsync(),
    fetchClubClaimsSnapshotAsync(supabase),
  ]);
  const canManageRewards = context.memberships.some((membership) => membership.canCreateEvents);

  return (
    <DashboardShell
      activeHref="/club/claims"
      areaLabel="Club operations"
      locale={locale}
      navigationItems={getClubDashboardNavigationItems(canManageRewards)}
      roleLabel={context.access.primaryRole}
      subtitle="Confirm physical reward handoff for eligible students without exposing extra student profile data."
      title="Reward claims"
      userEmail={context.access.userEmail}
    >
      <ClubClaimsPanel locale={locale} snapshot={snapshot} />
    </DashboardShell>
  );
}
