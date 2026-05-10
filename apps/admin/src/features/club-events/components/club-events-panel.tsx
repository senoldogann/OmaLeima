"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
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
import { uploadClubEventCoverImageAsync } from "@/features/club-events/media-upload";
import type { DashboardLocale } from "@/features/dashboard/i18n";
import { FINLAND_COUNTRY } from "@/features/location/finland";
import type {
  ClubEventActionState,
  ClubEventCreationPayload,
  ClubEventRecord,
  ClubEventUpdatePayload,
  ClubEventsSnapshot,
  ClubMembershipSummary,
} from "@/features/club-events/types";
import { successNoticeDurationMs, useTransientSuccessKey } from "@/features/shared/use-transient-success-key";

const formatEventStatus = (status: string, locale: DashboardLocale): string => {
  if (locale !== "fi") return status;
  const map: Record<string, string> = {
    ACTIVE: "Aktiivinen",
    PUBLISHED: "Julkaistu",
    DRAFT: "Luonnos",
    CANCELLED: "Peruutettu",
    ENDED: "Päättynyt",
  };
  return map[status] ?? status;
};

type ClubEventsPanelProps = {
  locale: DashboardLocale;
  snapshot: ClubEventsSnapshot;
};

const copyByLocale = {
  en: {
    activeMemberships: "Active memberships",
    cancel: "Cancel",
    cancelConfirm:
      "Cancel this event? It will be hidden from active views, but registrations, leimas, rewards, and audit history will stay intact.",
    cancelling: "Cancelling...",
    canCreateEvents: "Can create events",
    city: "City",
    club: "Club",
    clubAccess: "Club access",
    country: "Country",
    coverImage: "Cover image",
    coverImageUrl: "Cover image URL",
    createDraftEvent: "Create draft event",
    createEvent: "Create event",
    createEventTab: "Create Event",
    creating: "Creating...",
    creatableClubsBody: "Clubs where this account can create new events right now.",
    creatableClubsLabel: "Creatable clubs",
    description: "Description",
    end: "End",
    imagePreview: "Event cover preview",
    joinDeadline: "Join deadline",
    manageEvent: "Manage event",
    manageEventsTab: "Manage Events",
    managedClubsBody: "Active clubs currently visible in this organizer session.",
    managedClubsLabel: "Managed clubs",
    maxParticipants: "Max participants",
    membershipsBody: "Choose the correct club before creating an event when this account manages more than one community.",
    membershipsTab: "Memberships",
    minimumStampsRequired: "Minimum stamps required",
    name: "Name",
    newEventBody: "New events start as drafts. Reward tiers and venues can be added after the draft exists.",
    newEventTitle: "New club event",
    noMemberships: "No active club memberships are visible right now.",
    noRights: "This signed-in club account does not currently have organizer or owner rights for event creation.",
    readOnlyAccess: "Read-only access",
    recentEvents: "Recent events",
    recentEventsBodyPrefix: "Showing the latest",
    recentEventsBodySuffix: "events readable through this club session.",
    recentEventsEmpty: "No club events are visible yet. Create the first draft to start the workflow.",
    recentEventsTitle: "Latest visible club events",
    registered: "registered",
    saveEvent: "Save event",
    saving: "Saving...",
    selectedEvent: "Selected event",
    start: "Start",
    status: "Status",
    ticketUrl: "Ticket URL",
    ticketUrlHint: "Optional link to Kide, another ticket platform, or your own ticket page.",
    updateEventBody: "Keep published details current without deleting registrations, stamps, or reward history.",
    updateEventTitle: "Update the selected event",
    uploadCover: "Upload cover from computer",
    uploadingCover: "Uploading cover...",
    visibility: "Visibility",
    visibleEventsBody: "Draft, published, active, completed, or cancelled events readable through club RLS.",
    visibleEventsLabel: "Visible events",
  },
  fi: {
    activeMemberships: "Omat jäsenyydet",
    cancel: "Peru tapahtuma",
    cancelConfirm:
      "Perutaanko tämä tapahtuma? Se piilotetaan aktiivisista näkymistä, mutta ilmoittautumiset, leimat, palkinnot ja audit-historia säilyvät.",
    cancelling: "Peruutetaan...",
    canCreateEvents: "Voi luoda tapahtumia",
    city: "Kaupunki",
    club: "Klubi",
    clubAccess: "Klubioikeudet",
    country: "Maa",
    coverImage: "Kansikuva",
    coverImageUrl: "Kansikuvan URL",
    createDraftEvent: "Tallenna luonnoksena",
    createEvent: "Luo tapahtuma",
    createEventTab: "Luo uusi",
    creating: "Luodaan...",
    creatableClubsBody: "Klubit, joille tämä tili voi luoda uusia approja ja tapahtumia juuri nyt.",
    creatableClubsLabel: "Mihin luodaan?",
    description: "Kuvaus",
    end: "Päättyy",
    imagePreview: "Kansikuvan esikatselu",
    joinDeadline: "Ilmoittautuminen sulkeutuu",
    manageEvent: "Hallinnoi tapahtumaa",
    manageEventsTab: "Omat tapahtumat",
    managedClubsBody: "Aktiiviset klubit, joihin tällä tilillä on järjestäjäoikeus.",
    managedClubsLabel: "Omat klubit",
    maxParticipants: "Maksimiosallistujat",
    membershipsBody: "Jos tämä tili hallinnoi useampaa yhteisöä, valitse ensin oikea klubi.",
    membershipsTab: "Jäsenyydet",
    minimumStampsRequired: "Vaaditut leimat",
    name: "Nimi",
    newEventBody: "Uudet tapahtumat alkavat luonnoksina. Palkintotasot ja paikat voidaan lisätä luonnoksen jälkeen.",
    newEventTitle: "Uusi tapahtuma",
    noMemberships: "Aktiivisia klubijäsenyyksiä ei näy juuri nyt.",
    noRights: "Tällä klubitilillä ei ole tällä hetkellä järjestäjän tai omistajan oikeuksia tapahtuman luontiin.",
    readOnlyAccess: "Vain luku",
    recentEvents: "Viimeisimmät",
    recentEventsBodyPrefix: "Näytetään viimeisimmät",
    recentEventsBodySuffix: "tapahtumaa, jotka ovat tämän tilin oikeuksilla näkyvissä.",
    recentEventsEmpty: "Klubitapahtumia ei vielä näy. Luo ensimmäinen luonnos aloittaaksesi.",
    recentEventsTitle: "Viimeisimmät näkyvät tapahtumat",
    registered: "mukana",
    saveEvent: "Tallenna",
    saving: "Tallennetaan...",
    selectedEvent: "Valittu tapahtuma",
    start: "Alkaa",
    status: "Tila",
    ticketUrl: "Lippulinkki",
    ticketUrlHint: "Valinnainen linkki Kideen, toiseen lipunmyyntiin tai omaan lippusivuun.",
    updateEventBody: "Pidä julkaistut tiedot ajan tasalla poistamatta ilmoittautumisia, leimoja tai palkintohistoriaa.",
    updateEventTitle: "Päivitä tiedot",
    uploadCover: "Lataa kuva koneelta",
    uploadingCover: "Ladataan kuvaa...",
    visibility: "Näkyvyys",
    visibleEventsBody: "Luonnokset, julkaistut, aktiiviset, päättyneet ja perutut tapahtumat tässä näkymässä.",
    visibleEventsLabel: "Näkyvät tapahtumat",
  },
} as const satisfies Record<DashboardLocale, Record<string, string>>;

