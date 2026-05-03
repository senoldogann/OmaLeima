import { FraudSignalReviewList } from "@/features/fraud-review/components/fraud-signal-review-list";
import { fetchClubEventContextAsync } from "@/features/club-events/context";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getClubDashboardNavigationItems } from "@/features/dashboard/sections";
import { fetchFraudReviewSnapshotAsync } from "@/features/oversight/read-model";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function ClubFraudReviewPage() {
  const supabase = await createServerComponentClient();
  const [context, snapshot] = await Promise.all([
    fetchClubEventContextAsync(supabase),
    fetchFraudReviewSnapshotAsync(supabase),
  ]);
  const canManageRewards = context.memberships.some((membership) => membership.canCreateEvents);

  return (
    <DashboardShell
      activeHref="/club/fraud"
      areaLabel="Club operations"
      navigationItems={getClubDashboardNavigationItems(canManageRewards)}
      roleLabel={context.access.primaryRole}
      subtitle="Review event-scoped fraud warnings, confirm real issues, or dismiss false positives after checking the scan context."
      title="Fraud review"
      userEmail={context.access.userEmail}
    >
      <article className="panel panel-warning">
        <div className="stack-sm">
          <div className="eyebrow">Integrity</div>
          <h3 className="section-title">Open event warnings</h3>
          <p className="muted-text">
            Showing {snapshot.fraudSignals.length} of {snapshot.openFraudSignalCount} open signals visible to your club memberships.
            Latest list limit: {snapshot.latestFraudLimit}.
          </p>
        </div>

        <FraudSignalReviewList
          emptyText="No event fraud signals are visible for your clubs right now."
          signals={snapshot.fraudSignals}
        />
      </article>
    </DashboardShell>
  );
}
