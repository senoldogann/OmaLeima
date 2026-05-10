import { redirect } from "next/navigation";

import { resolveCurrentAdminAccessAsync } from "@/features/auth/access";
import { ClubRewardsPanel } from "@/features/club-rewards/components/club-rewards-panel";
import { fetchClubRewardsSnapshotAsync } from "@/features/club-rewards/read-model";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getDashboardLocaleAsync } from "@/features/dashboard/i18n";
import { adminDashboardNavigationItems } from "@/features/dashboard/sections";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function AdminRewardsPage() {
  const supabase = await createServerComponentClient();
  const [access, locale] = await Promise.all([
    resolveCurrentAdminAccessAsync(),
    getDashboardLocaleAsync(),
  ]);

  if (access.area !== "admin") {
    redirect("/forbidden");
  }

  const snapshot = await fetchClubRewardsSnapshotAsync(supabase);

  return (
    <DashboardShell
      activeHref="/admin/rewards"
      areaLabel="Admin operations"
      locale={locale}
      navigationItems={adminDashboardNavigationItems}
      roleLabel={access.primaryRole}
      subtitle="Manage reward tiers across platform events, including safe deletion that preserves claim history."
      title="Reward tiers"
      userEmail={access.userEmail}
    >
      <ClubRewardsPanel locale={locale} snapshot={snapshot} />
    </DashboardShell>
  );
}
