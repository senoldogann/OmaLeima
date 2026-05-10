"use client";

import {
  formatBusinessApplicationDateTime,
  formatBusinessApplicationLocation,
  formatBusinessApplicationStatus,
} from "@/features/business-applications/format";
import type { BusinessApplicationRecord } from "@/features/business-applications/types";

type ReviewedApplicationCardProps = {
  application: BusinessApplicationRecord;
};

export const ReviewedApplicationCard = ({ application }: ReviewedApplicationCardProps) => {
  return (
    <article className="panel review-card review-card-compact">
      <div className="stack-sm">
        <div className="review-card-header">
          <div className="stack-sm">
            <p className="card-title">{application.businessName}</p>
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

        {application.status === "APPROVED" ? (
          <div className="info-callout stack-sm">
            <div className="eyebrow">Owner handoff</div>
            {application.ownerAccess.status === "OWNER_READY" ? (
              <p className="muted-text">
                Owner access ready for {application.ownerAccess.ownerEmail ?? application.contactEmail}. Staff scanners should use the owner QR from the mobile business profile.
              </p>
            ) : (
              <p className="muted-text">
                Owner access is not connected yet. Use the manual owner account form above to set the owner email, password, business details, and membership explicitly.
              </p>
            )}
          </div>
        ) : null}

      </div>
    </article>
  );
};
