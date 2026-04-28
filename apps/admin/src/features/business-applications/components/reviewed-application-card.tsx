import {
  formatBusinessApplicationDateTime,
  formatBusinessApplicationLocation,
  formatBusinessApplicationStatus,
} from "@/features/business-applications/format";
import type { BusinessApplicationRecord } from "@/features/business-applications/types";
import { normalizeExternalReviewUrl } from "@/features/business-applications/validation";

type ReviewedApplicationCardProps = {
  application: BusinessApplicationRecord;
};

const renderExternalLink = (label: string, href: string | null) => {
  if (href === null) {
    return null;
  }

  return (
    <a className="detail-link" href={href} rel="noreferrer" target="_blank">
      {label}
    </a>
  );
};

export const ReviewedApplicationCard = ({ application }: ReviewedApplicationCardProps) => (
  <article className="panel review-card review-card-compact">
    <div className="stack-sm">
      <div className="review-card-header">
        <div className="stack-sm">
          <h3 className="section-title">{application.businessName}</h3>
          <p className="muted-text">
            {application.contactName} · {formatBusinessApplicationLocation(application.city, application.country)}
          </p>
        </div>
        <span className={`status-pill ${application.status === "APPROVED" ? "status-pill-success" : "status-pill-danger"}`}>
          {formatBusinessApplicationStatus(application.status)}
        </span>
      </div>

      <p className="muted-text">
        Reviewed {formatBusinessApplicationDateTime(application.reviewedAt)}
      </p>

      {application.rejectionReason !== null ? (
        <p className="review-note">Reason: {application.rejectionReason}</p>
      ) : null}

      <div className="action-row">
        {renderExternalLink("Website", normalizeExternalReviewUrl(application.websiteUrl))}
        {renderExternalLink("Instagram", normalizeExternalReviewUrl(application.instagramUrl))}
      </div>
    </div>
  </article>
);
