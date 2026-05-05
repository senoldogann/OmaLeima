"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  formatClubEventDateTime,
  formatClubEventMeta,
  formatClubMembershipRole,
  getClubEventStatusClassName,
} from "@/features/club-events/format";
import {
  clubEventRefreshableStatuses,
  submitClubEventCancelRequestAsync,
  submitClubEventCreationRequestAsync,
  submitClubEventUpdateRequestAsync,
} from "@/features/club-events/event-client";
import { EventRulesBuilder } from "@/features/club-events/components/event-rules-builder";
import type {
  ClubEventActionState,
  ClubEventCreationPayload,
  ClubEventRecord,
  ClubEventUpdatePayload,
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
  rulesJson: JSON.stringify({ stampPolicy: { perBusinessLimit: 1 } }, null, 2),
  startAt: "",
  visibility: "PUBLIC",
});

const toLocalDateTimeInput = (value: string): string => {
  const date = new Date(value);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  const localDate = new Date(date.getTime() - timezoneOffsetMs);

  return localDate.toISOString().slice(0, 16);
};

const createUpdatePayload = (event: ClubEventRecord): ClubEventUpdatePayload => ({
  city: event.city,
  coverImageUrl: event.coverImageUrl ?? "",
  description: event.description ?? "",
  endAt: toLocalDateTimeInput(event.endAt),
  eventId: event.eventId,
  joinDeadlineAt: toLocalDateTimeInput(event.joinDeadlineAt),
  maxParticipants: event.maxParticipants === null ? "" : String(event.maxParticipants),
  minimumStampsRequired: String(event.minimumStampsRequired),
  name: event.name,
  rulesJson: event.rulesJson,
  startAt: toLocalDateTimeInput(event.startAt),
  status: event.status === "ACTIVE" || event.status === "PUBLISHED" ? event.status : "DRAFT",
  visibility: event.visibility,
});

