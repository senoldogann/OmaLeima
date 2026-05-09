"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  submitAnnouncementArchiveRequestAsync,
  submitAnnouncementCreateRequestAsync,
  submitAnnouncementDeleteRequestAsync,
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
import type { DashboardLocale } from "@/features/dashboard/i18n";
import { successNoticeDurationMs, useTransientSuccessKey } from "@/features/shared/use-transient-success-key";
import { createClient } from "@/lib/supabase/client";

type AnnouncementsPanelProps = {
  locale: DashboardLocale;
  snapshot: AnnouncementSnapshot;
};

type AnnouncementAudienceOption =
  | "ALL"
  | "BUSINESSES"
  | "CLUBS"
  | "STUDENTS";

type AnnouncementCopy = {
  actionsHintCreate: string;
  actionsHintEdit: string;
  announcementsTab: string;
  archive: string;
  archiving: string;
  audience: string;
  audienceLabels: Record<AnnouncementAudienceOption, string>;
  cancelEdit: string;
  club: string;
  composeTab: string;
  ctaLabel: string;
  ctaUrl: string;
  delete: string;
  deleteConfirm: string;
  deleting: string;
  draftStatus: string;
  edit: string;
  emptyAnnouncements: string;
  endsAt: string;
  endsAtEmpty: string;
  image: string;
  imagePreview: string;
  imageUploaded: string;
  imageUploadError: string;
  imageUrl: string;
  latestAnnouncements: string;
  message: string;
  noEndDate: string;
  pendingRowsSuffix: string;
  placeholderBody: string;
  placeholderCtaLabel: string;
  placeholderImageUrl: string;
  placeholderTitle: string;
  platformAnnouncement: string;
  platformSender: string;
  priority: string;
  publishedStatus: string;
  pushAlreadySent: string;
  pushPartiallySent: string;
  pushReady: string;
  pushSent: string;
  pushUnavailableEnded: string;
  pushUnavailableNotPublished: string;
  pushUnavailableStartsLater: string;
  pushWithFailures: string;
  resetForm: string;
  saveAnnouncement: string;
  saveStatusCreate: string;
  saveStatusUpdate: string;
  saving: string;
  scopeTitleClub: string;
  scopeTitlePlatform: string;
  sendPush: string;
  sendingPush: string;
  sourceAnnouncementTitleCreate: string;
  sourceAnnouncementTitleEdit: string;
  startsAt: string;
  status: string;
  tableActions: string;
  tableAudience: string;
  tablePush: string;
  tableTitle: string;
  title: string;
  updateAnnouncement: string;
  updating: string;
  uploadAnnouncementImage: string;
  uploadImage: string;
  uploadingImage: string;
};

type AnnouncementPushAvailability = {
  canSendPush: boolean;
  reason: string;
};

