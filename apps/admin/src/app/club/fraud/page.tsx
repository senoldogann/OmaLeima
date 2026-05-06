import { FraudSignalReviewList } from "@/features/fraud-review/components/fraud-signal-review-list";
import { fetchClubEventContextAsync } from "@/features/club-events/context";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getDashboardLocaleAsync } from "@/features/dashboard/i18n";
import { getClubDashboardNavigationItems } from "@/features/dashboard/sections";
import { fetchFraudReviewSnapshotAsync } from "@/features/oversight/read-model";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function ClubFraudReviewPage() {
  const supabase = await createServerComponentClient();
  const [context, locale, snapshot] = await Promise.all([
    fetchClubEventContextAsync(supabase),
    getDashboardLocaleAsync(),
    fetchFraudReviewSnapshotAsync(supabase),
  ]);
  const canManageRewards = context.memberships.some((membership) => membership.canCreateEvents);
  const copy =
    locale === "fi"
      ? {
        emptyText: "Klubeillesi ei ole nyt nakyvissa fraud-signaaleja.",
        eyebrow: "Integrity",
        meta: `Naytetaan ${snapshot.fraudSignals.length} / ${snapshot.openFraudSignalCount} avointa signaalia. Uusimman listan raja: ${snapshot.latestFraudLimit}.`,
        title: "Avoimet tapahtumavaroitukset",
      }
      : {
        emptyText: "No event fraud signals are visible for your clubs right now.",
        eyebrow: "Integrity",
        meta: `Showing ${snapshot.fraudSignals.length} of ${snapshot.openFraudSignalCount} open signals visible to your club memberships. Latest list limit: ${snapshot.latestFraudLimit}.`,
        title: "Open event warnings",
      };

  return (
    <DashboardShell
      activeHref="/club/fraud"
      areaLabel="Club operations"
      locale={locale}
      navigationItems={getClubDashboardNavigationItems(canManageRewards)}
      roleLabel={context.access.primaryRole}
      subtitle="Review event-scoped fraud warnings, confirm real issues, or dismiss false positives after checking the scan context."
      title="Fraud review"
      userEmail={context.access.userEmail}
    >
      <article className="panel panel-warning">
        <div className="stack-sm">
          <div className="eyebrow">{copy.eyebrow}</div>
          <h3 className="section-title">{copy.title}</h3>
          <p className="muted-text">{copy.meta}</p>
        </div>

        <FraudSignalReviewList
          emptyText={copy.emptyText}
          locale={locale}
          signals={snapshot.fraudSignals}
        />
      </article>
    </DashboardShell>
  );
}
