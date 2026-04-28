"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  formatClubClaimInventory,
  formatClubClaimProgress,
  formatClubClaimRewardType,
} from "@/features/club-claims/format";
import {
  rewardClaimRefreshableStatuses,
  submitRewardClaimConfirmRequestAsync,
} from "@/features/club-claims/reward-claim-client";
import type {
  ClubClaimCandidateRecord,
  ClubRewardClaimActionState,
  ClubRewardClaimConfirmPayload,
} from "@/features/club-claims/types";

type RewardClaimCandidateCardProps = {
  candidate: ClubClaimCandidateRecord;
};

const createInitialPayload = (candidate: ClubClaimCandidateRecord): ClubRewardClaimConfirmPayload => ({
  eventId: candidate.eventId,
  notes: "",
  rewardTierId: candidate.rewardTierId,
  studentId: candidate.studentId,
});

const renderActionState = (state: ClubRewardClaimActionState) => {
  if (state.message === null) {
    return null;
  }

  return <p className={state.tone === "success" ? "inline-success" : "inline-error"}>{state.message}</p>;
};

export const RewardClaimCandidateCard = ({ candidate }: RewardClaimCandidateCardProps) => {
  const router = useRouter();
  const [payload, setPayload] = useState<ClubRewardClaimConfirmPayload>(createInitialPayload(candidate));
  const [actionState, setActionState] = useState<ClubRewardClaimActionState>({
    code: null,
    message: null,
    tone: "idle",
  });
  const [isPending, setIsPending] = useState<boolean>(false);

  const handleConfirmAsync = async (): Promise<void> => {
    setIsPending(true);
    setActionState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const response = await submitRewardClaimConfirmRequestAsync(payload);
      setActionState({
        code: response.status,
        message: response.message,
        tone: response.status === "SUCCESS" ? "success" : "error",
      });

      if (response.status !== null && rewardClaimRefreshableStatuses.has(response.status)) {
        setPayload(createInitialPayload(candidate));
        router.refresh();
      }
    } catch (error) {
      setActionState({
        code: "REQUEST_ERROR",
        message: error instanceof Error ? error.message : "Unknown reward claim request error.",
        tone: "error",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <article className="panel review-card-compact">
      <div className="stack-md">
        <div className="review-card-header">
          <div className="stack-sm">
            <h3 className="section-title">{candidate.studentLabel}</h3>
            <p className="muted-text">
              {candidate.rewardTitle} · {formatClubClaimRewardType(candidate.rewardType)}
            </p>
          </div>
          <span className="status-pill status-pill-success">Claimable</span>
        </div>

        <p className="review-note">
          {formatClubClaimProgress(candidate)} · {formatClubClaimInventory(candidate)}
        </p>

        <label className="field">
          <span className="field-label">Handoff notes</span>
          <textarea
            className="field-input field-textarea"
            disabled={isPending}
            onChange={(event) =>
              setPayload((currentPayload) => ({
                ...currentPayload,
                notes: event.target.value,
              }))
            }
            value={payload.notes}
          />
        </label>

        <button className="button button-primary" disabled={isPending} onClick={() => void handleConfirmAsync()} type="button">
          {isPending ? "Confirming..." : "Confirm handoff"}
        </button>
        {renderActionState(actionState)}
      </div>
    </article>
  );
};