const copyByLocale: Record<DashboardLocale, AnnouncementCopy> = {
  en: {
    actionsHintCreate: "This creates the source announcement. Send push from the announcement card after publishing.",
    actionsHintEdit: "Update the announcement, archive it, or send push from the card after publishing.",
    announcementsTab: "Announcements",
    archive: "Archive",
    archiving: "Archiving...",
    audience: "Audience",
    audienceLabels: {
      ALL: "All",
      BUSINESSES: "Businesses",
      CLUBS: "Clubs",
      STUDENTS: "Students",
    },
    cancelEdit: "Cancel edit",
    club: "Club",
    composeTab: "Compose",
    ctaLabel: "CTA label",
    ctaUrl: "CTA URL",
    delete: "Delete",
    deleteConfirm: "Delete this announcement permanently? If it has an OmaLeima uploaded image, the image will be deleted too.",
    deleting: "Deleting...",
    draftStatus: "Draft",
    edit: "Edit",
    emptyAnnouncements: "No announcements are visible for this scope yet.",
    endsAt: "Ends at",
    endsAtEmpty: "No end date",
    image: "Image",
    imagePreview: "Announcement image preview",
    imageUploaded: "Announcement image uploaded successfully.",
    imageUploadError: "Unknown announcement image upload error.",
    imageUrl: "Image URL",
    latestAnnouncements: "Latest announcements",
    message: "Message",
    noEndDate: "No end date",
    pendingRowsSuffix: "rows",
    placeholderBody: "Write a short, clear message for your audience.",
    placeholderCtaLabel: "Open event",
    placeholderImageUrl: "https://...",
    placeholderTitle: "New event-day update",
    platformAnnouncement: "Platform announcement",
    platformSender: "OmaLeima Support",
    priority: "Priority",
    publishedStatus: "Published",
    pushAlreadySent: "Push was sent before. You can send it again.",
    pushPartiallySent: "Push was only partially delivered. You can send it again.",
    pushReady: "Push is ready to send.",
    pushSent: "Push sent",
    pushUnavailableEnded: "Push window has already ended.",
    pushUnavailableNotPublished: "Only published announcements can send push.",
    pushUnavailableStartsLater: "Push becomes available after the start time.",
    pushWithFailures: "Previous push delivery failed. Retry is allowed.",
    resetForm: "Reset form",
    saveAnnouncement: "Save announcement",
    saveStatusCreate: "Save announcement",
    saveStatusUpdate: "Update announcement",
    saving: "Saving...",
    scopeTitleClub: "Club announcement",
    scopeTitlePlatform: "Platform announcement",
    sendPush: "Send push",
    sendingPush: "Sending push...",
    sourceAnnouncementTitleCreate: "Publish an in-app popup",
    sourceAnnouncementTitleEdit: "Update announcement",
    startsAt: "Starts at",
    status: "Status",
    tableActions: "Actions",
    tableAudience: "Audience",
    tablePush: "Push",
    tableTitle: "Title",
    title: "Title",
    updateAnnouncement: "Update announcement",
    updating: "Updating...",
    uploadAnnouncementImage: "Upload announcement image",
    uploadImage: "Upload image",
    uploadingImage: "Uploading image...",
  },
  fi: {
    actionsHintCreate: "Luo tiedote ensin luonnoksena. Push-ilmoituksen voi lähettää kortilta julkaisun jälkeen.",
    actionsHintEdit: "Päivitä tiedote, arkistoi se tai lähetä push-ilmoitus kortilta.",
    announcementsTab: "Tiedotteet",
    archive: "Arkistoi",
    archiving: "Arkistoidaan...",
    audience: "Kohderyhmä",
    audienceLabels: {
      ALL: "Kaikki",
      BUSINESSES: "Yritykset",
      CLUBS: "Järjestäjät",
      STUDENTS: "Opiskelijat",
    },
    cancelEdit: "Peruuta",
    club: "Klubi",
    composeTab: "Kirjoita uusi",
    ctaLabel: "Painikkeen teksti",
    ctaUrl: "Painikkeen osoite",
    delete: "Poista",
    deleteConfirm: "Poistetaanko tiedote pysyvästi? Jos siinä on OmaLeimaan ladattu kuva, myös kuva poistetaan.",
    deleting: "Poistetaan...",
    draftStatus: "Luonnos",
    edit: "Muokkaa",
    emptyAnnouncements: "Tässä näkymässä ei ole vielä tiedotteita.",
    endsAt: "Loppuu",
    endsAtEmpty: "Ei loppuaikaa",
    image: "Kuva",
    imagePreview: "Kuvan esikatselu",
    imageUploaded: "Kuva ladattiin onnistuneesti.",
    imageUploadError: "Kuvan lataus epäonnistui.",
    imageUrl: "Kuvan URL",
    latestAnnouncements: "Viimeisimmät tiedotteet",
    message: "Viesti",
    noEndDate: "Ei loppuaikaa",
    pendingRowsSuffix: "riviä",
    placeholderBody: "Kirjoita lyhyt ja selkeä viesti kohderyhmälle.",
    placeholderCtaLabel: "Avaa approt",
    placeholderImageUrl: "https://...",
    placeholderTitle: "Tärkeetä asiaa illasta",
    platformAnnouncement: "Koko alustan tiedote",
    platformSender: "OmaLeima-tiimi",
    priority: "Tärkeysaste",
    publishedStatus: "Livenä",
    pushAlreadySent: "Push on lähetetty aiemmin. Voit lähettää sen uudelleen.",
    pushPartiallySent: "Osa vastaanottajista jäi ilman pushia. Voit lähettää sen uudelleen.",
    pushReady: "Push on valmis lähetettäväksi.",
    pushSent: "Push lähetetty",
    pushUnavailableEnded: "Push-ikkuna on jo päättynyt.",
    pushUnavailableNotPublished: "Tiedote pitää julkaista ennen push-lähetystä.",
    pushUnavailableStartsLater: "Push voidaan lähettää vasta aloitusajan jälkeen.",
    pushWithFailures: "Edellinen push-lähetys epäonnistui. Uudelleenlähetys on sallittu.",
    resetForm: "Tyhjennä",
    saveAnnouncement: "Tallenna",
    saveStatusCreate: "Tallenna",
    saveStatusUpdate: "Päivitä",
    saving: "Tallennetaan...",
    scopeTitleClub: "Klubin tiedote",
    scopeTitlePlatform: "Alustan tiedote",
    sendPush: "Lähetä push",
    sendingPush: "Lähetetään push-ilmoitusta...",
    sourceAnnouncementTitleCreate: "Luo uusi popup",
    sourceAnnouncementTitleEdit: "Päivitä popup",
    startsAt: "Alkaa",
    status: "Tila",
    tableActions: "Toiminnot",
    tableAudience: "Kohderyhmä",
    tablePush: "Push",
    tableTitle: "Otsikko",
    title: "Otsikko",
    updateAnnouncement: "Päivitä",
    updating: "Päivitetään...",
    uploadAnnouncementImage: "Lataa kuva",
    uploadImage: "Lataa kuva",
    uploadingImage: "Ladataan...",
  },
};

