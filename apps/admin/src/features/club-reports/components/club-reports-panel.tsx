"use client";

import { useMemo, useState, useTransition } from "react";

import { submitAnnouncementCreateRequestAsync } from "@/features/announcements/client";
import type { AnnouncementMutationResponse } from "@/features/announcements/types";
import type { ClubReportEvent, ClubReportsSnapshot } from "@/features/club-reports/types";
import type { DashboardLocale } from "@/features/dashboard/i18n";

type ClubReportsPanelProps = {
  locale: DashboardLocale;
  snapshot: ClubReportsSnapshot;
};

type ActionState = {
  message: string | null;
  tone: "error" | "success";
};

const formatDate = (locale: DashboardLocale, value: string): string =>
  new Intl.DateTimeFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const formatMetric = (value: number): string => new Intl.NumberFormat("fi-FI").format(value);

const toLocalDateTimeInput = (value: Date): string => {
  const timezoneOffsetMs = value.getTimezoneOffset() * 60_000;
  const localDate = new Date(value.getTime() - timezoneOffsetMs);

  return localDate.toISOString().slice(0, 16);
};

const buildFollowUpCopy = (event: ClubReportEvent, locale: DashboardLocale): { body: string; title: string } => {
  if (locale === "fi") {
    return {
      body: `Kiitos kun olit mukana tapahtumassa ${event.name}. Leimat ja palkinnot näkyvät OmaLeimassa. Seuraa tulevia tapahtumia ja lunasta etusi ajoissa.`,
      title: `Kiitos tapahtumasta ${event.name}`,
    };
  }

  return {
    body: `Thanks for joining ${event.name}. Your stamps and rewards are available in OmaLeima. Keep an eye on upcoming events and claim your benefits in time.`,
    title: `Thanks for joining ${event.name}`,
  };
};

const readResponseMessage = (response: AnnouncementMutationResponse): string =>
  response.message.length > 0 ? response.message : "Announcement request completed.";

