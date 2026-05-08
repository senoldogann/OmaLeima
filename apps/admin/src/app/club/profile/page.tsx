import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getDashboardLocaleAsync } from "@/features/dashboard/i18n";
import { getClubDashboardNavigationItems } from "@/features/dashboard/sections";
import { fetchClubProfileSnapshotAsync } from "@/features/club-profile/read-model";
import { ClubProfilePanel } from "@/features/club-profile/components/club-profile-panel";
import { createServerComponentClient } from "@/lib/supabase/server";
import { resolveCurrentAdminAccessAsync } from "@/features/auth/access";

export default async function ClubProfilePage() {
  const supabase = await createServerComponentClient();
  const [access, locale, snapshot] = await Promise.all([
    resolveCurrentAdminAccessAsync(),
    getDashboardLocaleAsync(),
    fetchClubProfileSnapshotAsync(supabase),
  ]);
  const canManageRewards = snapshot.clubs.some((club) => club.canEditProfile);

  return (
    <DashboardShell
      activeHref="/club/profile"
      areaLabel="Organizer workspace"
      locale={locale}
      navigationItems={getClubDashboardNavigationItems(canManageRewards)}
      roleLabel="Club organizer"
      subtitle="Update public club contact details and organizer profile information."
      title="Organizer profile"
      userEmail={access.userEmail}
    >
      <ClubProfilePanel locale={locale} snapshot={snapshot} />
    </DashboardShell>
  );
}
