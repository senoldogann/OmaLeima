"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  formatRewardInventory,
  formatRewardType,
  getRewardStatusClassName,
  getRewardStockClassName,
} from "@/features/club-rewards/format";
import { rewardTierRefreshableStatuses, submitRewardTierUpdateRequestAsync } from "@/features/club-rewards/reward-tier-client";
import type {
  ClubRewardTierActionState,
  ClubRewardTierRecord,
  ClubRewardTierUpdatePayload,
} from "@/features/club-rewards/types";

type RewardTierCardProps = {
  tier: ClubRewardTierRecord;
};

const createUpdatePayload = (tier: ClubRewardTierRecord): ClubRewardTierUpdatePayload => ({
  claimInstructions: tier.claimInstructions ?? "",
  description: tier.description ?? "",
  inventoryTotal: tier.inventoryTotal === null ? "" : String(tier.inventoryTotal),
  requiredStampCount: String(tier.requiredStampCount),
  rewardTierId: tier.rewardTierId,
  rewardType: tier.rewardType,
  status: tier.status,
  title: tier.title,
});

const renderActionState = (state: ClubRewardTierActionState) => {
  if (state.message === null) {
    return null;
  }

  return <p className={state.tone === "success" ? "inline-success" : "inline-error"}>{state.message}</p>;
};

export const RewardTierCard = ({ tier }: RewardTierCardProps) => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [payload, setPayload] = useState<ClubRewardTierUpdatePayload>(createUpdatePayload(tier));
  const [actionState, setActionState] = useState<ClubRewardTierActionState>({
    code: null,
    message: null,
    tone: "idle",
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsPending(true);
    setActionState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const response = await submitRewardTierUpdateRequestAsync(payload);
      setActionState({
        code: response.status,
        message: response.message,
        tone: response.status === "SUCCESS" ? "success" : "error",
      });

      if (response.status !== null && rewardTierRefreshableStatuses.has(response.status)) {
        setIsEditing(false);
        router.refresh();
      }
    } catch (error) {
      setActionState({
        code: "REQUEST_ERROR",
        message: error instanceof Error ? error.message : "Unknown reward tier request error.",
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
            <p className="card-title">{tier.title}</p>
            <p className="muted-text">
              {tier.eventName} · {formatRewardType(tier.rewardType)} · {tier.requiredStampCount} leima
            </p>
          </div>
          <div className="stack-sm">
            <span className={getRewardStatusClassName(tier.status)}>{tier.status}</span>
            <span className={getRewardStockClassName(tier)}>{tier.stockState}</span>
          </div>
        </div>

        <p className="muted-text">{tier.description ?? "No reward description published yet."}</p>
        <p className="review-note">{formatRewardInventory(tier)}</p>
        <p className="muted-text">{tier.claimInstructions ?? "No claim instructions published yet."}</p>

        {isEditing ? (
          <form className="stack-md" onSubmit={(event) => void handleSubmit(event)}>
            <div className="detail-grid">
              <label className="field">
                <span className="field-label">Title</span>
                <input
                  className="field-input"
                  disabled={isPending}
                  onChange={(event) =>
                    setPayload((currentPayload) => ({
                      ...currentPayload,
                      title: event.target.value,
                    }))
                  }
                  value={payload.title}
                />
              </label>

              <label className="field">
                <span className="field-label">Reward type</span>
                <select
                  className="field-input"
                  disabled={isPending}
                  onChange={(event) =>
                    setPayload((currentPayload) => ({
                      ...currentPayload,
                      rewardType: event.target.value as ClubRewardTierUpdatePayload["rewardType"],
                    }))
                  }
                  value={payload.rewardType}
                >
                  <option value="HAALARIMERKKI">Haalarimerkki</option>
                  <option value="PATCH">Patch</option>
                  <option value="COUPON">Coupon</option>
                  <option value="PRODUCT">Product</option>
                  <option value="ENTRY">Entry</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>

              <label className="field">
                <span className="field-label">Required stamps</span>
                <input
                  className="field-input"
                  disabled={isPending}
                  onChange={(event) =>
                    setPayload((currentPayload) => ({
                      ...currentPayload,
                      requiredStampCount: event.target.value,
                    }))
                  }
                  type="number"
                  value={payload.requiredStampCount}
                />
              </label>

              <label className="field">
                <span className="field-label">Inventory total</span>
                <input
                  className="field-input"
                  disabled={isPending}
                  onChange={(event) =>
                    setPayload((currentPayload) => ({
                      ...currentPayload,
                      inventoryTotal: event.target.value,
                    }))
                  }
                  type="number"
                  value={payload.inventoryTotal}
                />
              </label>

              <label className="field">
                <span className="field-label">Status</span>
                <select
                  className="field-input"
                  disabled={isPending}
                  onChange={(event) =>
                    setPayload((currentPayload) => ({
                      ...currentPayload,
                      status: event.target.value as ClubRewardTierUpdatePayload["status"],
                    }))
                  }
                  value={payload.status}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </label>
            </div>

            <label className="field">
              <span className="field-label">Description</span>
              <textarea
                className="field-input field-textarea"
                disabled={isPending}
                onChange={(event) =>
                  setPayload((currentPayload) => ({
                    ...currentPayload,
                    description: event.target.value,
                  }))
                }
                value={payload.description}
              />
            </label>

            <label className="field">
              <span className="field-label">Claim instructions</span>
              <textarea
                className="field-input field-textarea"
                disabled={isPending}
                onChange={(event) =>
                  setPayload((currentPayload) => ({
                    ...currentPayload,
                    claimInstructions: event.target.value,
                  }))
                }
                value={payload.claimInstructions}
              />
            </label>

            <div className="pagination-row">
              <button className="button button-primary" disabled={isPending} type="submit">
                {isPending ? "Saving..." : "Save reward tier"}
              </button>
              <button
                className="button button-secondary"
                disabled={isPending}
                onClick={() => {
                  setIsEditing(false);
                  setPayload(createUpdatePayload(tier));
                  setActionState({
                    code: null,
                    message: null,
                    tone: "idle",
                  });
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
            {renderActionState(actionState)}
          </form>
        ) : (
          <div className="pagination-row">
            <button
              className="button button-secondary"
              disabled={!tier.canEdit}
              onClick={() => setIsEditing(true)}
              type="button"
            >
              Edit tier
            </button>
          </div>
        )}
        {!tier.canEdit ? (
          <p className="muted-text">
            Reward tiers stay visible after the event ends, but only draft, published, or active events can be edited.
          </p>
        ) : null}
      </div>
    </article>
  );
};
