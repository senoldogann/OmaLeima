"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  formatBusinessApplicationDateTime,
  formatBusinessApplicationLocation,
} from "@/features/business-applications/format";
import { reviewRefreshableStatuses, submitReviewRequestAsync } from "@/features/business-applications/review-client";
import type { BusinessApplicationRecord, ReviewActionState } from "@/features/business-applications/types";
import { normalizeExternalReviewUrl } from "@/features/business-applications/validation";
import { successNoticeDurationMs, useTransientSuccessKey } from "@/features/shared/use-transient-success-key";

type PendingApplicationReviewCardProps = {
  application: BusinessApplicationRecord;
};

const renderActionState = (state: ReviewActionState) => {
  if (state.message === null) {
    return null;
  }

  return (
    <p className={state.tone === "success" ? "inline-success" : "inline-error"}>
      {state.message}
    </p>
  );
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

export const PendingApplicationReviewCard = ({ application }: PendingApplicationReviewCardProps) => {
  const router = useRouter();
  const [approveState, setApproveState] = useState<ReviewActionState>({
    code: null,
    message: null,
    tone: "idle",
  });
  const [rejectState, setRejectState] = useState<ReviewActionState>({
    code: null,
    message: null,
    tone: "idle",
  });

  useTransientSuccessKey(
    approveState.tone === "success" ? approveState.message : null,
    () => setApproveState({ code: null, message: null, tone: "idle" }),
    successNoticeDurationMs
  );
  useTransientSuccessKey(
    rejectState.tone === "success" ? rejectState.message : null,
    () => setRejectState({ code: null, message: null, tone: "idle" }),
    successNoticeDurationMs
  );
  const [isApprovePending, setIsApprovePending] = useState<boolean>(false);
  const [isRejectOpen, setIsRejectOpen] = useState<boolean>(false);
  const [isRejectPending, setIsRejectPending] = useState<boolean>(false);
  const isPending = isApprovePending || isRejectPending;
  const websiteUrl = normalizeExternalReviewUrl(application.websiteUrl);
  const instagramUrl = normalizeExternalReviewUrl(application.instagramUrl);

  const handleApproveSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsApprovePending(true);
    setApproveState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const response = await submitReviewRequestAsync("/api/admin/business-applications/approve", {
        applicationId: application.id,
      });
      const nextState: ReviewActionState = {
        code: response.status,
        message: response.message,
        tone: response.status === "SUCCESS" ? "success" : "error",
      };

      setApproveState(nextState);

      if (response.status !== null && reviewRefreshableStatuses.has(response.status)) {
        router.refresh();
      }
    } catch (error) {
      setApproveState({
        code: "REQUEST_ERROR",
        message: error instanceof Error ? error.message : "Unknown approve request error.",
        tone: "error",
      });
    } finally {
      setIsApprovePending(false);
    }
  };

  const handleRejectSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const rejectionReasonValue = formData.get("rejectionReason");

    if (typeof rejectionReasonValue !== "string" || rejectionReasonValue.trim().length === 0) {
      setRejectState({
        code: "REJECTION_REASON_REQUIRED",
        message: "Add a rejection reason before submitting.",
        tone: "error",
      });
      return;
    }

    setIsRejectPending(true);
    setRejectState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const response = await submitReviewRequestAsync("/api/admin/business-applications/reject", {
        applicationId: application.id,
        rejectionReason: rejectionReasonValue.trim(),
      });
      const nextState: ReviewActionState = {
        code: response.status,
        message: response.message,
        tone: response.status === "SUCCESS" ? "success" : "error",
      };

      setRejectState(nextState);

      if (response.status !== null && reviewRefreshableStatuses.has(response.status)) {
        router.refresh();
      }
    } catch (error) {
      setRejectState({
        code: "REQUEST_ERROR",
        message: error instanceof Error ? error.message : "Unknown reject request error.",
        tone: "error",
      });
    } finally {
      setIsRejectPending(false);
    }
  };

  return (
    <article className="panel review-card">
      <div className="stack-md">
        <div className="review-card-header">
          <div className="stack-sm">
            <div className="eyebrow">Pending review</div>
            <p className="card-title">{application.businessName}</p>
            <p className="muted-text">
              {application.contactName} · {application.contactEmail}
            </p>
          </div>
          <span className="status-pill status-pill-warning">Pending</span>
        </div>

        <dl className="detail-grid">
          <div className="detail-item">
            <dt className="field-label">Submitted</dt>
            <dd>{formatBusinessApplicationDateTime(application.createdAt)}</dd>
          </div>
          <div className="detail-item">
            <dt className="field-label">Location</dt>
            <dd>{formatBusinessApplicationLocation(application.city, application.country)}</dd>
          </div>
          <div className="detail-item">
            <dt className="field-label">Phone</dt>
            <dd>{application.phone ?? "Not provided"}</dd>
          </div>
          <div className="detail-item">
            <dt className="field-label">Address</dt>
            <dd>{application.address ?? "Not provided"}</dd>
          </div>
        </dl>

        <div className="action-row">
          {renderExternalLink("Website", websiteUrl)}
          {renderExternalLink("Instagram", instagramUrl)}
        </div>

        <div className="stack-sm">
          <span className="field-label">Applicant message</span>
          <p className="review-message">{application.message ?? "No message was included with this application."}</p>
        </div>

        <div className="review-actions">
          <form className="stack-sm" onSubmit={(event) => void handleApproveSubmit(event)}>
            <button className="button button-primary" disabled={isPending} type="submit">
              {isApprovePending ? "Approving..." : "Approve application"}
            </button>
            {renderActionState(approveState)}
          </form>

          <div className="stack-sm">
            <button
              className="button button-secondary"
              disabled={isPending}
              onClick={() => setIsRejectOpen(!isRejectOpen)}
              type="button"
            >
              {isRejectOpen ? "Hide rejection form" : "Reject with reason"}
            </button>

            {isRejectOpen ? (
              <form className="stack-sm" onSubmit={(event) => void handleRejectSubmit(event)}>
                <label className="field">
                  <span className="field-label">Reason</span>
                  <textarea
                    className="field-input field-textarea"
                    defaultValue={application.rejectionReason ?? ""}
                    name="rejectionReason"
                  />
                </label>
                <button className="button button-danger" disabled={isPending} type="submit">
                  {isRejectPending ? "Rejecting..." : "Confirm rejection"}
                </button>
                {renderActionState(rejectState)}
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
};
