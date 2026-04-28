import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { clubDashboardNavigationItems } from "@/features/dashboard/sections";
import { ClubEventsPanel } from "@/features/club-events/components/club-events-panel";
import { fetchClubEventContextAsync } from "@/features/club-events/context";
import { fetchClubEventsSnapshotAsync } from "@/features/club-events/read-model";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function ClubEventsPage() {
  const supabase = await createServerComponentClient();
  const [context, snapshot] = await Promise.all([
    fetchClubEventContextAsync(supabase),
    fetchClubEventsSnapshotAsync(supabase),
  ]);

  return (
    <DashboardShell
      activeHref="/club/events"
      areaLabel="Club operations"
      navigationItems={clubDashboardNavigationItems}
      roleLabel={context.access.primaryRole}
      subtitle="Create draft events for your active clubs, then continue with venues, rewards, and event-day preparation."
      title="Club events"
      userEmail={context.access.userEmail}
    >
      <ClubEventsPanel snapshot={snapshot} />
    </DashboardShell>
  );
}
