import type { DashboardLocale } from "@/features/dashboard/i18n";
import {
  formatClubClaimHistoryMeta,
  getClubClaimStatusClassName,
} from "@/features/club-claims/format";
import type { ClubRecentRewardClaimRecord } from "@/features/club-claims/types";

type RecentRewardClaimCardProps = {
  claim: ClubRecentRewardClaimRecord;
  locale: DashboardLocale;
};

export const RecentRewardClaimCard = ({ claim, locale }: RecentRewardClaimCardProps) => (
  <article className="panel review-card-compact">
    <div className="stack-sm">
      <div className="review-card-header">
        <div className="stack-sm">
          <p className="card-title">{claim.studentLabel}</p>
          <p className="muted-text">{claim.rewardTitle}</p>
        </div>
        <span className={getClubClaimStatusClassName(claim.status)}>{claim.status}</span>
      </div>

      <p className="muted-text">{formatClubClaimHistoryMeta(locale, claim)}</p>
      <p className="review-note">{claim.notes ?? (locale === "fi" ? "Luovutusmuistiinpanoja ei ole tallennettu." : "No handoff notes recorded.")}</p>
    </div>
  </article>
);