export const ClubReportsPanel = ({ locale, snapshot }: ClubReportsPanelProps) => {
  const allEvents = useMemo(
    () => snapshot.reports.flatMap((report) => report.events.map((event) => ({ ...event, clubId: report.clubId, clubName: report.clubName }))),
    [snapshot.reports]
  );
  const initialEventId = allEvents[0]?.eventId ?? "";
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId);
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedEvent = allEvents.find((event) => event.eventId === selectedEventId) ?? null;
  const selectedCopy = selectedEvent === null ? null : buildFollowUpCopy(selectedEvent, locale);

  const handleCreateFollowUp = (): void => {
    if (selectedEvent === null || selectedCopy === null) {
      return;
    }

    setActionState(null);
    startTransition(() => {
      void (async () => {
        try {
          const response = await submitAnnouncementCreateRequestAsync({
            audience: "STUDENTS",
            body: selectedCopy.body,
            clubId: selectedEvent.clubId,
            ctaLabel: locale === "fi" ? "Avaa OmaLeima" : "Open OmaLeima",
            ctaUrl: selectedEvent.ticketUrl ?? "",
            endsAt: "",
            eventId: selectedEvent.eventId,
            imageStagingPath: "",
            imageUrl: "",
            priority: "3",
            startsAt: toLocalDateTimeInput(new Date(Date.now() + 30 * 60 * 1000)),
            status: "PUBLISHED",
            title: selectedCopy.title,
          });

          setActionState({
            message: readResponseMessage(response),
            tone: response.status === "SUCCESS" ? "success" : "error",
          });
        } catch (error) {
          setActionState({
            message: error instanceof Error ? error.message : "Failed to create follow-up announcement.",
            tone: "error",
          });
        }
      })();
    });
  };

  return (
    <section className="stack-xl">
      <section className="overview-strip" aria-label={locale === "fi" ? "Raportin yhteenveto" : "Report summary"}>
        <article className="overview-tile overview-tile-accent">
          <span className="overview-tile-label">{locale === "fi" ? "Tapahtumat" : "Events"}</span>
          <strong className="overview-tile-value">{formatMetric(snapshot.summary.eventCount)}</strong>
          <p className="overview-tile-description">{locale === "fi" ? "Viimeisen jakson raportoitavat tapahtumat." : "Reportable events in the selected window."}</p>
        </article>
        <article className="overview-tile overview-tile-neutral">
          <span className="overview-tile-label">{locale === "fi" ? "Rekisteröityneet" : "Registrations"}</span>
          <strong className="overview-tile-value">{formatMetric(snapshot.summary.registeredParticipantCount)}</strong>
          <p className="overview-tile-description">{locale === "fi" ? "Tapahtumiin ilmoittautuneet opiskelijat." : "Students registered to your events."}</p>
        </article>
        <article className="overview-tile overview-tile-neutral">
          <span className="overview-tile-label">{locale === "fi" ? "Leimat" : "Valid stamps"}</span>
          <strong className="overview-tile-value">{formatMetric(snapshot.summary.validStampCount)}</strong>
          <p className="overview-tile-description">{locale === "fi" ? "Vahvistetut leimat tapahtumissa." : "Validated stamps across events."}</p>
        </article>
        <article className="overview-tile overview-tile-warning">
          <span className="overview-tile-label">{locale === "fi" ? "Palkinnot" : "Reward claims"}</span>
          <strong className="overview-tile-value">{formatMetric(snapshot.summary.claimedRewardCount)}</strong>
          <p className="overview-tile-description">{locale === "fi" ? "Fyysisesti luovutetut palkinnot." : "Physically handed reward claims."}</p>
        </article>
      </section>

      <article className="panel">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">{locale === "fi" ? "Tapahtumaraportti" : "Event report"}</p>
            <h2>{locale === "fi" ? "Järjestäjän suorituskyky" : "Organizer performance"}</h2>
            <p className="muted-text">
              {locale === "fi"
                ? `Näytetään viimeiset ${snapshot.selectedWindowDays} päivää.`
                : `Showing the last ${snapshot.selectedWindowDays} days.`}
            </p>
          </div>
          {allEvents.length > 0 ? (
            <label className="field compact-field">
              <span className="field-label">{locale === "fi" ? "Valittu tapahtuma" : "Selected event"}</span>
              <select className="field-input" onChange={(event) => setSelectedEventId(event.target.value)} value={selectedEventId}>
                {allEvents.map((event) => (
                  <option key={event.eventId} value={event.eventId}>
                    {event.name} · {event.clubName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {selectedEvent === null ? (
          <p className="muted-text">{locale === "fi" ? "Raportoitavia tapahtumia ei vielä ole." : "No reportable events yet."}</p>
        ) : (
          <div className="metric-grid">
            <article className="metric-card">
              <span>{locale === "fi" ? "Osallistumisaste" : "Attendance rate"}</span>
              <strong>{selectedEvent.attendanceRate}%</strong>
              <p>{selectedEvent.uniqueStampedStudentCount} / {selectedEvent.registeredParticipantCount}</p>
            </article>
            <article className="metric-card">
              <span>{locale === "fi" ? "Paikat" : "Venues"}</span>
              <strong>{formatMetric(selectedEvent.joinedVenueCount)}</strong>
              <p>{locale === "fi" ? "Mukana olevat yritykset" : "Joined businesses"}</p>
            </article>
            <article className="metric-card">
              <span>{locale === "fi" ? "Leimat" : "Stamps"}</span>
              <strong>{formatMetric(selectedEvent.validStampCount)}</strong>
              <p>{selectedEvent.manualReviewStampCount} manual · {selectedEvent.revokedStampCount} revoked</p>
            </article>
            <article className="metric-card">
              <span>{locale === "fi" ? "Palkintokonversio" : "Reward conversion"}</span>
              <strong>{selectedEvent.rewardClaimRate}%</strong>
              <p>{formatMetric(selectedEvent.claimedRewardCount)} {locale === "fi" ? "lunastusta" : "claims"}</p>
            </article>
          </div>
        )}
      </article>

      {selectedEvent !== null && selectedCopy !== null ? (
        <article className="panel panel-accent">
          <p className="eyebrow">{locale === "fi" ? "Post-event recall" : "Post-event re-engagement"}</p>
          <h2>{locale === "fi" ? "Kutsu osallistujat takaisin" : "Bring participants back"}</h2>
          <p className="muted-text">
            {locale === "fi"
              ? "Tämä luo julkaistun, event-kohtaisen tiedotteen vain kyseiseen tapahtumaan rekisteröityneille opiskelijoille."
              : "This creates a published event-scoped announcement only for students registered to the selected event."}
          </p>
          <div className="surface-card">
            <strong>{selectedCopy.title}</strong>
            <p>{selectedCopy.body}</p>
            <p className="muted-text">
              {formatDate(locale, selectedEvent.startAt)} · {selectedEvent.city}
            </p>
          </div>
          <button className="button button-primary" disabled={isPending} onClick={handleCreateFollowUp} type="button">
            {isPending
              ? locale === "fi" ? "Luodaan..." : "Creating..."
              : locale === "fi" ? "Luo follow-up" : "Create follow-up"}
          </button>
          {actionState !== null ? (
            <p className={actionState.tone === "success" ? "inline-success" : "inline-error"}>{actionState.message}</p>
          ) : null}
        </article>
      ) : null}
    </section>
  );
};
