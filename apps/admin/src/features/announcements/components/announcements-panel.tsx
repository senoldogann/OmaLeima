"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { submitAnnouncementCreateRequestAsync } from "@/features/announcements/client";
import type {
  AnnouncementActionState,
  AnnouncementCreatePayload,
  AnnouncementRecord,
  AnnouncementSnapshot,
} from "@/features/announcements/types";

type AnnouncementsPanelProps = {
  snapshot: AnnouncementSnapshot;
};

const toLocalDateTimeInput = (value: Date): string => {
  const timezoneOffsetMs = value.getTimezoneOffset() * 60_000;
  const localDate = new Date(value.getTime() - timezoneOffsetMs);

  return localDate.toISOString().slice(0, 16);
};

const createInitialPayload = (snapshot: AnnouncementSnapshot): AnnouncementCreatePayload => {
  const startsAt = toLocalDateTimeInput(new Date());

  return {
    audience: snapshot.scope === "CLUB" ? "STUDENTS" : "ALL",
    body: "",
    clubId: snapshot.scope === "CLUB" ? snapshot.clubOptions[0]?.clubId ?? "" : "",
    ctaLabel: "",
    ctaUrl: "",
    endsAt: "",
    priority: "0",
    startsAt,
    status: "PUBLISHED",
    title: "",
  };
};

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat("fi-FI", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));

const renderState = (state: AnnouncementActionState) => {
  if (state.message === null) {
    return null;
  }

  return <p className={state.tone === "success" ? "inline-success" : "inline-error"}>{state.message}</p>;
};

const renderAnnouncementCard = (announcement: AnnouncementRecord) => (
  <article className="panel" key={announcement.announcementId}>
    <div className="stack-sm">
      <div className="split-row">
        <span className="field-label">{announcement.clubName ?? "Platform"}</span>
        <span className={`status-pill status-${announcement.status.toLowerCase()}`}>{announcement.status}</span>
      </div>
      <h3 className="section-title">{announcement.title}</h3>
      <p className="muted-text">{announcement.body}</p>
      <div className="meta-grid">
        <span>{announcement.audience}</span>
        <span>Starts {formatDate(announcement.startsAt)}</span>
        <span>{announcement.endsAt === null ? "No end date" : `Ends ${formatDate(announcement.endsAt)}`}</span>
        <span>Priority {announcement.priority}</span>
      </div>
      {announcement.ctaLabel !== null && announcement.ctaUrl !== null ? (
        <a className="text-link" href={announcement.ctaUrl} rel="noreferrer" target="_blank">
          {announcement.ctaLabel}
        </a>
      ) : null}
    </div>
  </article>
);

