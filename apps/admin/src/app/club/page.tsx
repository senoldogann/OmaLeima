// Organizer (kulup) home: paralel snapshot fetch + canli sayilarla shortcut grid + ozet metrik seridi.
// Eski tek seferlik bullet panosunu degistirir; canManageRewards'e gore reward/dept-tag kartlari gorunur.

import { fetchClubAnnouncementsSnapshotAsync } from "@/features/announcements/read-model";
import { fetchClubClaimsSnapshotAsync } from "@/features/club-claims/read-model";
import { fetchClubDepartmentTagsSnapshotAsync } from "@/features/club-department-tags/read-model";
import { fetchClubEventContextAsync } from "@/features/club-events/context";
import { fetchClubEventsSnapshotAsync } from "@/features/club-events/read-model";
import { fetchClubRewardsSnapshotAsync } from "@/features/club-rewards/read-model";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { DashboardShortcutsGrid } from "@/features/dashboard/components/dashboard-shortcuts-grid";
import {
  buildClubDashboardShortcuts,
  getClubDashboardNavigationItems,
} from "@/features/dashboard/sections";
import type { DashboardOverviewMetric } from "@/features/dashboard/types";
import { fetchFraudReviewSnapshotAsync } from "@/features/oversight/read-model";
import { createServerComponentClient } from "@/lib/supabase/server";

type ClubOverviewSource = {
  canManageRewards: boolean;
  claimableCandidateCount: number;
  managedClubCount: number;
  openFraudSignalCount: number;
  visibleEventCount: number;
};

const buildClubOverviewMetrics = (source: ClubOverviewSource): DashboardOverviewMetric[] => [
  {
    description: "Active clubs visible to this organizer session.",
    label: "Managed clubs",
    tone: "accent",
    value: String(source.managedClubCount),
  },
  {
    description: "Operational events currently listed for your clubs.",
    label: "Listed events",
    tone: "neutral",
    value: String(source.visibleEventCount),
  },
  {
    description: "Students eligible to physically claim a reward right now.",
    label: "Reward claims ready",
    tone: source.claimableCandidateCount > 0 ? "warning" : "neutral",
    value: String(source.claimableCandidateCount),
  },
  {
    description: "Open fraud signals scoped to your club events.",
    label: "Open fraud signals",
    tone: source.openFraudSignalCount > 0 ? "warning" : "neutral",
    value: String(source.openFraudSignalCount),
  },
];

export default async function ClubPage() {
  const supabase = await createServerComponentClient();
  const context = await fetchClubEventContextAsync(supabase);
  const canManageRewards = context.memberships.some((membership) => membership.canCreateEvents);

  const [
    eventsSnapshot,
    claimsSnapshot,
    fraudSnapshot,
    announcementsSnapshot,
    departmentTagsSnapshot,
    rewardsSnapshot,
  ] = await Promise.all([
    fetchClubEventsSnapshotAsync(supabase),
    fetchClubClaimsSnapshotAsync(supabase),
    fetchFraudReviewSnapshotAsync(supabase),
    fetchClubAnnouncementsSnapshotAsync(supabase),
    canManageRewards ? fetchClubDepartmentTagsSnapshotAsync(supabase) : Promise.resolve(null),
    canManageRewards ? fetchClubRewardsSnapshotAsync(supabase) : Promise.resolve(null),
  ]);

  const shortcuts = buildClubDashboardShortcuts({
    announcementCount: announcementsSnapshot.announcements.length,
    canManageRewards,
    claimableCandidateCount: claimsSnapshot.summary.claimableCandidateCount,
    managedClubCount: eventsSnapshot.summary.managedClubCount,
    officialDepartmentTagCount: departmentTagsSnapshot === null ? 0 : departmentTagsSnapshot.summary.totalOfficialTagCount,
    openFraudSignalCount: fraudSnapshot.openFraudSignalCount,
    rewardTierCount: rewardsSnapshot === null ? 0 : rewardsSnapshot.summary.totalTierCount,
    visibleEventCount: eventsSnapshot.summary.visibleEventCount,
  });

  const metrics = buildClubOverviewMetrics({
    canManageRewards,
    claimableCandidateCount: claimsSnapshot.summary.claimableCandidateCount,
    managedClubCount: eventsSnapshot.summary.managedClubCount,
    openFraudSignalCount: fraudSnapshot.openFraudSignalCount,
    visibleEventCount: eventsSnapshot.summary.visibleEventCount,
  });

  return (
    <DashboardShell
      activeHref="/club"
      areaLabel="Club operations"
      navigationItems={getClubDashboardNavigationItems(canManageRewards)}
      roleLabel={context.access.primaryRole}
      subtitle="Configure club-owned events, track reward flow, and keep organizer-facing moderation surfaces in one place."
      title="Organizer dashboard"
      userEmail={context.access.userEmail}
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
