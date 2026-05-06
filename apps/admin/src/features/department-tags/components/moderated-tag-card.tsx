import {
  formatDepartmentTagCreator,
  formatDepartmentTagDateTime,
  formatDepartmentTagMeta,
  formatDepartmentTagSource,
  formatDepartmentTagStatus,
  getDepartmentTagStatusClassName,
} from "@/features/department-tags/format";
import type { DepartmentTagRecord } from "@/features/department-tags/types";
import type { DashboardLocale } from "@/features/dashboard/i18n";

type ModeratedTagCardProps = {
  locale: DashboardLocale;
  tag: DepartmentTagRecord;
};

export const ModeratedTagCard = ({ locale, tag }: ModeratedTagCardProps) => (
  <article className="panel moderation-card">
    <div className="stack-md">
      <div className="review-card-header">
        <div className="stack-sm">
          <div className="eyebrow">{locale === "fi" ? "Viimeisin moderointi" : "Recent moderation"}</div>
          <p className="card-title">{tag.title}</p>
          <p className="muted-text">{formatDepartmentTagMeta(tag, locale)}</p>
        </div>
        <div className="badge-group">
          <span className="status-pill">{formatDepartmentTagSource(tag.sourceType, locale)}</span>
          <span className={getDepartmentTagStatusClassName(tag.status)}>
            {formatDepartmentTagStatus(tag.status, locale)}
          </span>
        </div>
      </div>

      <dl className="detail-grid">
        <div className="detail-item">
          <dt className="field-label">{locale === "fi" ? "Paivitetty" : "Updated"}</dt>
          <dd>{formatDepartmentTagDateTime(tag.updatedAt)}</dd>
        </div>
        <div className="detail-item">
          <dt className="field-label">{locale === "fi" ? "Luoja" : "Creator"}</dt>
          <dd>{formatDepartmentTagCreator(tag, locale)}</dd>
        </div>
      </dl>

      {tag.mergedIntoTitle !== null ? (
        <p className="review-note">
          {locale === "fi" ? `Yhdistetty tagiin ${tag.mergedIntoTitle}` : `Merged into ${tag.mergedIntoTitle}`}
        </p>
      ) : null}
    </div>
  </article>
);
