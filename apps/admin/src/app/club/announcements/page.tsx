import { AnnouncementsPanel } from "@/features/announcements/components/announcements-panel";
import { fetchClubAnnouncementsSnapshotAsync } from "@/features/announcements/read-model";
import { fetchClubEventContextAsync } from "@/features/club-events/context";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getClubDashboardNavigationItems } from "@/features/dashboard/sections";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function ClubAnnouncementsPage() {
  const supabase = await createServerComponentClient();
  const [context, snapshot] = await Promise.all([
    fetchClubEventContextAsync(supabase),
    fetchClubAnnouncementsSnapshotAsync(supabase),
  ]);
  const canManageRewards = context.memberships.some((membership) => membership.canCreateEvents);

  return (
    <DashboardShell
      activeHref="/club/announcements"
      areaLabel="Club operations"
      navigationItems={getClubDashboardNavigationItems(canManageRewards)}
      roleLabel={context.access.primaryRole}
      subtitle="Publish short in-app updates for students and club staff."
      title="Announcements"
      userEmail={context.access.userEmail}
    >
      <AnnouncementsPanel snapshot={snapshot} />
    </DashboardShell>
  );
}
