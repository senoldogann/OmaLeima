import {
  formatDepartmentTagCreator,
  formatDepartmentTagDateTime,
  formatDepartmentTagMeta,
  formatDepartmentTagSource,
  formatDepartmentTagStatus,
  getDepartmentTagStatusClassName,
} from "@/features/department-tags/format";
import type { DepartmentTagRecord } from "@/features/department-tags/types";

type ModeratedTagCardProps = {
  tag: DepartmentTagRecord;
};

export const ModeratedTagCard = ({ tag }: ModeratedTagCardProps) => (
  <article className="panel moderation-card">
    <div className="stack-md">
      <div className="review-card-header">
        <div className="stack-sm">
          <div className="eyebrow">Recent moderation</div>
          <h3 className="section-title">{tag.title}</h3>
          <p className="muted-text">{formatDepartmentTagMeta(tag)}</p>
        </div>
        <div className="badge-group">
          <span className="status-pill">{formatDepartmentTagSource(tag.sourceType)}</span>
          <span className={getDepartmentTagStatusClassName(tag.status)}>
            {formatDepartmentTagStatus(tag.status)}
          </span>
        </div>
      </div>

      <dl className="detail-grid">
        <div className="detail-item">
          <dt className="field-label">Updated</dt>
          <dd>{formatDepartmentTagDateTime(tag.updatedAt)}</dd>
        </div>
        <div className="detail-item">
          <dt className="field-label">Creator</dt>
          <dd>{formatDepartmentTagCreator(tag)}</dd>
        </div>
      </dl>

      {tag.mergedIntoTitle !== null ? (
        <p className="review-note">Merged into {tag.mergedIntoTitle}</p>
      ) : null}
    </div>
  </article>
);
