"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  submitAnnouncementArchiveRequestAsync,
  submitAnnouncementCreateRequestAsync,
  submitAnnouncementPushRequestAsync,
  submitAnnouncementUpdateRequestAsync,
} from "@/features/announcements/client";
import { uploadAnnouncementImageAsync } from "@/features/announcements/media-upload";
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
    imageUrl: "",
    priority: "0",
    startsAt,
    status: "PUBLISHED",
    title: "",
  };
};

const createPayloadFromAnnouncement = (
  announcement: AnnouncementRecord
): AnnouncementCreatePayload => ({
  audience: announcement.audience,
  body: announcement.body,
  clubId: announcement.clubId ?? "",
  ctaLabel: announcement.ctaLabel ?? "",
  ctaUrl: announcement.ctaUrl ?? "",
  endsAt: announcement.endsAt === null ? "" : toLocalDateTimeInput(new Date(announcement.endsAt)),
  imageUrl: announcement.imageUrl ?? "",
  priority: String(announcement.priority),
  startsAt: toLocalDateTimeInput(new Date(announcement.startsAt)),
  status: announcement.status === "ARCHIVED" ? "DRAFT" : announcement.status,
  title: announcement.title,
});

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

export const AnnouncementsPanel = ({ snapshot }: AnnouncementsPanelProps) => {
  const router = useRouter();
  const [payload, setPayload] = useState<AnnouncementCreatePayload>(createInitialPayload(snapshot));
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [isImageUploading, setIsImageUploading] = useState<boolean>(false);
  const [pendingArchiveAnnouncementId, setPendingArchiveAnnouncementId] = useState<string | null>(null);
  const [pendingPushAnnouncementId, setPendingPushAnnouncementId] = useState<string | null>(null);
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
  const isEditingAnnouncement = editingAnnouncementId !== null;
  const isFormDisabled = !canCreate || isPending || isImageUploading || pendingArchiveAnnouncementId !== null;
  const [activeTab, setActiveTab] = useState<"compose" | "announcements">("compose");

  const resetForm = (): void => {
    setEditingAnnouncementId(null);
    setPayload(createInitialPayload(snapshot));
  };

  const handleEditPress = (announcement: AnnouncementRecord): void => {
    setEditingAnnouncementId(announcement.announcementId);
    setPayload(createPayloadFromAnnouncement(announcement));
    setActionState({
      code: null,
      message: null,
      tone: "idle",
    });
  };

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const selectedFile = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (selectedFile === null) {
      return;
    }

    setIsImageUploading(true);
    setActionState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const supabase = createClient();
      const uploadedImage = await uploadAnnouncementImageAsync({
        file: selectedFile,
        scope:
          snapshot.scope === "ADMIN"
            ? { scope: "ADMIN" }
            : {
              clubId: payload.clubId,
              scope: "CLUB",
            },
        supabase,
      });

      setPayload((current) => ({
        ...current,
        imageUrl: uploadedImage.publicUrl,
      }));
      setActionState({
        code: "IMAGE_UPLOADED",
        message: "Announcement image uploaded successfully.",
        tone: "success",
      });
    } catch (error) {
      setActionState({
        code: "IMAGE_UPLOAD_ERROR",
        message: error instanceof Error ? error.message : "Unknown announcement image upload error.",
        tone: "error",
      });
    } finally {
      setIsImageUploading(false);
    }
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
      const response =
        editingAnnouncementId === null
          ? await submitAnnouncementCreateRequestAsync(payload)
          : await submitAnnouncementUpdateRequestAsync(editingAnnouncementId, payload);
      setActionState({
        code: response.status,
        message: response.message,
        tone: response.status === "SUCCESS" ? "success" : "error",
      });

      if (response.status === "SUCCESS") {
        resetForm();
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

  const handleArchivePress = async (announcement: AnnouncementRecord): Promise<void> => {
    setPendingArchiveAnnouncementId(announcement.announcementId);
    setActionState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const response = await submitAnnouncementArchiveRequestAsync(
        announcement.announcementId,
        announcement.clubId
      );
      setActionState({
        code: response.status,
        message: response.message,
        tone: response.status === "SUCCESS" ? "success" : "error",
      });

      if (response.status === "SUCCESS") {
        if (editingAnnouncementId === announcement.announcementId) {
          resetForm();
        }

        router.refresh();
      }
    } catch (error) {
      setActionState({
        code: "REQUEST_ERROR",
        message: error instanceof Error ? error.message : "Unknown announcement archive request error.",
        tone: "error",
      });
    } finally {
      setPendingArchiveAnnouncementId(null);
    }
  };

  const handleSendPushPress = async (announcement: AnnouncementRecord): Promise<void> => {
    setPendingPushAnnouncementId(announcement.announcementId);
    setActionState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const response = await submitAnnouncementPushRequestAsync(announcement.announcementId);
      const deliveryText =
        typeof response.notificationsSent === "number" || typeof response.notificationsFailed === "number"
          ? ` Sent ${response.notificationsSent ?? 0}, failed ${response.notificationsFailed ?? 0}.`
          : "";

      setActionState({
        code: response.status,
        message: `${response.message}${deliveryText}`,
        tone: response.status === "SUCCESS" || response.status === "PARTIAL_SUCCESS" ? "success" : "error",
      });

      if (response.status === "SUCCESS" || response.status === "PARTIAL_SUCCESS") {
        router.refresh();
      }
    } catch (error) {
      setActionState({
        code: "REQUEST_ERROR",
        message: error instanceof Error ? error.message : "Unknown announcement push request error.",
        tone: "error",
      });
    } finally {
      setPendingPushAnnouncementId(null);
    }
  };

  const renderAnnouncementCard = (announcement: AnnouncementRecord) => {
    const canSendPush = announcement.status === "PUBLISHED";
    const canArchive = announcement.status !== "ARCHIVED";

    return (
      <article className="panel" key={announcement.announcementId}>
        <div className="stack-sm">
          <div className="split-row">
            <span className="field-label">{announcement.clubName ?? "Platform"}</span>
            <span className={`status-pill status-${announcement.status.toLowerCase()}`}>{announcement.status}</span>
          </div>
          <h3 className="section-title">{announcement.title}</h3>
          {announcement.imageUrl !== null ? (
            <div
              aria-hidden="true"
              className="announcement-card-image"
              style={{ backgroundImage: `url(${announcement.imageUrl})` }}
            />
          ) : null}
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
          <div className="button-row">
            <button
              className="secondary-action"
              disabled={isFormDisabled}
              onClick={() => handleEditPress(announcement)}
              type="button"
            >
              Edit
            </button>
            {canArchive ? (
              <button
                className="secondary-action"
                disabled={isFormDisabled}
                onClick={() => void handleArchivePress(announcement)}
                type="button"
              >
                {pendingArchiveAnnouncementId === announcement.announcementId ? "Archiving..." : "Archive"}
              </button>
            ) : null}
            <button
              className="secondary-action"
              disabled={!canSendPush || pendingPushAnnouncementId !== null || pendingArchiveAnnouncementId !== null}
              onClick={() => void handleSendPushPress(announcement)}
              type="button"
            >
              {pendingPushAnnouncementId === announcement.announcementId ? "Sending push..." : "Send push"}
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="stack-lg">
      <div className="tab-nav">
        <button className={activeTab === "compose" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("compose")} type="button">Compose</button>
        <button className={activeTab === "announcements" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("announcements")} type="button">Announcements</button>
      </div>

      <section className="panel panel-accent" style={{ display: activeTab !== "compose" ? "none" : undefined }}>
        <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <div className="form-grid-full stack-sm">
            <span className="field-label">{isEditingAnnouncement ? "Edit" : title}</span>
            <h3 className="section-title">
              {isEditingAnnouncement ? "Update announcement" : "Publish an in-app popup"}
            </h3>
            <p className="muted-text">
              {isEditingAnnouncement
                ? "Update the announcement, archive it, or send push from the card after publishing."
                : "This creates the source announcement. Send push from the announcement card after publishing."}
            </p>
          </div>

          {snapshot.scope === "CLUB" ? (
            <label className="field-stack">
              <span className="field-label">Club</span>
              <select
                disabled={isFormDisabled || isEditingAnnouncement}
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
              disabled={isFormDisabled}
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
              disabled={isFormDisabled}
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
              disabled={isFormDisabled}
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
              disabled={isFormDisabled}
              onChange={(event) => setPayload((current) => ({ ...current, title: event.target.value }))}
              placeholder="Uusi appropäivän ohje"
              value={payload.title}
            />
          </label>

          <label className="field-stack form-grid-full">
            <span className="field-label">Message</span>
            <textarea
              disabled={isFormDisabled}
              onChange={(event) => setPayload((current) => ({ ...current, body: event.target.value }))}
              placeholder="Kirjoita lyhyt, selkeä viesti opiskelijoille."
              rows={5}
              value={payload.body}
            />
          </label>

          <label className="field-stack">
            <span className="field-label">Starts at</span>
            <input
              disabled={isFormDisabled}
              onChange={(event) => setPayload((current) => ({ ...current, startsAt: event.target.value }))}
              type="datetime-local"
              value={payload.startsAt}
            />
          </label>

          <label className="field-stack">
            <span className="field-label">Ends at</span>
            <input
              disabled={isFormDisabled}
              onChange={(event) => setPayload((current) => ({ ...current, endsAt: event.target.value }))}
              type="datetime-local"
              value={payload.endsAt}
            />
          </label>

          <label className="field-stack">
            <span className="field-label">CTA label</span>
            <input
              disabled={isFormDisabled}
              onChange={(event) => setPayload((current) => ({ ...current, ctaLabel: event.target.value }))}
              placeholder="Avaa tapahtuma"
              value={payload.ctaLabel}
            />
          </label>

          <label className="field-stack">
            <span className="field-label">CTA URL</span>
            <input
              disabled={isFormDisabled}
              onChange={(event) => setPayload((current) => ({ ...current, ctaUrl: event.target.value }))}
              placeholder="https://..."
              value={payload.ctaUrl}
            />
          </label>

          <div className="field-stack form-grid-full">
            <span className="field-label">Image</span>
            <label className="upload-dropzone">
              <input
                accept="image/jpeg,image/png,image/webp"
                disabled={isFormDisabled}
                onChange={(event) => void handleImageFileChange(event)}
                type="file"
              />
              <span>{isImageUploading ? "Uploading image..." : "Upload announcement image"}</span>
            </label>
            {payload.imageUrl.trim().length > 0 ? (
              <div
                aria-label="Announcement image preview"
                className="announcement-image-preview"
                style={{ backgroundImage: `url(${payload.imageUrl})` }}
              />
            ) : null}
            <label className="field-stack">
              <span className="field-label">Image URL</span>
              <input
                disabled={isFormDisabled}
                onChange={(event) => setPayload((current) => ({ ...current, imageUrl: event.target.value }))}
                placeholder="https://..."
                value={payload.imageUrl}
              />
            </label>
          </div>

          <div className="form-grid-full stack-sm">
            {renderState(actionState)}
            <div className="button-row">
              <button className="primary-action" disabled={isFormDisabled} type="submit">
                {isImageUploading
                  ? "Uploading image..."
                  : isPending
                    ? isEditingAnnouncement
                      ? "Updating..."
                      : "Saving..."
                    : isEditingAnnouncement
                      ? "Update announcement"
                      : "Save announcement"}
              </button>
              <button className="secondary-action" disabled={isFormDisabled} onClick={resetForm} type="button">
                {isEditingAnnouncement ? "Cancel edit" : "Reset form"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="stack-md" style={{ display: activeTab !== "announcements" ? "none" : undefined }}>
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
