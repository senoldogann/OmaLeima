"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { DashboardLocale } from "@/features/dashboard/i18n";
import { formatOversightDateTime } from "@/features/oversight/format";
import type { OversightFraudSignalRecord } from "@/features/oversight/types";
import {
  fraudReviewRefreshableStatuses,
  submitFraudSignalReviewRequestAsync,
} from "@/features/fraud-review/review-client";
import type {
  FraudSignalActionState,
  FraudSignalResolutionStatus,
} from "@/features/fraud-review/types";

type FraudSignalReviewListProps = {
  emptyText: string;
  locale: DashboardLocale;
  signals: OversightFraudSignalRecord[];
};

type FraudReviewCopy = {
  confirmIssue: string;
  created: string;
  dismiss: string;
  noLinkedContext: string;
  noteLabel: string;
  notePlaceholder: string;
  requestError: string;
  reviewed: string;
  saving: string;
};

const copyByLocale: Record<DashboardLocale, FraudReviewCopy> = {
  en: {
    confirmIssue: "Confirm issue",
    created: "Created",
    dismiss: "Dismiss",
    noLinkedContext: "No linked event, business, or scanner",
    noteLabel: "Resolution note",
    notePlaceholder: "Optional internal note for the audit trail",
    requestError: "Unknown fraud review request error.",
    reviewed: "Mark reviewed",
    saving: "Saving...",
  },
  fi: {
    confirmIssue: "Vahvista ongelma",
    created: "Luotu",
    dismiss: "Hylkää",
    noLinkedContext: "Ei liitettyä tapahtumaa, yritystä tai scanneria",
    noteLabel: "Ratkaisumuistio",
    notePlaceholder: "Valinnainen sisäinen huomio audit trailia varten",
    requestError: "Tuntematon fraud-tarkistuksen virhe.",
    reviewed: "Merkitse tarkistetuksi",
    saving: "Tallennetaan...",
  },
};

const createIdleState = (): FraudSignalActionState => ({
  code: null,
  message: null,
  tone: "idle",
});

const withFallback = (value: string, fallback: string): string => (value.length > 0 ? value : fallback);

const renderMetadataLine = (value: string | null) => {
  if (value === null) {
    return null;
  }

  return <p className="record-note">{value}</p>;
};

const renderActionState = (state: FraudSignalActionState) => {
  if (state.message === null) {
    return null;
  }

  return (
    <p className={state.tone === "success" ? "inline-success" : "inline-error"}>
      {state.message}
    </p>
  );
};

export const FraudSignalReviewList = ({ emptyText, locale, signals }: FraudSignalReviewListProps) => {
  const router = useRouter();
  const copy = copyByLocale[locale];
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [statesById, setStatesById] = useState<Record<string, FraudSignalActionState>>({});
  const [pendingSignalId, setPendingSignalId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<FraudSignalResolutionStatus | null>(null);
  const isPending = pendingSignalId !== null;

  const handleNoteChange = (signalId: string, value: string): void => {
    setNotesById((current) => ({
      ...current,
      [signalId]: value,
    }));
  };

  const handleReviewClick = async (
    signalId: string,
    status: FraudSignalResolutionStatus
  ): Promise<void> => {
    setPendingSignalId(signalId);
    setPendingStatus(status);
    setStatesById((current) => ({
      ...current,
      [signalId]: createIdleState(),
    }));

    try {
      const response = await submitFraudSignalReviewRequestAsync({
        resolutionNote: notesById[signalId] ?? "",
        signalId,
        status,
      });

      setStatesById((current) => ({
        ...current,
        [signalId]: {
          code: response.status,
          message: response.message,
          tone: response.status === "SUCCESS" ? "success" : "error",
        },
      }));

      if (response.status !== null && fraudReviewRefreshableStatuses.has(response.status)) {
        router.refresh();
      }
    } catch (error) {
      setStatesById((current) => ({
        ...current,
        [signalId]: {
          code: "REQUEST_ERROR",
          message: error instanceof Error ? error.message : copy.requestError,
          tone: "error",
        },
      }));
    } finally {
      setPendingSignalId(null);
      setPendingStatus(null);
    }
  };

  if (signals.length === 0) {
    return <p className="muted-text">{emptyText}</p>;
  }

  return (
    <ul className="record-list">
      {signals.map((signal) => {
        const isSignalPending = pendingSignalId === signal.id;

        return (
          <li key={signal.id} className="record-item fraud-review-item">
            <div className="record-main">
              <p className="record-title">{signal.type}</p>
              <p className="record-meta">
                {withFallback(
                  [signal.eventName, signal.businessName, signal.scannerEmail]
                    .filter((value) => value !== null)
                    .join(" · "),
                  copy.noLinkedContext
                )}
              </p>
              <p className="record-note">{signal.description}</p>
              {renderMetadataLine(signal.metadataSummary)}
              <p className="record-note">{copy.created} {formatOversightDateTime(locale, signal.createdAt)}</p>

              <label className="field fraud-review-note-field">
                <span className="field-label">{copy.noteLabel}</span>
                <textarea
                  className="field-input field-textarea fraud-review-note"
                  disabled={isPending}
                  maxLength={500}
                  onChange={(event) => handleNoteChange(signal.id, event.target.value)}
                  placeholder={copy.notePlaceholder}
                  value={notesById[signal.id] ?? ""}
                />
              </label>

              <div className="moderation-actions">
                <button
                  className="button button-secondary"
                  disabled={isPending}
                  onClick={() => void handleReviewClick(signal.id, "REVIEWED")}
                  type="button"
                >
                  {isSignalPending && pendingStatus === "REVIEWED" ? copy.saving : copy.reviewed}
                </button>
                <button
                  className="button button-primary"
                  disabled={isPending}
                  onClick={() => void handleReviewClick(signal.id, "CONFIRMED")}
                  type="button"
                >
                  {isSignalPending && pendingStatus === "CONFIRMED" ? copy.saving : copy.confirmIssue}
                </button>
                <button
                  className="button button-danger"
                  disabled={isPending}
                  onClick={() => void handleReviewClick(signal.id, "DISMISSED")}
                  type="button"
                >
                  {isSignalPending && pendingStatus === "DISMISSED" ? copy.saving : copy.dismiss}
                </button>
              </div>

              {renderActionState(statesById[signal.id] ?? createIdleState())}
            </div>
            <div className="badge-group">
              <span className={`status-pill ${signal.severity === "CRITICAL" || signal.severity === "HIGH" ? "status-pill-danger" : "status-pill-warning"}`}>
                {signal.severity}
              </span>
              <span className="status-pill">{signal.status}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
};
