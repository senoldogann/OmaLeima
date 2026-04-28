import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { clubDashboardSections } from "@/features/dashboard/sections";
import { resolveAdminAccessAsync } from "@/features/auth/access";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function ClubPage() {
  const supabase = await createServerComponentClient();
  const access = await resolveAdminAccessAsync(supabase);

  return (
    <DashboardShell
      areaLabel="Club operations"
      roleLabel={access.primaryRole}
      sections={clubDashboardSections}
      subtitle="Configure club-owned events, track reward flow, and keep organizer-facing moderation surfaces in one place."
      title="Organizer dashboard"
      userEmail={access.userEmail}
    />
  );
}