const canCancelEvent = (event: ClubEventRecord): boolean =>
  event.status === "ACTIVE" || event.status === "DRAFT" || event.status === "PUBLISHED";

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
  const [selectedEventId, setSelectedEventId] = useState<string>(
    snapshot.recentEvents[0]?.eventId ?? ""
  );
  const selectedEvent = useMemo(
    () => snapshot.recentEvents.find((event) => event.eventId === selectedEventId) ?? null,
    [selectedEventId, snapshot.recentEvents]
  );
  const [updatePayload, setUpdatePayload] = useState<ClubEventUpdatePayload | null>(
    selectedEvent === null ? null : createUpdatePayload(selectedEvent)
  );
  const [updateActionState, setUpdateActionState] = useState<ClubEventActionState>({
    code: null,
    message: null,
    tone: "idle",
  });
  const [cancelActionState, setCancelActionState] = useState<ClubEventActionState>({
    code: null,
    message: null,
    tone: "idle",
  });
  const [isPending, setIsPending] = useState<boolean>(false);
  const [isUpdatePending, setIsUpdatePending] = useState<boolean>(false);
  const [isCancelPending, setIsCancelPending] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"memberships" | "create-event" | "manage-events">("memberships");

  const handleSelectEvent = (event: ClubEventRecord): void => {
    setSelectedEventId(event.eventId);
    setUpdatePayload(createUpdatePayload(event));
    setUpdateActionState({
      code: null,
      message: null,
      tone: "idle",
    });
    setCancelActionState({
      code: null,
      message: null,
      tone: "idle",
    });
  };

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

  const handleUpdateSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (updatePayload === null) {
      return;
    }

    setIsUpdatePending(true);
    setUpdateActionState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const response = await submitClubEventUpdateRequestAsync(updatePayload);
      const nextState: ClubEventActionState = {
        code: response.status,
        message: response.message,
        tone: response.status === "SUCCESS" ? "success" : "error",
      };

      setUpdateActionState(nextState);

      if (response.status !== null && clubEventRefreshableStatuses.has(response.status)) {
        router.refresh();
      }
    } catch (error) {
      setUpdateActionState({
        code: "REQUEST_ERROR",
        message: error instanceof Error ? error.message : "Unknown event update request error.",
        tone: "error",
      });
    } finally {
      setIsUpdatePending(false);
    }
  };

  const handleCancelEvent = async (event: ClubEventRecord): Promise<void> => {
    setIsCancelPending(true);
    setCancelActionState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const response = await submitClubEventCancelRequestAsync({
        eventId: event.eventId,
      });
      const nextState: ClubEventActionState = {
        code: response.status,
        message: response.message,
        tone: response.status === "SUCCESS" ? "success" : "error",
      };

      setCancelActionState(nextState);

      if (response.status !== null && clubEventRefreshableStatuses.has(response.status)) {
        router.refresh();
      }
    } catch (error) {
      setCancelActionState({
        code: "REQUEST_ERROR",
        message: error instanceof Error ? error.message : "Unknown event cancel request error.",
        tone: "error",
      });
    } finally {
      setIsCancelPending(false);
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

      <div className="tab-nav">
        <button className={activeTab === "memberships" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("memberships")} type="button">Memberships</button>
        <button className={activeTab === "create-event" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("create-event")} type="button">Create Event</button>
        <button className={activeTab === "manage-events" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("manage-events")} type="button">Manage Events</button>
      </div>

      <section className="content-grid" style={{ display: activeTab === "manage-events" ? "none" : undefined }}>
        <div className="stack-md" style={activeTab === "memberships" ? { gridColumn: "1 / -1" } : { display: "none" }}>
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

        <div className="stack-md" style={activeTab === "create-event" ? { gridColumn: "1 / -1" } : { display: "none" }}>
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

                <EventRulesBuilder
                  disabled={isPending}
                  onChange={(value) =>
                    setPayload((currentPayload) => ({
                      ...currentPayload,
                      rulesJson: value,
                    }))
                  }
                  value={payload.rulesJson}
                />

                <button className="button button-primary" disabled={isPending} type="submit">
                  {isPending ? "Creating..." : "Create draft event"}
                </button>
                {renderActionState(actionState)}
              </form>
            </article>
          )}
        </div>
      </section>

      <section className="panel" style={{ display: activeTab !== "manage-events" ? "none" : undefined }}>
        <div className="review-card-header">
          <div className="stack-sm">
            <div className="eyebrow">Manage event</div>
            <h3 className="section-title">Update the selected event</h3>
            <p className="muted-text">
              Keep published details current without deleting registrations, stamps, or reward history.
            </p>
          </div>
          {selectedEvent !== null ? (
            <span className={getClubEventStatusClassName(selectedEvent.status)}>{selectedEvent.status}</span>
          ) : null}
        </div>

        {selectedEvent === null || updatePayload === null ? (
          <p className="muted-text">Create or select an event before editing details.</p>
        ) : (
          <form className="stack-md" onSubmit={(event) => void handleUpdateSubmit(event)}>
            <div className="detail-grid">
              <label className="field">
                <span className="field-label">Selected event</span>
                <select
                  className="field-input"
                  disabled={isUpdatePending || isCancelPending}
                  onChange={(event) => {
                    const nextEvent = snapshot.recentEvents.find((record) => record.eventId === event.target.value);

                    if (typeof nextEvent !== "undefined") {
                      handleSelectEvent(nextEvent);
                    }
                  }}
                  value={selectedEvent.eventId}
                >
                  {snapshot.recentEvents.map((event) => (
                    <option key={event.eventId} value={event.eventId}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">Status</span>
                <select
                  className="field-input"
                  disabled={isUpdatePending || selectedEvent.status === "CANCELLED" || selectedEvent.status === "COMPLETED"}
                  onChange={(event) =>
                    setUpdatePayload((currentPayload) =>
                      currentPayload === null
                        ? null
                        : {
                          ...currentPayload,
                          status: event.target.value as ClubEventUpdatePayload["status"],
                        }
                    )
                  }
                  value={updatePayload.status}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ACTIVE">Active</option>
                </select>
              </label>

              <label className="field">
                <span className="field-label">Visibility</span>
                <select
                  className="field-input"
                  disabled={isUpdatePending}
                  onChange={(event) =>
                    setUpdatePayload((currentPayload) =>
                      currentPayload === null
                        ? null
                        : {
                          ...currentPayload,
                          visibility: event.target.value as ClubEventUpdatePayload["visibility"],
                        }
                    )
                  }
                  value={updatePayload.visibility}
                >
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                  <option value="UNLISTED">Unlisted</option>
                </select>
              </label>
            </div>

            <div className="detail-grid">
              <label className="field">
                <span className="field-label">Name</span>
                <input
                  className="field-input"
                  disabled={isUpdatePending}
                  onChange={(event) =>
                    setUpdatePayload((currentPayload) =>
                      currentPayload === null
                        ? null
                        : {
                          ...currentPayload,
                          name: event.target.value,
                        }
                    )
                  }
                  value={updatePayload.name}
                />
              </label>

              <label className="field">
                <span className="field-label">City</span>
                <input
                  className="field-input"
                  disabled={isUpdatePending}
                  onChange={(event) =>
                    setUpdatePayload((currentPayload) =>
                      currentPayload === null
                        ? null
                        : {
                          ...currentPayload,
                          city: event.target.value,
                        }
                    )
                  }
                  value={updatePayload.city}
                />
              </label>
            </div>

            <label className="field">
              <span className="field-label">Description</span>
              <textarea
                className="field-input field-textarea"
                disabled={isUpdatePending}
                onChange={(event) =>
                  setUpdatePayload((currentPayload) =>
                    currentPayload === null
                      ? null
                      : {
                        ...currentPayload,
                        description: event.target.value,
                      }
                  )
                }
                value={updatePayload.description}
              />
            </label>

            <div className="detail-grid">
              <label className="field">
                <span className="field-label">Start</span>
                <input
                  className="field-input"
                  disabled={isUpdatePending}
                  onChange={(event) =>
                    setUpdatePayload((currentPayload) =>
                      currentPayload === null
                        ? null
                        : {
                          ...currentPayload,
                          startAt: event.target.value,
                        }
                    )
                  }
                  type="datetime-local"
                  value={updatePayload.startAt}
                />
              </label>

              <label className="field">
                <span className="field-label">End</span>
                <input
                  className="field-input"
                  disabled={isUpdatePending}
                  onChange={(event) =>
                    setUpdatePayload((currentPayload) =>
                      currentPayload === null
                        ? null
                        : {
                          ...currentPayload,
                          endAt: event.target.value,
                        }
                    )
                  }
                  type="datetime-local"
                  value={updatePayload.endAt}
                />
              </label>

              <label className="field">
                <span className="field-label">Join deadline</span>
                <input
                  className="field-input"
                  disabled={isUpdatePending}
                  onChange={(event) =>
                    setUpdatePayload((currentPayload) =>
                      currentPayload === null
                        ? null
                        : {
                          ...currentPayload,
                          joinDeadlineAt: event.target.value,
                        }
                    )
                  }
                  type="datetime-local"
                  value={updatePayload.joinDeadlineAt}
                />
              </label>

              <label className="field">
                <span className="field-label">Cover image URL</span>
                <input
                  className="field-input"
                  disabled={isUpdatePending}
                  onChange={(event) =>
                    setUpdatePayload((currentPayload) =>
                      currentPayload === null
                        ? null
                        : {
                          ...currentPayload,
                          coverImageUrl: event.target.value,
                        }
                    )
                  }
                  value={updatePayload.coverImageUrl}
                />
              </label>

              <label className="field">
                <span className="field-label">Max participants</span>
                <input
                  className="field-input"
                  disabled={isUpdatePending}
                  onChange={(event) =>
                    setUpdatePayload((currentPayload) =>
                      currentPayload === null
                        ? null
                        : {
                          ...currentPayload,
                          maxParticipants: event.target.value,
                        }
                    )
                  }
                  type="number"
                  value={updatePayload.maxParticipants}
                />
              </label>

              <label className="field">
                <span className="field-label">Minimum stamps required</span>
                <input
                  className="field-input"
                  disabled={isUpdatePending}
                  onChange={(event) =>
                    setUpdatePayload((currentPayload) =>
                      currentPayload === null
                        ? null
                        : {
                          ...currentPayload,
                          minimumStampsRequired: event.target.value,
                        }
                    )
                  }
                  type="number"
                  value={updatePayload.minimumStampsRequired}
                />
              </label>
            </div>

            <EventRulesBuilder
              disabled={isUpdatePending}
              onChange={(value) =>
                setUpdatePayload((currentPayload) =>
                  currentPayload === null
                    ? null
                    : {
                      ...currentPayload,
                      rulesJson: value,
                    }
                )
              }
              value={updatePayload.rulesJson}
            />

            <div className="button-row">
              <button
                className="button button-primary"
                disabled={isUpdatePending || selectedEvent.status === "CANCELLED" || selectedEvent.status === "COMPLETED"}
                type="submit"
              >
                {isUpdatePending ? "Saving..." : "Save event"}
              </button>
              <button
                className="button button-danger"
                disabled={isCancelPending || !canCancelEvent(selectedEvent)}
                onClick={() => void handleCancelEvent(selectedEvent)}
                type="button"
              >
                {isCancelPending ? "Cancelling..." : "Cancel event"}
              </button>
            </div>
            {renderActionState(updateActionState)}
            {renderActionState(cancelActionState)}
          </form>
        )}
      </section>

      <section className="stack-md" style={{ display: activeTab !== "manage-events" ? "none" : undefined }}>
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
              <article
                key={event.eventId}
                className={`panel review-card-compact event-management-card ${event.eventId === selectedEventId ? "event-management-card-active" : ""}`}
              >
                <div className="stack-sm">
                  <div className="review-card-header">
                    <div className="stack-sm">
                      <h3 className="section-title">{event.name}</h3>
                      <p className="muted-text">{formatClubEventMeta(event)}</p>
                    </div>
                    <span className={getClubEventStatusClassName(event.status)}>{event.status}</span>
                  </div>
                  <div className="event-stat-row">
                    <span className="event-stat">
                      <strong>{event.registeredParticipantCount}</strong>
                      <span>registered</span>
                    </span>
                    <span className="event-stat">
                      <strong>{event.joinedVenueCount}</strong>
                      <span>venues</span>
                    </span>
                    <span className="event-stat">
                      <strong>{event.minimumStampsRequired}</strong>
                      <span>stamps</span>
                    </span>
                  </div>
                  <p className="muted-text">
                    {formatClubEventDateTime(event.startAt)} to {formatClubEventDateTime(event.endAt)}
                  </p>
                  <p className="muted-text">
                    Join deadline {formatClubEventDateTime(event.joinDeadlineAt)}
                  </p>
                  <p className="muted-text">
                    {event.maxParticipants === null ? "Unlimited capacity" : `${event.maxParticipants} max participants`}
                    {event.createdByEmail !== null ? ` · Created by ${event.createdByEmail}` : ""}
                  </p>
                  <div className="button-row">
                    <button className="button button-secondary" onClick={() => handleSelectEvent(event)} type="button">
                      Edit details
                    </button>
                    <button
                      className="button button-danger"
                      disabled={!canCancelEvent(event) || isCancelPending}
                      onClick={() => void handleCancelEvent(event)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
