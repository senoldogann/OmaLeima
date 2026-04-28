import {
  formatClubClaimHistoryMeta,
  getClubClaimStatusClassName,
} from "@/features/club-claims/format";
import type { ClubRecentRewardClaimRecord } from "@/features/club-claims/types";

type RecentRewardClaimCardProps = {
  claim: ClubRecentRewardClaimRecord;
};

export const RecentRewardClaimCard = ({ claim }: RecentRewardClaimCardProps) => (
  <article className="panel review-card-compact">
    <div className="stack-sm">
      <div className="review-card-header">
        <div className="stack-sm">
          <h3 className="section-title">{claim.studentLabel}</h3>
          <p className="muted-text">{claim.rewardTitle}</p>
        </div>
        <span className={getClubClaimStatusClassName(claim.status)}>{claim.status}</span>
      </div>

      <p className="muted-text">{formatClubClaimHistoryMeta(claim)}</p>
      <p className="review-note">{claim.notes ?? "No handoff notes recorded."}</p>
    </div>
  </article>
);