const toLocalDateTimeInput = (value: Date): string => {
  const timezoneOffsetMs = value.getTimezoneOffset() * 60_000;
  const localDate = new Date(value.getTime() - timezoneOffsetMs);

  return localDate.toISOString().slice(0, 16);
};

const announcementClockRefreshMs = 30_000;

const createInitialPayload = (snapshot: AnnouncementSnapshot): AnnouncementCreatePayload => {
  const startsAt = toLocalDateTimeInput(new Date());

  return {
    audience: snapshot.scope === "CLUB" ? "STUDENTS" : "ALL",
    body: "",
    clubId: snapshot.scope === "CLUB" ? snapshot.clubOptions[0]?.clubId ?? "" : "",
    ctaLabel: "",
    ctaUrl: "",
    endsAt: "",
    eventId: "",
    imageStagingPath: "",
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
  eventId: announcement.eventId ?? "",
  imageStagingPath: announcement.imageStagingPath,
  imageUrl: announcement.imageUrl ?? "",
  priority: String(announcement.priority),
  startsAt: toLocalDateTimeInput(new Date(announcement.startsAt)),
  status: announcement.status === "ARCHIVED" ? "DRAFT" : announcement.status,
  title: announcement.title,
});

const isEventScopedPayload = (payload: AnnouncementCreatePayload): boolean =>
  payload.eventId.trim().length > 0;

const createSubmitPayload = (payload: AnnouncementCreatePayload): AnnouncementCreatePayload => {
  if (!isEventScopedPayload(payload)) {
    return payload;
  }

  return {
    ...payload,
    audience: "STUDENTS",
  };
};

