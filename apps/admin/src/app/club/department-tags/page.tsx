import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getClubDashboardNavigationItems } from "@/features/dashboard/sections";
import { ClubDepartmentTagsPanel } from "@/features/club-department-tags/components/club-department-tags-panel";
import { fetchClubDepartmentTagsSnapshotAsync } from "@/features/club-department-tags/read-model";
import { fetchClubEventContextAsync } from "@/features/club-events/context";
import { createServerComponentClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ClubDepartmentTagsPage() {
  const supabase = await createServerComponentClient();
  const context = await fetchClubEventContextAsync(supabase);
  const canManageDepartmentTags = context.memberships.some((membership) => membership.canCreateEvents);

  if (!canManageDepartmentTags) {
    redirect("/forbidden");
  }

  const snapshot = await fetchClubDepartmentTagsSnapshotAsync(supabase);

  return (
    <DashboardShell
      activeHref="/club/department-tags"
      areaLabel="Club operations"
      navigationItems={getClubDashboardNavigationItems(canManageDepartmentTags)}
      roleLabel={context.access.primaryRole}
      subtitle="Publish official study labels for your community so students see canonical department tags before custom ones."
      title="Department tags"
      userEmail={context.access.userEmail}
    >
      <ClubDepartmentTagsPanel snapshot={snapshot} />
    </DashboardShell>
  );
}
