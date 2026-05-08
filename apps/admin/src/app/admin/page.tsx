// Admin home: actionable shortcut cards + ozet metrik seridi.
// Eski statik bullet listesi yerine canli sayilarla gercek bir operasyon panosu sunar.

import { Suspense } from "react";
import { resolveCurrentAdminAccessAsync } from "@/features/auth/access";
import { fetchAdminAnnouncementsSnapshotAsync } from "@/features/announcements/read-model";
import { fetchBusinessApplicationsReviewQueueAsync } from "@/features/business-applications/read-model";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { DashboardShortcutsGrid } from "@/features/dashboard/components/dashboard-shortcuts-grid";
import { DashboardLastUpdated } from "@/features/dashboard/components/dashboard-last-updated";
import { getDashboardLocaleAsync } from "@/features/dashboard/i18n";
import type { DashboardLocale } from "@/features/dashboard/i18n";
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

const buildAdminOverviewMetrics = (source: AdminOverviewSource, locale: DashboardLocale): DashboardOverviewMetric[] => [
  {
    description: locale === "fi" ? "Järjestelmäadminille näkyvät aktiiviset klubit." : "Active clubs visible to system admins.",
    label: locale === "fi" ? "Aktiiviset klubit" : "Active clubs",
    tone: "accent",
    value: String(source.oversightSummary.activeClubCount),
  },
  {
    description: locale === "fi" ? "Luonnos-, julkaistut tai aktiiviset tapahtumat, jotka ovat yhä toiminnallisesti merkityksellisiä." : "Draft, published, or active events that are still operationally relevant.",
    label: locale === "fi" ? "Käynnissä olevat tapahtumat" : "Operational events",
    tone: "neutral",
    value: String(source.oversightSummary.operationalEventCount),
  },
  {
    description: locale === "fi" ? "Avoimet väärinkäyttösignaalit, jotka odottavat tarkistusta." : "Open fraud signals waiting for an explicit review.",
    label: locale === "fi" ? "Väärinkäyttösignaalit" : "Open fraud signals",
    tone: source.oversightSummary.openFraudSignalCount > 0 ? "urgent" : "neutral",
    value: String(source.oversightSummary.openFraudSignalCount),
  },
  {
    description: locale === "fi" ? "Yrityshakemukset, jotka odottavat admin-päätöstä." : "Business applications still waiting for an admin decision.",
    label: locale === "fi" ? "Avoimet hakemukset" : "Pending applications",
    tone: source.pendingBusinessApplicationCount > 0 ? "urgent" : "neutral",
    value: String(source.pendingBusinessApplicationCount),
  },
];

async function AdminPageContent({ locale }: { locale: DashboardLocale }) {
  const supabase = await createServerComponentClient();
  const [oversightSnapshot, businessApplications, announcementsSnapshot] = await Promise.all([
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
  }, locale);

  const metrics = buildAdminOverviewMetrics({
    oversightSummary: oversightSnapshot.summary,
    pendingBusinessApplicationCount: businessApplications.summary.pendingCount,
  }, locale);

  return (
    <>
      <div className="overview-header">
        <DashboardLastUpdated locale={locale} />
      </div>
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
    </>
  );
}

export default async function AdminPage() {
  const [access, locale] = await Promise.all([
    resolveCurrentAdminAccessAsync(),
    getDashboardLocaleAsync(),
  ]);

  return (
    <DashboardShell
      activeHref="/admin"
      areaLabel="Platform admin"
      locale={locale}
      navigationItems={adminDashboardNavigationItems}
      roleLabel={access.primaryRole}
      subtitle="Moderate platform-wide supply, review incoming business applications, and keep event integrity visible from one operational surface."
      title="Operations dashboard"
      userEmail={access.userEmail}
    >
      <Suspense fallback={<article className="panel"><p className="muted-text">Ladataan / Loading...</p></article>}>
        <AdminPageContent locale={locale} />
      </Suspense>
    </DashboardShell>
  );
}