export const AnnouncementsPanel = ({ snapshot }: AnnouncementsPanelProps) => {
  const router = useRouter();
  const [payload, setPayload] = useState<AnnouncementCreatePayload>(createInitialPayload(snapshot));
  const [isPending, setIsPending] = useState<boolean>(false);
  const [actionState, setActionState] = useState<AnnouncementActionState>({
    code: null,
    message: null,
    tone: "idle",
  });
  const canCreate = snapshot.scope === "ADMIN" || snapshot.clubOptions.length > 0;
  const title = snapshot.scope === "ADMIN" ? "Platform announcement" : "Club announcement";
  const audienceOptions = useMemo(
    () => (snapshot.scope === "ADMIN" ? ["ALL", "STUDENTS", "BUSINESSES", "CLUBS"] : ["ALL", "STUDENTS", "CLUBS"]),
    [snapshot.scope]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsPending(true);
    setActionState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const response = await submitAnnouncementCreateRequestAsync(payload);
      setActionState({
        code: response.status,
        message: response.message,
        tone: response.status === "SUCCESS" ? "success" : "error",
      });

      if (response.status === "SUCCESS") {
        setPayload(createInitialPayload(snapshot));
        router.refresh();
      }
    } catch (error) {
      setActionState({
        code: "REQUEST_ERROR",
        message: error instanceof Error ? error.message : "Unknown announcement request error.",
        tone: "error",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="stack-lg">
      <section className="panel panel-accent">
        <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <div className="form-grid-full stack-sm">
            <span className="field-label">{title}</span>
            <h3 className="section-title">Publish an in-app popup</h3>
            <p className="muted-text">
              This creates the source announcement. Push fan-out and follower preferences are the next separate rollout.
            </p>
          </div>

          {snapshot.scope === "CLUB" ? (
            <label className="field-stack">
              <span className="field-label">Club</span>
              <select
                disabled={!canCreate || isPending}
                value={payload.clubId}
                onChange={(event) => setPayload((current) => ({ ...current, clubId: event.target.value }))}
              >
                {snapshot.clubOptions.map((club) => (
                  <option key={club.clubId} value={club.clubId}>
                    {club.clubName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="field-stack">
            <span className="field-label">Audience</span>
            <select
              disabled={!canCreate || isPending}
              value={payload.audience}
              onChange={(event) =>
                setPayload((current) => ({
                  ...current,
                  audience: event.target.value as AnnouncementCreatePayload["audience"],
                }))
              }
            >
              {audienceOptions.map((audience) => (
                <option key={audience} value={audience}>
                  {audience}
                </option>
              ))}
            </select>
          </label>

          <label className="field-stack">
            <span className="field-label">Status</span>
            <select
              disabled={!canCreate || isPending}
              value={payload.status}
              onChange={(event) =>
                setPayload((current) => ({
                  ...current,
                  status: event.target.value as AnnouncementCreatePayload["status"],
                }))
              }
            >
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="DRAFT">DRAFT</option>
            </select>
          </label>

          <label className="field-stack">
            <span className="field-label">Priority</span>
            <input
              disabled={!canCreate || isPending}
              max="10"
              min="0"
              onChange={(event) => setPayload((current) => ({ ...current, priority: event.target.value }))}
              type="number"
              value={payload.priority}
            />
          </label>

          <label className="field-stack form-grid-full">
            <span className="field-label">Title</span>
            <input
              disabled={!canCreate || isPending}
              onChange={(event) => setPayload((current) => ({ ...current, title: event.target.value }))}
              placeholder="Uusi appropäivän ohje"
              value={payload.title}
            />
          </label>

          <label className="field-stack form-grid-full">
            <span className="field-label">Message</span>
            <textarea
              disabled={!canCreate || isPending}
              onChange={(event) => setPayload((current) => ({ ...current, body: event.target.value }))}
              placeholder="Kirjoita lyhyt, selkeä viesti opiskelijoille."
              rows={5}
              value={payload.body}
            />
          </label>

          <label className="field-stack">
            <span className="field-label">Starts at</span>
            <input
              disabled={!canCreate || isPending}
              onChange={(event) => setPayload((current) => ({ ...current, startsAt: event.target.value }))}
              type="datetime-local"
              value={payload.startsAt}
            />
          </label>

          <label className="field-stack">
            <span className="field-label">Ends at</span>
            <input
              disabled={!canCreate || isPending}
              onChange={(event) => setPayload((current) => ({ ...current, endsAt: event.target.value }))}
              type="datetime-local"
              value={payload.endsAt}
            />
          </label>

          <label className="field-stack">
            <span className="field-label">CTA label</span>
            <input
              disabled={!canCreate || isPending}
              onChange={(event) => setPayload((current) => ({ ...current, ctaLabel: event.target.value }))}
              placeholder="Avaa tapahtuma"
              value={payload.ctaLabel}
            />
          </label>

          <label className="field-stack">
            <span className="field-label">CTA URL</span>
            <input
              disabled={!canCreate || isPending}
              onChange={(event) => setPayload((current) => ({ ...current, ctaUrl: event.target.value }))}
              placeholder="https://..."
              value={payload.ctaUrl}
            />
          </label>

          <div className="form-grid-full stack-sm">
            {renderState(actionState)}
            <button className="primary-action" disabled={!canCreate || isPending} type="submit">
              {isPending ? "Saving..." : "Save announcement"}
            </button>
          </div>
        </form>
      </section>

      <section className="stack-md">
        <div className="split-row">
          <h3 className="section-title">Latest announcements</h3>
          <span className="field-label">{snapshot.announcements.length} rows</span>
        </div>
        {snapshot.announcements.length === 0 ? (
          <article className="panel">
            <p className="muted-text">No announcements are visible for this scope yet.</p>
          </article>
        ) : (
          <div className="card-list">{snapshot.announcements.map(renderAnnouncementCard)}</div>
        )}
      </section>
    </div>
  );
};