const createInitialPayload = (clubId: string, city: string | null): ClubEventCreationPayload => ({
  city: city ?? "",
  clubId,
  country: FINLAND_COUNTRY,
  coverImageStagingPath: "",
  coverImageUrl: "",
  description: "",
  endAt: "",
  joinDeadlineAt: "",
  maxParticipants: "",
  minimumStampsRequired: "0",
  name: "",
  rulesJson: JSON.stringify({ stampPolicy: { perBusinessLimit: 1 } }, null, 2),
  startAt: "",
  ticketUrl: "",
  visibility: "PUBLIC",
});

const findMembershipCity = (memberships: ClubMembershipSummary[], clubId: string): string | null =>
  memberships.find((membership) => membership.clubId === clubId)?.city ?? null;

const toLocalDateTimeInput = (value: string): string => {
  const date = new Date(value);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  const localDate = new Date(date.getTime() - timezoneOffsetMs);

  return localDate.toISOString().slice(0, 16);
};

const createUpdatePayload = (event: ClubEventRecord): ClubEventUpdatePayload => ({
  city: event.city,
  coverImageStagingPath: event.coverImageStagingPath,
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
  ticketUrl: event.ticketUrl ?? "",
  visibility: event.visibility,
});

const canEditEvent = (event: ClubEventRecord): boolean =>
  event.status === "ACTIVE" || event.status === "DRAFT" || event.status === "PUBLISHED";

