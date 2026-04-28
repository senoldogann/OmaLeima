"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  formatManageableRewardEventMeta,
} from "@/features/club-rewards/format";
import { RewardTierCard } from "@/features/club-rewards/components/reward-tier-card";
import { rewardTierRefreshableStatuses, submitRewardTierCreateRequestAsync } from "@/features/club-rewards/reward-tier-client";
import type {
  ClubRewardTierActionState,
  ClubRewardTierCreatePayload,
  ClubRewardsSnapshot,
} from "@/features/club-rewards/types";

type ClubRewardsPanelProps = {
  snapshot: ClubRewardsSnapshot;
};

const createInitialPayload = (eventId: string): ClubRewardTierCreatePayload => ({
  claimInstructions: "",
  description: "",
  eventId,
  inventoryTotal: "",
  requiredStampCount: "1",
  rewardType: "HAALARIMERKKI",
  title: "",
});

const renderActionState = (state: ClubRewardTierActionState) => {
  if (state.message === null) {
    return null;
  }

  return <p className={state.tone === "success" ? "inline-success" : "inline-error"}>{state.message}</p>;
};

export const ClubRewardsPanel = ({ snapshot }: ClubRewardsPanelProps) => {
  const router = useRouter();
  const editableEvents = useMemo(
    () => snapshot.events.filter((event) => event.canManageRewards),
    [snapshot.events]
  );
  const [payload, setPayload] = useState<ClubRewardTierCreatePayload>(
    createInitialPayload(editableEvents[0]?.eventId ?? "")
  );
  const [actionState, setActionState] = useState<ClubRewardTierActionState>({
    code: null,
    message: null,
    tone: "idle",
  });
  const [isPending, setIsPending] = useState<boolean>(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsPending(true);
    setActionState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const response = await submitRewardTierCreateRequestAsync(payload);
      setActionState({
        code: response.status,
        message: response.message,
        tone: response.status === "SUCCESS" ? "success" : "error",
      });

      if (response.status !== null && rewardTierRefreshableStatuses.has(response.status)) {
        setPayload(createInitialPayload(payload.eventId));
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
    <div className="stack-lg">
      <section className="metrics-grid">
        <article className="panel panel-accent">
          <div className="stack-sm">
            <span className="field-label">Manageable events</span>
            <strong className="metric-value">{snapshot.summary.manageableEventCount}</strong>
            <p className="muted-text">Club events where this organizer can review reward catalog visibility.</p>
          </div>
        </article>

        <article className="panel">
          <div className="stack-sm">
            <span className="field-label">Total reward tiers</span>
            <strong className="metric-value">{snapshot.summary.totalTierCount}</strong>
            <p className="muted-text">
              Latest list shows {snapshot.summary.visibleTierCount} tier{snapshot.summary.visibleTierCount === 1 ? "" : "s"} in the current club session.
            </p>
          </div>
        </article>

        <article className="panel panel-warning">
          <div className="stack-sm">
            <span className="field-label">Low-stock tiers</span>
            <strong className="metric-value">{snapshot.summary.lowStockTierCount}</strong>
            <p className="muted-text">Reward tiers that are nearly out or fully exhausted based on claimed stock.</p>
          </div>
        </article>
      </section>

      <section className="content-grid">
        <div className="stack-md">
          <div className="stack-sm">
            <div className="eyebrow">Event catalog</div>
            <h3 className="section-title">Manageable events</h3>
            <p className="muted-text">
              Pick an active club event before publishing a new reward tier. Completed events stay visible for stock context but are not editable.
            </p>
          </div>

          {snapshot.events.length === 0 ? (
            <article className="panel">
              <p className="muted-text">No club events are visible yet. Create an event first, then return here for rewards.</p>
            </article>
          ) : (
            <div className="content-grid">
              {snapshot.events.map((event) => (
                <article key={event.eventId} className="panel review-card-compact">
                  <div className="stack-sm">
                    <h3 className="section-title">{event.name}</h3>
                    <p className="muted-text">{formatManageableRewardEventMeta(event)}</p>
                    <p className="review-note">
                      {event.rewardTierCount} reward tier{event.rewardTierCount === 1 ? "" : "s"} · {event.eventStatus}
                    </p>
                    <span className={event.canManageRewards ? "status-pill status-pill-success" : "status-pill"}>
                      {event.canManageRewards ? "Editable" : "Read-only"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="stack-md">
          <div className="stack-sm">
            <div className="eyebrow">Create reward</div>
            <h3 className="section-title">New reward tier</h3>
            <p className="muted-text">
              Publish reward thresholds for an event and keep claim instructions or stock notes in one place.
            </p>
          </div>

          {editableEvents.length === 0 ? (
            <article className="panel">
              <p className="muted-text">No editable events are available for reward tier management right now.</p>
            </article>
          ) : (
            <article className="panel">
              <form className="stack-md" onSubmit={(event) => void handleSubmit(event)}>
                <label className="field">
                  <span className="field-label">Event</span>
                  <select
                    className="field-input"
                    disabled={isPending}
                    onChange={(event) =>
                      setPayload((currentPayload) => ({
                        ...currentPayload,
                        eventId: event.target.value,
                      }))
                    }
                    value={payload.eventId}
                  >
                    {editableEvents.map((event) => (
                      <option key={event.eventId} value={event.eventId}>
                        {event.name}
                      </option>
                    ))}
                  </select>
                </label>

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
                          rewardType: event.target.value as ClubRewardTierCreatePayload["rewardType"],
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

                <button className="button button-primary" disabled={isPending} type="submit">
                  {isPending ? "Saving..." : "Create reward tier"}
                </button>
                {renderActionState(actionState)}
              </form>
            </article>
          )}
        </div>
      </section>

      <section className="stack-md">
        <div className="stack-sm">
          <div className="eyebrow">Reward catalog</div>
          <h3 className="section-title">Latest reward tiers</h3>
          <p className="muted-text">
            Showing the latest {snapshot.summary.visibleTierCount} reward tier{snapshot.summary.visibleTierCount === 1 ? "" : "s"} visible in this organizer session, including disabled tiers kept for stock history.
          </p>
        </div>

        {snapshot.rewardTiers.length === 0 ? (
          <article className="panel">
            <p className="muted-text">No reward tiers are visible yet. Create the first reward tier for an event above.</p>
          </article>
        ) : (
          <div className="review-grid">
            {snapshot.rewardTiers.map((tier) => (
              <RewardTierCard key={tier.rewardTierId} tier={tier} />
            ))}
          </div>
        )}

        <p className="muted-text">Claimed reward units currently visible across these tiers: {snapshot.summary.claimedUnitCount}.</p>
      </section>
    </div>
  );
};
