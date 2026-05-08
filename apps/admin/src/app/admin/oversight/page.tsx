import { Suspense } from "react";
import { resolveCurrentAdminAccessAsync } from "@/features/auth/access";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getDashboardLocaleAsync, type DashboardLocale } from "@/features/dashboard/i18n";
import { adminDashboardNavigationItems } from "@/features/dashboard/sections";
import { OversightPanel } from "@/features/oversight/components/oversight-panel";
import { fetchAdminOversightSnapshotAsync } from "@/features/oversight/read-model";
import { createServerComponentClient } from "@/lib/supabase/server";

async function OversightPanelFetcher({ locale }: { locale: DashboardLocale }) {
  const supabase = await createServerComponentClient();
  const snapshot = await fetchAdminOversightSnapshotAsync(supabase);
  return <OversightPanel locale={locale} snapshot={snapshot} />;
}

export default async function AdminOversightPage() {
  const [access, locale] = await Promise.all([
    resolveCurrentAdminAccessAsync(),
    getDashboardLocaleAsync(),
  ]);

  return (
    <DashboardShell
      activeHref="/admin/oversight"
      areaLabel="Platform admin"
      locale={locale}
      navigationItems={adminDashboardNavigationItems}
      roleLabel={access.primaryRole}
      subtitle="Track platform-wide clubs, events, audit activity, and fraud signals from one operational surface."
      title="Platform oversight"
      userEmail={access.userEmail}
    >
      <Suspense fallback={<article className="panel"><p className="muted-text">{locale === "fi" ? "Ladataan / Loading..." : "Loading..."}</p></article>}>
        <OversightPanelFetcher locale={locale} />
      </Suspense>
    </DashboardShell>
  );
}
