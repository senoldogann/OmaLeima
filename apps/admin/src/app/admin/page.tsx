import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { adminDashboardSections } from "@/features/dashboard/sections";
import { resolveAdminAccessAsync } from "@/features/auth/access";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createServerComponentClient();
  const access = await resolveAdminAccessAsync(supabase);

  return (
    <DashboardShell
      areaLabel="Platform admin"
      roleLabel={access.primaryRole}
      sections={adminDashboardSections}
      subtitle="Moderate platform-wide supply, review incoming business applications, and keep event integrity visible from one operational surface."
      title="Operations dashboard"
      userEmail={access.userEmail}
    />
  );
}
