"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  formatClubEventDateTime,
  formatClubEventMeta,
  formatClubMembershipRole,
  getClubEventStatusClassName,
} from "@/features/club-events/format";
import { clubEventRefreshableStatuses, submitClubEventCreationRequestAsync } from "@/features/club-events/event-client";
import type {
  ClubEventActionState,
  ClubEventCreationPayload,
  ClubEventsSnapshot,
} from "@/features/club-events/types";

type ClubEventsPanelProps = {
  snapshot: ClubEventsSnapshot;
};

const createInitialPayload = (clubId: string): ClubEventCreationPayload => ({
  city: "",
  clubId,
  country: "Finland",
  coverImageUrl: "",
  description: "",
  endAt: "",
  joinDeadlineAt: "",
  maxParticipants: "",
  minimumStampsRequired: "0",
  name: "",
  rulesJson: "{}",
  startAt: "",
  visibility: "PUBLIC",
});

const renderActionState = (state: ClubEventActionState) => {
  if (state.message === null) {
    return null;
  }

  return <p className={state.tone === "success" ? "inline-success" : "inline-error"}>{state.message}</p>;
};

export const ClubEventsPanel = ({ snapshot }: ClubEventsPanelProps) => {
  const router = useRouter();
  const creatableMemberships = useMemo(
    () => snapshot.memberships.filter((membership) => membership.canCreateEvents),
    [snapshot.memberships]
  );
  const [payload, setPayload] = useState<ClubEventCreationPayload>(
    createInitialPayload(creatableMemberships[0]?.clubId ?? "")
  );
  const [actionState, setActionState] = useState<ClubEventActionState>({
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
      const response = await submitClubEventCreationRequestAsync(payload);
      const nextState: ClubEventActionState = {
        code: response.status,
        message: response.message,
        tone: response.status === "SUCCESS" ? "success" : "error",
      };

      setActionState(nextState);

      if (response.status !== null && clubEventRefreshableStatuses.has(response.status)) {
        router.refresh();
        setPayload(createInitialPayload(payload.clubId));
      }
    } catch (error) {
      setActionState({
        code: "REQUEST_ERROR",
        message: error instanceof Error ? error.message : "Unknown event creation request error.",
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
            <span className="field-label">Managed clubs</span>
            <strong className="metric-value">{snapshot.summary.managedClubCount}</strong>
            <p className="muted-text">Active clubs currently visible in this organizer session.</p>
          </div>
        </article>

        <article className="panel">
          <div className="stack-sm">
            <span className="field-label">Creatable clubs</span>
            <strong className="metric-value">{snapshot.summary.creatableClubCount}</strong>
            <p className="muted-text">Clubs where this account can create new events right now.</p>
          </div>
        </article>

        <article className="panel panel-warning">
          <div className="stack-sm">
            <span className="field-label">Visible events</span>
            <strong className="metric-value">{snapshot.summary.visibleEventCount}</strong>
            <p className="muted-text">Draft, published, active, completed, or cancelled events readable through club RLS.</p>
          </div>
        </article>
      </section>

      <section className="content-grid">
        <div className="stack-md">
          <div className="stack-sm">
            <div className="eyebrow">Club access</div>
            <h3 className="section-title">Active memberships</h3>
            <p className="muted-text">
              Choose the correct club before creating an event when this account manages more than one community.
            </p>
          </div>

          {snapshot.memberships.length === 0 ? (
            <article className="panel">
              <p className="muted-text">No active club memberships are visible right now.</p>
            </article>
          ) : (
            <div className="content-grid">
              {snapshot.memberships.map((membership) => (
                <article key={membership.clubId} className="panel review-card-compact">
                  <div className="stack-sm">
                    <h3 className="section-title">{membership.clubName}</h3>
                    <p className="muted-text">
                      {[membership.city, formatClubMembershipRole(membership.membershipRole)]
                        .filter((value) => value !== null)
                        .join(" · ")}
                    </p>
                    <span className={membership.canCreateEvents ? "status-pill status-pill-success" : "status-pill"}>
                      {membership.canCreateEvents ? "Can create events" : "Read-only access"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="stack-md">
          <div className="stack-sm">
            <div className="eyebrow">Create event</div>
            <h3 className="section-title">New club event</h3>
            <p className="muted-text">
              New events start as drafts. Reward tiers and venues can be added after the draft exists.
            </p>
          </div>

          {creatableMemberships.length === 0 ? (
            <article className="panel">
              <p className="muted-text">This signed-in club account does not currently have organizer or owner rights for event creation.</p>
            </article>
          ) : (
            <article className="panel">
              <form className="stack-md" onSubmit={(event) => void handleSubmit(event)}>
                <label className="field">
                  <span className="field-label">Club</span>
                  <select
                    className="field-input"
                    disabled={isPending}
                    onChange={(event) =>
                      setPayload((currentPayload) => ({
                        ...currentPayload,
                        clubId: event.target.value,
                      }))
                    }
                    value={payload.clubId}
                  >
                    {creatableMemberships.map((membership) => (
                      <option key={membership.clubId} value={membership.clubId}>
                        {membership.clubName}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="detail-grid">
                  <label className="field">
                    <span className="field-label">Name</span>
                    <input
                      className="field-input"
                      disabled={isPending}
                      onChange={(event) =>
                        setPayload((currentPayload) => ({
                          ...currentPayload,
                          name: event.target.value,
                        }))
                      }
                      value={payload.name}
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">City</span>
                    <input
                      className="field-input"
                      disabled={isPending}
                      onChange={(event) =>
                        setPayload((currentPayload) => ({
                          ...currentPayload,
                          city: event.target.value,
                        }))
                      }
                      value={payload.city}
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Country</span>
                    <input
                      className="field-input"
                      disabled={isPending}
                      onChange={(event) =>
                        setPayload((currentPayload) => ({
                          ...currentPayload,
                          country: event.target.value,
                        }))
                      }
                      value={payload.country}
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Visibility</span>
                    <select
                      className="field-input"
                      disabled={isPending}
                      onChange={(event) =>
                        setPayload((currentPayload) => ({
                          ...currentPayload,
                          visibility: event.target.value as ClubEventCreationPayload["visibility"],
                        }))
                      }
                      value={payload.visibility}
                    >
                      <option value="PUBLIC">Public</option>
                      <option value="PRIVATE">Private</option>
                      <option value="UNLISTED">Unlisted</option>
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

                <div className="detail-grid">
                  <label className="field">
                    <span className="field-label">Start</span>
                    <input
                      className="field-input"
                      disabled={isPending}
                      onChange={(event) =>
                        setPayload((currentPayload) => ({
                          ...currentPayload,
                          startAt: event.target.value,
                        }))
                      }
                      type="datetime-local"
                      value={payload.startAt}
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">End</span>
                    <input
                      className="field-input"
                      disabled={isPending}
                      onChange={(event) =>
                        setPayload((currentPayload) => ({
                          ...currentPayload,
                          endAt: event.target.value,
                        }))
                      }
                      type="datetime-local"
                      value={payload.endAt}
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Join deadline</span>
                    <input
                      className="field-input"
                      disabled={isPending}
                      onChange={(event) =>
                        setPayload((currentPayload) => ({
                          ...currentPayload,
                          joinDeadlineAt: event.target.value,
                        }))
                      }
                      type="datetime-local"
                      value={payload.joinDeadlineAt}
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Cover image URL</span>
                    <input
                      className="field-input"
                      disabled={isPending}
                      onChange={(event) =>
                        setPayload((currentPayload) => ({
                          ...currentPayload,
                          coverImageUrl: event.target.value,
                        }))
                      }
                      value={payload.coverImageUrl}
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Max participants</span>
                    <input
                      className="field-input"
                      disabled={isPending}
                      onChange={(event) =>
                        setPayload((currentPayload) => ({
                          ...currentPayload,
                          maxParticipants: event.target.value,
                        }))
                      }
                      type="number"
                      value={payload.maxParticipants}
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Minimum stamps required</span>
                    <input
                      className="field-input"
                      disabled={isPending}
                      onChange={(event) =>
                        setPayload((currentPayload) => ({
                          ...currentPayload,
                          minimumStampsRequired: event.target.value,
                        }))
                      }
                      type="number"
                      value={payload.minimumStampsRequired}
                    />
                  </label>
                </div>

                <label className="field">
                  <span className="field-label">Rules JSON</span>
                  <textarea
                    className="field-input field-textarea"
                    disabled={isPending}
                    onChange={(event) =>
                      setPayload((currentPayload) => ({
                        ...currentPayload,
                        rulesJson: event.target.value,
                      }))
                    }
                    value={payload.rulesJson}
                  />
                </label>

                <button className="button button-primary" disabled={isPending} type="submit">
                  {isPending ? "Creating..." : "Create draft event"}
                </button>
                {renderActionState(actionState)}
              </form>
            </article>
          )}
        </div>
      </section>

      <section className="stack-md">
        <div className="stack-sm">
          <div className="eyebrow">Recent events</div>
          <h3 className="section-title">Latest visible club events</h3>
          <p className="muted-text">
            Showing the latest {snapshot.summary.latestEventLimit} events readable through this club session.
          </p>
        </div>

        {snapshot.recentEvents.length === 0 ? (
          <article className="panel">
            <p className="muted-text">No club events are visible yet. Create the first draft to start the workflow.</p>
          </article>
        ) : (
          <div className="content-grid">
            {snapshot.recentEvents.map((event) => (
              <article key={event.eventId} className="panel review-card-compact">
                <div className="stack-sm">
                  <div className="review-card-header">
                    <div className="stack-sm">
                      <h3 className="section-title">{event.name}</h3>
                      <p className="muted-text">{formatClubEventMeta(event)}</p>
                    </div>
                    <span className={getClubEventStatusClassName(event.status)}>{event.status}</span>
                  </div>
                  <p className="review-note">Slug: {event.slug}</p>
                  <p className="muted-text">
                    {formatClubEventDateTime(event.startAt)} to {formatClubEventDateTime(event.endAt)}
                  </p>
                  <p className="muted-text">
                    Join deadline {formatClubEventDateTime(event.joinDeadlineAt)} · Minimum stamps {event.minimumStampsRequired}
                  </p>
                  <p className="muted-text">
                    {event.maxParticipants === null ? "Unlimited capacity" : `${event.maxParticipants} max participants`}
                    {event.createdByEmail !== null ? ` · Created by ${event.createdByEmail}` : ""}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
