"use client";

import Link from "next/link";
import { useState } from "react";

import { formatBusinessApplicationDateTime } from "@/features/business-applications/format";
import type { BusinessApplicationsReviewQueue } from "@/features/business-applications/types";
import { PendingApplicationReviewCard } from "@/features/business-applications/components/pending-application-review-card";
import { ReviewedApplicationCard } from "@/features/business-applications/components/reviewed-application-card";

type BusinessApplicationsPanelProps = {
  reviewQueue: BusinessApplicationsReviewQueue;
};

const buildPageHref = (pageNumber: number): string => {
  if (pageNumber <= 1) {
    return "/admin/business-applications";
  }

  return `/admin/business-applications?page=${pageNumber}`;
};

export const BusinessApplicationsPanel = ({ reviewQueue }: BusinessApplicationsPanelProps) => {
  const [activeTab, setActiveTab] = useState<"pending-queue" | "decisions">("pending-queue");

  return (
    <div className="stack-lg">
      <section className="metrics-grid">
        <article className="panel panel-accent">
          <div className="stack-sm">
            <span className="field-label">Pending queue</span>
            <strong className="metric-value">{reviewQueue.summary.pendingCount}</strong>
            <p className="muted-text">Applications still waiting for an admin decision.</p>
          </div>
        </article>

        <article className="panel">
          <div className="stack-sm">
            <span className="field-label">Oldest pending</span>
            <strong className="metric-value">
              {formatBusinessApplicationDateTime(reviewQueue.summary.oldestPendingCreatedAt)}
            </strong>
            <p className="muted-text">Oldest application currently visible in the review queue.</p>
          </div>
        </article>

        <article className="panel panel-warning">
          <div className="stack-sm">
            <span className="field-label">Recent decisions</span>
            <strong className="metric-value">{reviewQueue.summary.recentlyReviewedCount}</strong>
            <p className="muted-text">Most recent approved or rejected applications shown below.</p>
          </div>
        </article>
      </section>

      <div className="tab-nav">
        <button className={activeTab === "pending-queue" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("pending-queue")} type="button">Pending Queue</button>
        <button className={activeTab === "decisions" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("decisions")} type="button">Decisions</button>
      </div>

      <section className="stack-md" style={{ display: activeTab !== "pending-queue" ? "none" : undefined }}>
        <div className="stack-sm">
          <div className="eyebrow">Review queue</div>
          <h3 className="section-title">Pending business applications</h3>
          <p className="muted-text">
            Approve valid venues or reject them with a clear operator-facing reason.{" "}
            {reviewQueue.summary.pendingCount === 0
              ? "Showing 0 of 0."
              : `Showing ${reviewQueue.summary.pendingVisibleStart}-${reviewQueue.summary.pendingVisibleEnd} of ${reviewQueue.summary.pendingCount}.`}
          </p>
        </div>

        {reviewQueue.pendingApplications.length === 0 ? (
          <article className="panel">
            <p className="section-title">No pending applications</p>
            <p className="muted-text">The queue is clear right now. New submissions will appear here as soon as they are created.</p>
          </article>
        ) : (
          <div className="review-grid">
            {reviewQueue.pendingApplications.map((application) => (
              <PendingApplicationReviewCard key={application.id} application={application} />
            ))}
          </div>
        )}

        {reviewQueue.summary.pendingPageCount > 1 ? (
          <div className="pagination-row">
            {reviewQueue.summary.hasPreviousPage ? (
              <Link className="button button-secondary" href={buildPageHref(reviewQueue.summary.currentPage - 1)}>
                Previous page
              </Link>
            ) : (
              <span className="muted-text">At the beginning of the queue</span>
            )}

            <span className="status-pill">
              Page {reviewQueue.summary.currentPage} of {reviewQueue.summary.pendingPageCount}
            </span>

            {reviewQueue.summary.hasNextPage ? (
              <Link className="button button-secondary" href={buildPageHref(reviewQueue.summary.currentPage + 1)}>
                Next page
              </Link>
            ) : (
              <span className="muted-text">No later pages</span>
            )}
          </div>
        ) : null}
      </section>

      <section className="stack-md" style={{ display: activeTab !== "decisions" ? "none" : undefined }}>
        <div className="stack-sm">
          <div className="eyebrow">Recent review activity</div>
          <h3 className="section-title">Latest decisions</h3>
          <p className="muted-text">Keep an eye on the latest approvals and rejections without leaving the admin area.</p>
        </div>

        {reviewQueue.recentlyReviewedApplications.length === 0 ? (
          <article className="panel">
            <p className="section-title">No recent decisions</p>
            <p className="muted-text">Approved and rejected applications will appear here after the first review action.</p>
          </article>
        ) : (
          <div className="content-grid">
            {reviewQueue.recentlyReviewedApplications.map((application) => (
              <ReviewedApplicationCard key={application.id} application={application} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