const formatDate = (locale: DashboardLocale, value: string): string =>
  new Intl.DateTimeFormat(locale === "fi" ? "fi-FI" : "en-GB", {
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

const readPushAvailability = (
  announcement: AnnouncementRecord,
  copy: AnnouncementCopy,
  now: number
): AnnouncementPushAvailability => {
  if (announcement.status !== "PUBLISHED") {
    return {
      canSendPush: false,
      reason: copy.pushUnavailableNotPublished,
    };
  }

  const startsAtMs = new Date(announcement.startsAt).getTime();

  if (now < startsAtMs) {
    return {
      canSendPush: false,
      reason: copy.pushUnavailableStartsLater,
    };
  }

  if (announcement.endsAt !== null && now >= new Date(announcement.endsAt).getTime()) {
    return {
      canSendPush: false,
      reason: copy.pushUnavailableEnded,
    };
  }

  return {
    canSendPush: true,
    reason:
      announcement.pushDeliveryStatus === "PARTIAL"
        ? copy.pushPartiallySent
        : announcement.pushDeliveryStatus === "FAILED"
        ? copy.pushWithFailures
        : copy.pushReady,
  };
};

const getAnnouncementSenderLabel = (
  announcement: AnnouncementRecord,
  copy: AnnouncementCopy
): string => announcement.clubName ?? copy.platformSender;

export const AnnouncementsPanel = ({ locale, snapshot }: AnnouncementsPanelProps) => {
  const router = useRouter();
  const copy = copyByLocale[locale];
  const [payload, setPayload] = useState<AnnouncementCreatePayload>(createInitialPayload(snapshot));
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [isImageUploading, setIsImageUploading] = useState<boolean>(false);
  const [pendingArchiveAnnouncementId, setPendingArchiveAnnouncementId] = useState<string | null>(null);
  const [pendingDeleteAnnouncementId, setPendingDeleteAnnouncementId] = useState<string | null>(null);
  const [pendingPushAnnouncementId, setPendingPushAnnouncementId] = useState<string | null>(null);
  const [actionState, setActionState] = useState<AnnouncementActionState>({
    code: null,
    message: null,
    tone: "idle",
  });

  useTransientSuccessKey(
    actionState.tone === "success" ? actionState.message : null,
    () => setActionState({ code: null, message: null, tone: "idle" }),
    successNoticeDurationMs
  );
  const [renderedNow, setRenderedNow] = useState<number>(() => Date.now());
  const canCreate = snapshot.scope === "ADMIN" || snapshot.clubOptions.length > 0;
  const scopeTitle = snapshot.scope === "ADMIN" ? copy.scopeTitlePlatform : copy.scopeTitleClub;
  const hasEventScope = isEventScopedPayload(payload);
  const audienceOptions = useMemo<AnnouncementAudienceOption[]>(
    () =>
      snapshot.scope === "ADMIN"
        ? ["ALL", "STUDENTS", "BUSINESSES", "CLUBS"]
        : ["ALL", "STUDENTS", "CLUBS"],
    [snapshot.scope]
  );
  const renderedAudienceOptions: AnnouncementAudienceOption[] = hasEventScope ? ["STUDENTS"] : audienceOptions;
  const isEditingAnnouncement = editingAnnouncementId !== null;
  const isFormDisabled =
    !canCreate ||
    isPending ||
    isImageUploading ||
    pendingArchiveAnnouncementId !== null ||
    pendingDeleteAnnouncementId !== null ||
    pendingPushAnnouncementId !== null;
  const [activeTab, setActiveTab] = useState<"compose" | "announcements">("compose");

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRenderedNow(Date.now());
    }, announcementClockRefreshMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const resetForm = (): void => {
    setEditingAnnouncementId(null);
    setPayload(createInitialPayload(snapshot));
  };

  const handleEditPress = (announcement: AnnouncementRecord): void => {
    setEditingAnnouncementId(announcement.announcementId);
    setPayload(createPayloadFromAnnouncement(announcement));
    setActiveTab("compose");
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
        imageStagingPath: uploadedImage.stagingPath,
        imageUrl: uploadedImage.previewUrl,
      }));
      setActionState({
        code: "IMAGE_STAGED",
        message: copy.imageUploaded,
        tone: "success",
      });
    } catch (error) {
      setActionState({
        code: "IMAGE_UPLOAD_ERROR",
        message: error instanceof Error ? error.message : copy.imageUploadError,
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
      const submitPayload = createSubmitPayload(payload);
      const response =
        editingAnnouncementId === null
          ? await submitAnnouncementCreateRequestAsync(submitPayload)
          : await submitAnnouncementUpdateRequestAsync(editingAnnouncementId, submitPayload);
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

  const handleDeletePress = async (announcement: AnnouncementRecord): Promise<void> => {
    if (!window.confirm(copy.deleteConfirm)) {
      return;
    }

    setPendingDeleteAnnouncementId(announcement.announcementId);
    setActionState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const response = await submitAnnouncementDeleteRequestAsync(
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
        message: error instanceof Error ? error.message : "Unknown announcement delete request error.",
        tone: "error",
      });
    } finally {
      setPendingDeleteAnnouncementId(null);
    }
  };

  const handleSendPushPress = async (announcement: AnnouncementRecord): Promise<void> => {
    const pushAvailability = readPushAvailability(announcement, copy, Date.now());

    if (!pushAvailability.canSendPush) {
      setActionState({
        code: "ANNOUNCEMENT_PUSH_NOT_AVAILABLE",
        message: pushAvailability.reason,
        tone: "error",
      });
      return;
    }

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
          ? ` ${copy.pushSent}: ${response.notificationsSent ?? 0}, failed ${response.notificationsFailed ?? 0}.`
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

  const renderAnnouncementRow = (announcement: AnnouncementRecord) => {
    const pushAvailability = readPushAvailability(announcement, copy, renderedNow);
    const canArchive = announcement.status !== "ARCHIVED";
    const canSendPush = pushAvailability.canSendPush;

    return (
      <tr key={announcement.announcementId}>
        <td>
          <span>{announcement.title}</span>
          <span className="record-meta">{getAnnouncementSenderLabel(announcement, copy)}</span>
        </td>
        <td><span className={`status-pill status-${announcement.status.toLowerCase()}`}>{announcement.status}</span></td>
        <td className="record-meta">{copy.audienceLabels[announcement.audience]}</td>
        <td className="record-meta">{formatDate(locale, announcement.startsAt)}</td>
        <td className="record-meta">
          {announcement.endsAt === null ? copy.endsAtEmpty : formatDate(locale, announcement.endsAt)}
        </td>
        <td className="record-meta">{announcement.priority}</td>
        <td className="record-meta">
          {announcement.pushDeliveryStatus === "SENT"
            ? copy.pushAlreadySent
            : announcement.pushDeliveryStatus === "PARTIAL"
              ? copy.pushPartiallySent
              : announcement.pushDeliveryStatus === "FAILED"
                ? copy.pushWithFailures
                : pushAvailability.canSendPush
                  ? copy.pushReady
                  : pushAvailability.reason}
        </td>
        <td>
          <div className="admin-users-actions">
            <button
              className="button button-secondary"
              disabled={isFormDisabled}
              onClick={() => handleEditPress(announcement)}
              type="button"
            >
              {copy.edit}
            </button>
            {canArchive ? (
              <button
                className="button button-secondary"
                disabled={isFormDisabled}
                onClick={() => void handleArchivePress(announcement)}
                type="button"
              >
                {pendingArchiveAnnouncementId === announcement.announcementId ? copy.archiving : copy.archive}
              </button>
            ) : null}
            <button
              className="button button-danger"
              disabled={isFormDisabled}
              onClick={() => void handleDeletePress(announcement)}
              type="button"
            >
              {pendingDeleteAnnouncementId === announcement.announcementId ? copy.deleting : copy.delete}
            </button>
            <button
              className="button button-secondary"
              disabled={!canSendPush || pendingPushAnnouncementId !== null || pendingArchiveAnnouncementId !== null || pendingDeleteAnnouncementId !== null}
              onClick={() => void handleSendPushPress(announcement)}
              type="button"
            >
              {pendingPushAnnouncementId === announcement.announcementId ? copy.sendingPush : copy.sendPush}
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="stack-lg">
      <div className="tab-nav">
        <button
          className={activeTab === "compose" ? "tab-btn tab-btn-active" : "tab-btn"}
          onClick={() => setActiveTab("compose")}
          type="button"
        >
          {copy.composeTab}
        </button>
        <button
          className={activeTab === "announcements" ? "tab-btn tab-btn-active" : "tab-btn"}
          onClick={() => setActiveTab("announcements")}
          type="button"
        >
          {copy.announcementsTab}
        </button>
      </div>

      <section className="panel panel-accent" style={{ display: activeTab !== "compose" ? "none" : undefined }}>
        <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <div className="form-grid-full stack-sm">
            <span className="field-label">{scopeTitle}</span>
            <h3 className="section-title">
              {isEditingAnnouncement ? copy.sourceAnnouncementTitleEdit : copy.sourceAnnouncementTitleCreate}
            </h3>
            <p className="muted-text">{isEditingAnnouncement ? copy.actionsHintEdit : copy.actionsHintCreate}</p>
          </div>

          {snapshot.scope === "CLUB" ? (
            <label className="field-stack">
              <span className="field-label">{copy.club}</span>
              <select
                disabled={isFormDisabled || isEditingAnnouncement}
                onChange={(event) => setPayload((current) => ({ ...current, clubId: event.target.value }))}
                value={payload.clubId}
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
            <span className="field-label">{copy.audience}</span>
            <select
              disabled={isFormDisabled || hasEventScope}
              onChange={(event) =>
                setPayload((current) => ({
                  ...current,
                  audience: event.target.value as AnnouncementCreatePayload["audience"],
                }))
              }
              value={hasEventScope ? "STUDENTS" : payload.audience}
            >
              {renderedAudienceOptions.map((audience) => (
                <option key={audience} value={audience}>
                  {copy.audienceLabels[audience]}
                </option>
              ))}
            </select>
          </label>

          <label className="field-stack">
            <span className="field-label">{copy.status}</span>
            <select
              disabled={isFormDisabled}
              onChange={(event) =>
                setPayload((current) => ({
                  ...current,
                  status: event.target.value as AnnouncementCreatePayload["status"],
                }))
              }
              value={payload.status}
            >
              <option value="PUBLISHED">{copy.publishedStatus}</option>
              <option value="DRAFT">{copy.draftStatus}</option>
            </select>
          </label>

          <label className="field-stack">
            <span className="field-label">{copy.priority}</span>
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
            <span className="field-label">{copy.title}</span>
            <input
              disabled={isFormDisabled}
              onChange={(event) => setPayload((current) => ({ ...current, title: event.target.value }))}
              placeholder={copy.placeholderTitle}
              value={payload.title}
            />
          </label>

          <label className="field-stack form-grid-full">
            <span className="field-label">{copy.message}</span>
            <textarea
              disabled={isFormDisabled}
              onChange={(event) => setPayload((current) => ({ ...current, body: event.target.value }))}
              placeholder={copy.placeholderBody}
              rows={5}
              value={payload.body}
            />
          </label>

          <label className="field-stack">
            <span className="field-label">{copy.startsAt}</span>
            <input
              disabled={isFormDisabled}
              onChange={(event) => setPayload((current) => ({ ...current, startsAt: event.target.value }))}
              type="datetime-local"
              value={payload.startsAt}
            />
          </label>

          <label className="field-stack">
            <span className="field-label">{copy.endsAt}</span>
            <input
              disabled={isFormDisabled}
              onChange={(event) => setPayload((current) => ({ ...current, endsAt: event.target.value }))}
              type="datetime-local"
              value={payload.endsAt}
            />
          </label>

          <label className="field-stack">
            <span className="field-label">{copy.ctaLabel}</span>
            <input
              disabled={isFormDisabled}
              onChange={(event) => setPayload((current) => ({ ...current, ctaLabel: event.target.value }))}
              placeholder={copy.placeholderCtaLabel}
              value={payload.ctaLabel}
            />
          </label>

          <label className="field-stack">
            <span className="field-label">{copy.ctaUrl}</span>
            <input
              disabled={isFormDisabled}
              onChange={(event) => setPayload((current) => ({ ...current, ctaUrl: event.target.value }))}
              placeholder={copy.placeholderImageUrl}
              value={payload.ctaUrl}
            />
          </label>

          <div className="field-stack form-grid-full">
            <span className="field-label">{copy.image}</span>
            <label className="upload-dropzone">
              <input
                accept="image/jpeg,image/png,image/webp"
                disabled={isFormDisabled}
                onChange={(event) => void handleImageFileChange(event)}
                type="file"
              />
              <span>{isImageUploading ? copy.uploadingImage : copy.uploadAnnouncementImage}</span>
            </label>
            {payload.imageUrl.trim().length > 0 ? (
              <div
                aria-label={copy.imagePreview}
                className="announcement-image-preview"
                style={{ backgroundImage: `url(${payload.imageUrl})` }}
              />
            ) : null}
            <label className="field-stack">
              <span className="field-label">{copy.imageUrl}</span>
              <input
                disabled={isFormDisabled}
                onChange={(event) => setPayload((current) => ({ ...current, imageUrl: event.target.value }))}
                placeholder={copy.placeholderImageUrl}
                value={payload.imageUrl}
              />
            </label>
          </div>

          <div className="form-grid-full stack-sm">
            {renderState(actionState)}
            <div className="button-row">
              <button className="primary-action" disabled={isFormDisabled} type="submit">
                {isImageUploading
                  ? copy.uploadingImage
                  : isPending
                    ? isEditingAnnouncement
                      ? copy.updating
                      : copy.saving
                    : isEditingAnnouncement
                      ? copy.saveStatusUpdate
                      : copy.saveStatusCreate}
              </button>
              <button className="secondary-action" disabled={isFormDisabled} onClick={resetForm} type="button">
                {isEditingAnnouncement ? copy.cancelEdit : copy.resetForm}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="stack-md" style={{ display: activeTab !== "announcements" ? "none" : undefined }}>
        <div className="split-row">
          <h3 className="section-title">{copy.latestAnnouncements}</h3>
          <span className="field-label">{`${snapshot.announcements.length} ${copy.pendingRowsSuffix}`}</span>
        </div>
        {renderState(actionState)}
        {snapshot.announcements.length === 0 ? (
          <article className="panel">
            <p className="muted-text">{copy.emptyAnnouncements}</p>
          </article>
        ) : (
          <div className="panel-table-wrap">
            <table className="panel-table">
              <thead>
                <tr>
                  <th>{copy.tableTitle}</th>
                  <th>{copy.status}</th>
                  <th>{copy.tableAudience}</th>
                  <th>{copy.startsAt}</th>
                  <th>{copy.endsAt}</th>
                  <th>{copy.priority}</th>
                  <th>{copy.tablePush}</th>
                  <th>{copy.tableActions}</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.announcements.map(renderAnnouncementRow)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
