import { Suspense } from "react";

import { fetchClubEventContextAsync } from "@/features/club-events/context";
import { ClubReportsPanel } from "@/features/club-reports/components/club-reports-panel";
import { fetchClubReportsSnapshotAsync } from "@/features/club-reports/read-model";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getDashboardLocaleAsync, type DashboardLocale } from "@/features/dashboard/i18n";
import { getClubDashboardNavigationItems } from "@/features/dashboard/sections";
import { createServerComponentClient } from "@/lib/supabase/server";

async function ClubReportsPanelFetcher({ locale }: { locale: DashboardLocale }) {
  const supabase = await createServerComponentClient();
  const snapshot = await fetchClubReportsSnapshotAsync(supabase);

  return <ClubReportsPanel locale={locale} snapshot={snapshot} />;
}

export default async function ClubReportsPage() {
  const supabase = await createServerComponentClient();
  const [context, locale] = await Promise.all([
    fetchClubEventContextAsync(supabase),
    getDashboardLocaleAsync(),
  ]);
  const canManageRewards = context.memberships.some((membership) => membership.canCreateEvents);

  return (
    <DashboardShell
      activeHref="/club/reports"
      areaLabel="Club operations"
      locale={locale}
      navigationItems={getClubDashboardNavigationItems(canManageRewards)}
      roleLabel={context.access.primaryRole}
      subtitle="Measure event participation, venue traffic, reward conversion, and post-event re-engagement from one place."
      title="Organizer reports"
      userEmail={context.access.userEmail}
    >
      <Suspense fallback={<article className="panel"><p className="muted-text">{locale === "fi" ? "Ladataan raporttia..." : "Loading report..."}</p></article>}>
        <ClubReportsPanelFetcher locale={locale} />
      </Suspense>
    </DashboardShell>
  );
}
