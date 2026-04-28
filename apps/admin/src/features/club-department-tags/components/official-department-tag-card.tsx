import { formatOfficialDepartmentTagMeta } from "@/features/club-department-tags/format";
import type { ClubOfficialDepartmentTagRecord } from "@/features/club-department-tags/types";

type OfficialDepartmentTagCardProps = {
  tag: ClubOfficialDepartmentTagRecord;
};

export const OfficialDepartmentTagCard = ({ tag }: OfficialDepartmentTagCardProps) => (
  <article className="panel review-card-compact">
    <div className="stack-sm">
      <div className="review-card-header">
        <div className="stack-sm">
          <h3 className="section-title">{tag.title}</h3>
          <p className="muted-text">{formatOfficialDepartmentTagMeta(tag)}</p>
        </div>
        <span className="status-pill status-pill-success">Official</span>
      </div>
      <p className="review-note">slug: {tag.slug}</p>
    </div>
  </article>
);