const canEditEventName = (event: ClubEventRecord): boolean => event.status !== "ACTIVE";

const canCancelEvent = (event: ClubEventRecord): boolean =>
  event.status === "ACTIVE" || event.status === "DRAFT" || event.status === "PUBLISHED";

const renderActionState = (state: ClubEventActionState) => {
  if (state.message === null) {
    return null;
  }

  return <p className={state.tone === "success" ? "inline-success" : "inline-error"}>{state.message}</p>;
};

export const ClubEventsPanel = ({ locale, snapshot }: ClubEventsPanelProps) => {
  const router = useRouter();
  const copy = copyByLocale[locale];
  const creatableMemberships = useMemo(
    () => snapshot.memberships.filter((membership) => membership.canCreateEvents),
    [snapshot.memberships]
  );
  const manageableClubIds = useMemo(
    () => new Set(creatableMemberships.map((membership) => membership.clubId)),
    [creatableMemberships]
  );
  const canManageEvent = (event: ClubEventRecord): boolean => manageableClubIds.has(event.clubId);
  const [payload, setPayload] = useState<ClubEventCreationPayload>(
    createInitialPayload(creatableMemberships[0]?.clubId ?? "", creatableMemberships[0]?.city ?? null)
  );
  const [actionState, setActionState] = useState<ClubEventActionState>({
    code: null,
    message: null,
    tone: "idle",
  });
  const initialSelectedEvent =
    snapshot.recentEvents.find((event) => canManageEvent(event) && canEditEvent(event)) ??
    snapshot.recentEvents[0] ??
    null;
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialSelectedEvent?.eventId ?? ""
  );
  const selectedEvent = useMemo(
    () => snapshot.recentEvents.find((event) => event.eventId === selectedEventId) ?? null,
    [selectedEventId, snapshot.recentEvents]
  );
  const [updatePayload, setUpdatePayload] = useState<ClubEventUpdatePayload | null>(
    initialSelectedEvent === null || !canManageEvent(initialSelectedEvent) || !canEditEvent(initialSelectedEvent)
      ? null
      : createUpdatePayload(initialSelectedEvent)
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

  useTransientSuccessKey(
    actionState.tone === "success" ? actionState.message : null,
    () => setActionState({ code: null, message: null, tone: "idle" }),
    successNoticeDurationMs
  );
  useTransientSuccessKey(
    updateActionState.tone === "success" ? updateActionState.message : null,
    () => setUpdateActionState({ code: null, message: null, tone: "idle" }),
    successNoticeDurationMs
  );
  useTransientSuccessKey(
    cancelActionState.tone === "success" ? cancelActionState.message : null,
    () => setCancelActionState({ code: null, message: null, tone: "idle" }),
    successNoticeDurationMs
  );
  const [isPending, setIsPending] = useState<boolean>(false);
  const [isUpdatePending, setIsUpdatePending] = useState<boolean>(false);
  const [isCancelPending, setIsCancelPending] = useState<boolean>(false);
  const [isCoverUploading, setIsCoverUploading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"memberships" | "create-event" | "manage-events">("memberships");
  const [isEditFormOpen, setIsEditFormOpen] = useState<boolean>(false);

  const handleSelectEvent = (event: ClubEventRecord): void => {
    setSelectedEventId(event.eventId);
    setIsEditFormOpen(true);
    setUpdatePayload(canManageEvent(event) && canEditEvent(event) ? createUpdatePayload(event) : null);
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
        setPayload(createInitialPayload(payload.clubId, findMembershipCity(creatableMemberships, payload.clubId)));
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

  const handleCreateCoverFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const selectedFile = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (selectedFile === null) {
      return;
    }

    setIsCoverUploading(true);
    setActionState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const uploadedImage = await uploadClubEventCoverImageAsync({
        clubId: payload.clubId,
        file: selectedFile,
        supabase: createClient(),
      });

      setPayload((currentPayload) => ({
        ...currentPayload,
        coverImageStagingPath: uploadedImage.stagingPath,
        coverImageUrl: uploadedImage.previewUrl,
      }));
      setActionState({
        code: "IMAGE_STAGED",
        message: "Event cover image staged privately. Save the event to keep it as a draft preview.",
        tone: "success",
      });
    } catch (error) {
      setActionState({
        code: "IMAGE_UPLOAD_ERROR",
        message: error instanceof Error ? error.message : "Unknown event cover upload error.",
        tone: "error",
      });
    } finally {
      setIsCoverUploading(false);
    }
  };

  const handleUpdateCoverFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const selectedFile = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (selectedFile === null) {
      return;
    }

    if (selectedEvent === null || !canManageEvent(selectedEvent)) {
      setUpdateActionState({
        code: "CLUB_NOT_ALLOWED",
        message: "This account cannot manage the selected event.",
        tone: "error",
      });
      return;
    }

    setIsCoverUploading(true);
    setUpdateActionState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const uploadedImage = await uploadClubEventCoverImageAsync({
        clubId: selectedEvent.clubId,
        file: selectedFile,
        supabase: createClient(),
      });

      setUpdatePayload((currentPayload) =>
        currentPayload === null
          ? null
          : {
            ...currentPayload,
            coverImageStagingPath: uploadedImage.stagingPath,
            coverImageUrl: uploadedImage.previewUrl,
          }
      );
      setUpdateActionState({
        code: "IMAGE_STAGED",
        message: "Event cover image staged privately. Save as draft to keep it private or publish to make it public.",
        tone: "success",
      });
    } catch (error) {
      setUpdateActionState({
        code: "IMAGE_UPLOAD_ERROR",
        message: error instanceof Error ? error.message : "Unknown event cover upload error.",
        tone: "error",
      });
    } finally {
      setIsCoverUploading(false);
    }
  };

  const handleUpdateSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (updatePayload === null || selectedEvent === null || !canManageEvent(selectedEvent)) {
      setUpdateActionState({
        code: "CLUB_NOT_ALLOWED",
        message: "This account cannot manage the selected event.",
        tone: "error",
      });
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
    if (!canManageEvent(event)) {
      setCancelActionState({
        code: "CLUB_NOT_ALLOWED",
        message: "This account cannot manage the selected event.",
        tone: "error",
      });
      return;
    }

    if (!window.confirm(copy.cancelConfirm)) {
      return;
    }

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
            <span className="field-label">{copy.managedClubsLabel}</span>
            <strong className="metric-value">{snapshot.summary.managedClubCount}</strong>
            <p className="muted-text">{copy.managedClubsBody}</p>
          </div>
        </article>

        <article className="panel">
          <div className="stack-sm">
            <span className="field-label">{copy.creatableClubsLabel}</span>
            <strong className="metric-value">{snapshot.summary.creatableClubCount}</strong>
            <p className="muted-text">{copy.creatableClubsBody}</p>
          </div>
        </article>

        <article className="panel panel-warning">
          <div className="stack-sm">
            <span className="field-label">{copy.visibleEventsLabel}</span>
            <strong className="metric-value">{snapshot.summary.visibleEventCount}</strong>
            <p className="muted-text">{copy.visibleEventsBody}</p>
          </div>
        </article>
      </section>

      <div className="tab-nav">
        <button className={activeTab === "memberships" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("memberships")} type="button">{copy.membershipsTab}</button>
        <button className={activeTab === "create-event" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("create-event")} type="button">{copy.createEventTab}</button>
        <button className={activeTab === "manage-events" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("manage-events")} type="button">{copy.manageEventsTab}</button>
      </div>

      <section className="content-grid" style={{ display: activeTab === "manage-events" ? "none" : undefined }}>
        <div className="stack-md" style={activeTab === "memberships" ? { gridColumn: "1 / -1" } : { display: "none" }}>
          <div className="stack-sm">
            <div className="eyebrow">{copy.clubAccess}</div>
            <h3 className="section-title">{copy.activeMemberships}</h3>
            <p className="muted-text">{copy.membershipsBody}</p>
          </div>

          {snapshot.memberships.length === 0 ? (
            <article className="panel">
              <p className="muted-text">{copy.noMemberships}</p>
            </article>
          ) : (
            <div className="content-grid">
              {snapshot.memberships.map((membership) => (
                <article key={membership.clubId} className="panel review-card-compact">
                  <div className="stack-sm">
                    <p className="card-title">{membership.clubName}</p>
                    <p className="muted-text">
                      {[membership.city, formatClubMembershipRole(membership.membershipRole)]
                        .filter((value) => value !== null)
                        .join(" · ")}
                    </p>
                    <span className={membership.canCreateEvents ? "status-pill status-pill-success" : "status-pill"}>
                      {membership.canCreateEvents ? copy.canCreateEvents : copy.readOnlyAccess}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="stack-md" style={activeTab === "create-event" ? { gridColumn: "1 / -1" } : { display: "none" }}>
          <div className="stack-sm">
            <div className="eyebrow">{copy.createEvent}</div>
            <h3 className="section-title">{copy.newEventTitle}</h3>
            <p className="muted-text">{copy.newEventBody}</p>
          </div>

          {creatableMemberships.length === 0 ? (
            <article className="panel">
              <p className="muted-text">{copy.noRights}</p>
            </article>
          ) : (
            <article className="panel">
              <form className="stack-md" onSubmit={(event) => void handleSubmit(event)}>
                <label className="field">
                  <span className="field-label">{copy.club}</span>
                  <select
                    className="field-input"
                    disabled={isPending}
                    onChange={(event) => {
                      const nextClubId = event.target.value;
                      const nextCity = findMembershipCity(creatableMemberships, nextClubId);
                      setPayload((currentPayload) => ({
                        ...currentPayload,
                        city: nextCity ?? "",
                        clubId: nextClubId,
                      }));
                    }}
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
                    <span className="field-label">{copy.name}</span>
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
                    <span className="field-label">{copy.city}</span>
                    <input
                      className="field-input"
                      disabled
                      value={payload.city}
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">{copy.country}</span>
                    <input className="field-input" readOnly value={FINLAND_COUNTRY} />
                  </label>

                  <label className="field">
                    <span className="field-label">{copy.visibility}</span>
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
                  <span className="field-label">{copy.description}</span>
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
                    <span className="field-label">{copy.start}</span>
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
                    <span className="field-label">{copy.end}</span>
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
                    <span className="field-label">{copy.joinDeadline}</span>
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

                  <div className="field form-grid-full">
                    <span className="field-label">{copy.coverImage}</span>
                    <label className="upload-dropzone">
                      <input
                        accept="image/jpeg,image/png,image/webp"
                        disabled={isPending || isCoverUploading}
                        onChange={(event) => void handleCreateCoverFileChange(event)}
                        type="file"
                      />
                      <span>{isCoverUploading ? copy.uploadingCover : copy.uploadCover}</span>
                    </label>
                    {payload.coverImageUrl.trim().length > 0 ? (
                      <div
                        aria-label={copy.imagePreview}
                        className="announcement-image-preview"
                        style={{ backgroundImage: `url(${payload.coverImageUrl})` }}
                      />
                    ) : null}
                  </div>

                  <label className="field">
                    <span className="field-label">{copy.maxParticipants}</span>
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
                    <span className="field-label">{copy.minimumStampsRequired}</span>
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
                  locale={locale}
                  onChange={(value) =>
                    setPayload((currentPayload) => ({
                      ...currentPayload,
                      rulesJson: value,
                    }))
                  }
                  value={payload.rulesJson}
                />

                <button className="button button-primary" disabled={isPending || isCoverUploading} type="submit">
                  {isCoverUploading ? copy.uploadingCover : isPending ? copy.creating : copy.createDraftEvent}
                </button>
                {renderActionState(actionState)}
              </form>
            </article>
          )}
        </div>
      </section>

      <section className="panel" style={{ display: activeTab !== "manage-events" || !isEditFormOpen ? "none" : undefined }}>
        <div className="review-card-header">
          <div className="stack-sm">
            <button
              className="button button-ghost"
              onClick={() => setIsEditFormOpen(false)}
              style={{ alignSelf: "flex-start", marginBottom: 4 }}
              type="button"
            >
              {locale === "fi" ? "← Takaisin tapahtumiin" : "← Back to events"}
            </button>
            <div className="eyebrow">{copy.manageEvent}</div>
            <h3 className="section-title">{copy.updateEventTitle}</h3>
            <p className="muted-text">{copy.updateEventBody}</p>
          </div>
          {selectedEvent !== null ? (
            <span className={getClubEventStatusClassName(selectedEvent.status)}>{formatEventStatus(selectedEvent.status, locale)}</span>
          ) : null}
        </div>

        {selectedEvent === null ? (
          <p className="muted-text">Create or select an event before editing details.</p>
        ) : (
          <div className="stack-md">
            <div className="detail-grid">
              <label className="field">
                <span className="field-label">{copy.selectedEvent}</span>
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
                    <option disabled={!canManageEvent(event) || !canEditEvent(event)} key={event.eventId} value={event.eventId}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {updatePayload === null ? (
              <article className="panel panel-warning">
                <p className="muted-text">
                  {selectedEvent !== null && !canManageEvent(selectedEvent)
                    ? locale === "fi"
                      ? "Tapahtuma näkyy tässä jäsenyydessä, mutta tällä tilillä ei ole järjestäjäoikeutta sen muokkaamiseen."
                      : "This event is visible through your membership, but this account does not have organizer access to edit it."
                    : locale === "fi"
                      ? "Päättyneet ja perutut tapahtumat näkyvät täällä historiassa, mutta niitä ei voi enää muokata."
                      : "Completed and cancelled events stay visible here for history, but they can no longer be edited."}
                </p>
              </article>
            ) : (
              <form className="stack-md" onSubmit={(event) => void handleUpdateSubmit(event)}>
                <div className="detail-grid">
                  <label className="field">
                    <span className="field-label">{copy.status}</span>
                    <select
                      className="field-input"
                      disabled={isUpdatePending}
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
                    <span className="field-label">{copy.visibility}</span>
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
                    <span className="field-label">{copy.name}</span>
                    <input
                      className="field-input"
                      disabled={isUpdatePending || !canEditEventName(selectedEvent)}
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
                    {!canEditEventName(selectedEvent) ? (
                      <span className="field-help">
                        {locale === "fi"
                          ? "Käynnissä olevan tapahtuman nimeä ei voi enää muuttaa."
                          : "Active event names can no longer be changed."}
                      </span>
                    ) : null}
                  </label>

                  <label className="field">
                    <span className="field-label">{copy.city}</span>
                    <input
                      className="field-input"
                      disabled
                      value={updatePayload.city}
                    />
                  </label>
                </div>

            <label className="field">
              <span className="field-label">{copy.description}</span>
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
                <span className="field-label">{copy.start}</span>
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
                <span className="field-label">{copy.end}</span>
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
                <span className="field-label">{copy.joinDeadline}</span>
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

              <div className="field form-grid-full">
                <span className="field-label">{copy.coverImage}</span>
                <label className="upload-dropzone">
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    disabled={isUpdatePending || isCancelPending || isCoverUploading}
                    onChange={(event) => void handleUpdateCoverFileChange(event)}
                    type="file"
                  />
                  <span>{isCoverUploading ? copy.uploadingCover : copy.uploadCover}</span>
                </label>
                {updatePayload.coverImageUrl.trim().length > 0 ? (
                  <div
                    aria-label={copy.imagePreview}
                    className="announcement-image-preview"
                    style={{ backgroundImage: `url(${updatePayload.coverImageUrl})` }}
                  />
                ) : null}
              </div>

              <label className="field">
                <span className="field-label">{copy.maxParticipants}</span>
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
                <span className="field-label">{copy.minimumStampsRequired}</span>
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
                  locale={locale}
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
                    disabled={isUpdatePending || isCoverUploading}
                    type="submit"
                  >
                    {isCoverUploading ? copy.uploadingCover : isUpdatePending ? copy.saving : copy.saveEvent}
                  </button>
                  <button
                    className="button button-danger"
                    disabled={isCancelPending || !canCancelEvent(selectedEvent)}
                    onClick={() => void handleCancelEvent(selectedEvent)}
                    type="button"
                  >
                    {isCancelPending ? copy.cancelling : copy.cancel}
                  </button>
                </div>
                {renderActionState(updateActionState)}
                {renderActionState(cancelActionState)}
              </form>
            )}
          </div>
        )}
      </section>

      <section className="stack-md" style={{ display: activeTab !== "manage-events" ? "none" : undefined }}>
        <div className="stack-sm">
          <div className="eyebrow">{copy.recentEvents}</div>
          <h3 className="section-title">{copy.recentEventsTitle}</h3>
          <p className="muted-text">
            {copy.recentEventsBodyPrefix} {snapshot.summary.latestEventLimit} {copy.recentEventsBodySuffix}
          </p>
        </div>

        {snapshot.recentEvents.length === 0 ? (
          <article className="panel">
            <p className="muted-text">{copy.recentEventsEmpty}</p>
          </article>
        ) : (
          <div className="panel-table-wrap">
            <table className="panel-table">
              <thead>
                <tr>
                  <th>{locale === "fi" ? "Tapahtuma" : "Event"}</th>
                  <th>{locale === "fi" ? "Tila" : "Status"}</th>
                  <th>{locale === "fi" ? "Osallistujat" : "Participants"}</th>
                  <th>{locale === "fi" ? "Rastit / leimat" : "Venues / stamps"}</th>
                  <th>{locale === "fi" ? "Ajankohta" : "Date range"}</th>
                  <th>{locale === "fi" ? "Toiminnot" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.recentEvents.map((event) => (
                  <tr key={event.eventId} className={event.eventId === selectedEventId ? "panel-table-row-active" : undefined}>
                    <td>
                      <span>{event.name}</span>
                      <span className="record-meta">{formatClubEventMeta(event)}</span>
                      {event.createdByEmail !== null ? (
                        <span className="record-meta">{locale === "fi" ? "Luonut" : "By"} {event.createdByEmail}</span>
                      ) : null}
                    </td>
                    <td>
                      <span className={getClubEventStatusClassName(event.status)}>{formatEventStatus(event.status, locale)}</span>
                    </td>
                    <td className="record-meta">
                      {event.registeredParticipantCount} {locale === "fi" ? "ilm." : "reg."}
                      {event.maxParticipants !== null ? ` / ${event.maxParticipants}` : ""}
                    </td>
                    <td className="record-meta">
                      {event.joinedVenueCount} {locale === "fi" ? "rastia" : "venues"} · {event.minimumStampsRequired} {locale === "fi" ? "leimaa" : "stamps"}
                    </td>
                    <td className="record-meta">
                      <span>{formatClubEventDateTime(event.startAt)}</span>
                      <span> – {formatClubEventDateTime(event.endAt)}</span>
                      <span className="record-meta">{locale === "fi" ? "Viim." : "Deadline"} {formatClubEventDateTime(event.joinDeadlineAt)}</span>
                    </td>
                    <td>
                      <div className="admin-users-actions">
                        <button
                          className="button button-secondary"
                          disabled={!canManageEvent(event) || !canEditEvent(event)}
                          onClick={() => handleSelectEvent(event)}
                          type="button"
                        >
                          {locale === "fi" ? "Muokkaa" : "Edit"}
                        </button>
                        <button
                          className="button button-danger"
                          disabled={!canManageEvent(event) || !canCancelEvent(event) || isCancelPending}
                          onClick={() => void handleCancelEvent(event)}
                          type="button"
                        >
                          {copy.cancel}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
