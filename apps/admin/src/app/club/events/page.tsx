import { Suspense } from "react";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getClubDashboardNavigationItems } from "@/features/dashboard/sections";
import { ClubEventsPanel } from "@/features/club-events/components/club-events-panel";
import { fetchClubEventContextAsync } from "@/features/club-events/context";
import { fetchClubEventsSnapshotAsync } from "@/features/club-events/read-model";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getDashboardLocaleAsync, type DashboardLocale } from "@/features/dashboard/i18n";

async function ClubEventsPanelFetcher({ locale }: { locale: DashboardLocale }) {
  const supabase = await createServerComponentClient();
  const snapshot = await fetchClubEventsSnapshotAsync(supabase);
  return <ClubEventsPanel locale={locale} snapshot={snapshot} />;
}

export default async function ClubEventsPage() {
  const supabase = await createServerComponentClient();
  const [context, locale] = await Promise.all([
    fetchClubEventContextAsync(supabase),
    getDashboardLocaleAsync(),
  ]);
  const canManageRewards = context.memberships.some((membership) => membership.canCreateEvents);

  return (
    <DashboardShell
      activeHref="/club/events"
      areaLabel="Club operations"
      locale={locale}
      navigationItems={getClubDashboardNavigationItems(canManageRewards)}
      roleLabel={context.access.primaryRole}
      subtitle="Create draft events for your active clubs, then continue with venues, rewards, and event-day preparation."
      title="Club events"
      userEmail={context.access.userEmail}
    >
      <Suspense fallback={<article className="panel"><p className="muted-text">{locale === "fi" ? "Ladataan / Loading..." : "Loading..."}</p></article>}>
        <ClubEventsPanelFetcher locale={locale} />
      </Suspense>
    </DashboardShell>
  );
}
