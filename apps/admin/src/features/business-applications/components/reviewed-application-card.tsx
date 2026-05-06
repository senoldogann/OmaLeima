"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  formatBusinessApplicationDateTime,
  formatBusinessApplicationLocation,
  formatBusinessApplicationStatus,
} from "@/features/business-applications/format";
import type { BusinessApplicationRecord, OwnerAccessMutationResponse } from "@/features/business-applications/types";
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

const createOwnerAccessAsync = async (applicationId: string): Promise<OwnerAccessMutationResponse> => {
  const response = await fetch("/api/admin/business-applications/create-owner-access", {
    body: JSON.stringify({ applicationId }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json()) as Partial<OwnerAccessMutationResponse>;

  if (!response.ok) {
    throw new Error(
      typeof responseBody.message === "string" ? responseBody.message : "Owner access request failed."
    );
  }

  return {
    authUserCreated: responseBody.authUserCreated,
    businessId: responseBody.businessId,
    businessName: responseBody.businessName,
    message:
      typeof responseBody.message === "string"
        ? responseBody.message
        : "Business owner access request completed.",
    onboardingLink: responseBody.onboardingLink ?? null,
    onboardingLinkError: responseBody.onboardingLinkError ?? null,
    ownerEmail: responseBody.ownerEmail,
    ownerUserId: responseBody.ownerUserId,
    status: typeof responseBody.status === "string" ? responseBody.status : null,
  };
};

export const ReviewedApplicationCard = ({ application }: ReviewedApplicationCardProps) => {
  const router = useRouter();
  const [isOwnerAccessPending, setIsOwnerAccessPending] = useState<boolean>(false);
  const [ownerAccessMessage, setOwnerAccessMessage] = useState<string | null>(null);
  const [ownerAccessError, setOwnerAccessError] = useState<string | null>(null);
  const [onboardingLink, setOnboardingLink] = useState<string | null>(null);
  const canCreateOwnerAccess = application.status === "APPROVED" && application.ownerAccess.status !== "OWNER_READY";

  const handleCreateOwnerAccessPress = async (): Promise<void> => {
    setIsOwnerAccessPending(true);
    setOwnerAccessError(null);
    setOwnerAccessMessage(null);
    setOnboardingLink(null);

    try {
      const response = await createOwnerAccessAsync(application.id);

      if (response.status !== "SUCCESS") {
        throw new Error(response.message);
      }

      setOwnerAccessMessage(
        `${response.message} Owner: ${response.ownerEmail ?? application.contactEmail}.`
      );
      setOnboardingLink(response.onboardingLink ?? null);
      router.refresh();
    } catch (error) {
      setOwnerAccessError(error instanceof Error ? error.message : "Unknown owner access request error.");
    } finally {
      setIsOwnerAccessPending(false);
    }
  };

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
                Create the business owner login for {application.contactEmail}, then ask the owner to open the mobile business profile and share the scanner QR with staff.
              </p>
            )}
            {canCreateOwnerAccess ? (
              <button
                className="button button-secondary"
                disabled={isOwnerAccessPending}
                onClick={() => void handleCreateOwnerAccessPress()}
                type="button"
              >
                {isOwnerAccessPending ? "Creating owner access..." : "Create owner access"}
              </button>
            ) : null}
            {ownerAccessMessage !== null ? <p className="inline-success">{ownerAccessMessage}</p> : null}
            {ownerAccessError !== null ? <p className="inline-error">{ownerAccessError}</p> : null}
            {onboardingLink !== null ? (
              <p className="review-note">
                Onboarding link: <span className="breakable-text">{onboardingLink}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="action-row">
          {renderExternalLink("Website", normalizeExternalReviewUrl(application.websiteUrl))}
          {renderExternalLink("Instagram", normalizeExternalReviewUrl(application.instagramUrl))}
        </div>
      </div>
    </article>
  );
};
