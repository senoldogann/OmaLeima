import { resolveAdminAccessAsync } from "@/features/auth/access";
import { BusinessApplicationsPanel } from "@/features/business-applications/components/business-applications-panel";
import { fetchBusinessApplicationsReviewQueueAsync } from "@/features/business-applications/read-model";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { adminDashboardNavigationItems } from "@/features/dashboard/sections";
import { createServerComponentClient } from "@/lib/supabase/server";

type AdminBusinessApplicationsPageProps = {
  searchParams: Promise<{
    page?: string | string[] | undefined;
  }>;
};

const parsePageNumber = (value: string | string[] | undefined): number => {
  if (typeof value !== "string") {
    return 1;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return 1;
  }

  return parsedValue;
};

export default async function AdminBusinessApplicationsPage({
  searchParams,
}: AdminBusinessApplicationsPageProps) {
  const supabase = await createServerComponentClient();
  const resolvedSearchParams = await searchParams;
  const pageNumber = parsePageNumber(resolvedSearchParams.page);
  const [access, reviewQueue] = await Promise.all([
    resolveAdminAccessAsync(supabase),
    fetchBusinessApplicationsReviewQueueAsync(supabase, pageNumber),
  ]);

  return (
    <DashboardShell
      activeHref="/admin/business-applications"
      areaLabel="Platform admin"
      navigationItems={adminDashboardNavigationItems}
      roleLabel={access.primaryRole}
      subtitle="Review pending business applications through the same admin-owned approval flow used by the backend."
      title="Business applications"
      userEmail={access.userEmail}
    >
      <BusinessApplicationsPanel reviewQueue={reviewQueue} />
    </DashboardShell>
  );
}
