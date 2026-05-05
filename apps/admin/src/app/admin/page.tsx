// Admin home: actionable shortcut cards + ozet metrik seridi.
// Eski statik bullet listesi yerine canli sayilarla gercek bir operasyon panosu sunar.

import { resolveAdminAccessAsync } from "@/features/auth/access";
import { fetchAdminAnnouncementsSnapshotAsync } from "@/features/announcements/read-model";
import { fetchBusinessApplicationsReviewQueueAsync } from "@/features/business-applications/read-model";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { DashboardShortcutsGrid } from "@/features/dashboard/components/dashboard-shortcuts-grid";
import {
  adminDashboardNavigationItems,
  buildAdminDashboardShortcuts,
} from "@/features/dashboard/sections";
import type { DashboardOverviewMetric } from "@/features/dashboard/types";
import { fetchAdminOversightSnapshotAsync } from "@/features/oversight/read-model";
import { createServerComponentClient } from "@/lib/supabase/server";

type AdminOverviewSource = {
  oversightSummary: {
    activeClubCount: number;
    openFraudSignalCount: number;
    operationalEventCount: number;
    recentAuditCount: number;
  };
  pendingBusinessApplicationCount: number;
};

const buildAdminOverviewMetrics = (source: AdminOverviewSource): DashboardOverviewMetric[] => [
  {
    description: "Active clubs visible to system admins.",
    label: "Active clubs",
    tone: "accent",
    value: String(source.oversightSummary.activeClubCount),
  },
  {
    description: "Draft, published, or active events that are still operationally relevant.",
    label: "Operational events",
    tone: "neutral",
    value: String(source.oversightSummary.operationalEventCount),
  },
  {
    description: "Open fraud signals waiting for an explicit review.",
    label: "Open fraud signals",
    tone: source.oversightSummary.openFraudSignalCount > 0 ? "warning" : "neutral",
    value: String(source.oversightSummary.openFraudSignalCount),
  },
  {
    description: "Business applications still waiting for an admin decision.",
    label: "Pending applications",
    tone: source.pendingBusinessApplicationCount > 0 ? "warning" : "neutral",
    value: String(source.pendingBusinessApplicationCount),
  },
];

export default async function AdminPage() {
  const supabase = await createServerComponentClient();
  const [access, oversightSnapshot, businessApplications, announcementsSnapshot] = await Promise.all([
    resolveAdminAccessAsync(supabase),
    fetchAdminOversightSnapshotAsync(supabase),
    fetchBusinessApplicationsReviewQueueAsync(supabase, 1),
    fetchAdminAnnouncementsSnapshotAsync(supabase),
  ]);

  const shortcuts = buildAdminDashboardShortcuts({
    activeClubCount: oversightSnapshot.summary.activeClubCount,
    announcementCount: announcementsSnapshot.announcements.length,
    openFraudSignalCount: oversightSnapshot.summary.openFraudSignalCount,
    operationalEventCount: oversightSnapshot.summary.operationalEventCount,
    pendingBusinessApplicationCount: businessApplications.summary.pendingCount,
    recentAuditCount: oversightSnapshot.summary.recentAuditCount,
  });

  const metrics = buildAdminOverviewMetrics({
    oversightSummary: oversightSnapshot.summary,
    pendingBusinessApplicationCount: businessApplications.summary.pendingCount,
  });

  return (
    <DashboardShell
      activeHref="/admin"
      areaLabel="Platform admin"
      navigationItems={adminDashboardNavigationItems}
      roleLabel={access.primaryRole}
      subtitle="Moderate platform-wide supply, review incoming business applications, and keep event integrity visible from one operational surface."
      title="Operations dashboard"
      userEmail={access.userEmail}
    >
      <section className="overview-strip" aria-label="Operational pulse">
        {metrics.map((metric) => (
          <article key={metric.label} className={`overview-tile overview-tile-${metric.tone}`}>
            <span className="overview-tile-label">{metric.label}</span>
            <strong className="overview-tile-value">{metric.value}</strong>
            <p className="overview-tile-description">{metric.description}</p>
          </article>
        ))}
      </section>

      <DashboardShortcutsGrid shortcuts={shortcuts} />
    </DashboardShell>
  );
}
