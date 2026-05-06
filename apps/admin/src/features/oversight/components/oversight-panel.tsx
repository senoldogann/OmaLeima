"use client";

import { useState } from "react";

import type { DashboardLocale } from "@/features/dashboard/i18n";
import { formatOversightClubMeta, formatOversightDateTime, formatOversightEventMeta } from "@/features/oversight/format";
import type { AdminOversightSnapshot } from "@/features/oversight/types";
import { FraudSignalReviewList } from "@/features/fraud-review/components/fraud-signal-review-list";

type OversightPanelProps = {
  locale: DashboardLocale;
  snapshot: AdminOversightSnapshot;
};

type OversightCopy = {
  activeClubs: string;
  activeClubsBody: string;
  auditLogs: string;
  auditLogs24h: string;
  auditLogsBody: string;
  catalogHealth: string;
  clubsAndEvents: string;
  created: string;
  eventOperations: string;
  fraudSignals: string;
  fraudSignalsBody: string;
  latestAuditLogs: string;
  latestClubs: string;
  latestFraudSignals: string;
  noAuditLogs: string;
  noActorOrResource: string;
  noClubs: string;
  noContactEmail: string;
  noLocationMeta: string;
  noFraudSignals: string;
  noOperationalEvents: string;
  operationalEvents: string;
  operationalEventsBody: string;
  showingAuditLogs: string;
  showingClubs: string;
  showingFraudSignals: string;
  showingOperationalEvents: string;
  timeRangeSeparator: string;
  traceability: string;
};

const copyByLocale: Record<DashboardLocale, OversightCopy> = {
  en: {
    activeClubs: "Active clubs",
    activeClubsBody: "Platform-wide active clubs visible to system admins.",
    auditLogs: "Audit Logs",
    auditLogs24h: "Audit logs in 24h",
    auditLogsBody: "Recent system-side actions captured in the admin-visible audit trail.",
    catalogHealth: "Catalog health",
    clubsAndEvents: "Clubs & Events",
    created: "Created",
    eventOperations: "Event operations",
    fraudSignals: "Fraud Signals",
    fraudSignalsBody: "Signals still waiting for an explicit review or confirmation path.",
    latestAuditLogs: "Latest audit logs",
    latestClubs: "Latest clubs",
    latestFraudSignals: "Latest open fraud signals",
    noAuditLogs: "No audit logs are visible right now.",
    noActorOrResource: "No actor or resource details",
    noClubs: "No clubs are visible right now.",
    noContactEmail: "No contact email",
    noLocationMeta: "No city or university label",
    noFraudSignals: "No fraud signals are visible right now.",
    noOperationalEvents: "No operational events are visible right now.",
    operationalEvents: "Operational events",
    operationalEventsBody: "Draft, published, or active events that are still operationally relevant.",
    showingAuditLogs: "Showing the latest {count} audit entries recorded by the backend.",
    showingClubs: "Showing the latest {count} clubs by creation time.",
    showingFraudSignals: "Showing the latest {count} fraud signals that still need operator attention.",
    showingOperationalEvents: "Showing the next {count} upcoming or currently active events that still matter operationally.",
    timeRangeSeparator: "to",
    traceability: "Traceability",
  },
  fi: {
    activeClubs: "Aktiiviset klubit",
    activeClubsBody: "Koko alustan aktiiviset klubit, jotka ovat adminille näkyvissä.",
    auditLogs: "Audit-lokit",
    auditLogs24h: "Audit-lokit 24 h",
    auditLogsBody: "Viimeisimmät järjestelmän toimet adminin audit trailissa.",
    catalogHealth: "Katalogin tila",
    clubsAndEvents: "Klubit ja tapahtumat",
    created: "Luotu",
    eventOperations: "Tapahtumaoperaatiot",
    fraudSignals: "Fraud-signaalit",
    fraudSignalsBody: "Signaalit, jotka odottavat vielä tarkistusta tai vahvistusta.",
    latestAuditLogs: "Viimeisimmät audit-lokit",
    latestClubs: "Viimeisimmät klubit",
    latestFraudSignals: "Viimeisimmät avoimet fraud-signaalit",
    noAuditLogs: "Audit-lokeja ei ole nyt näkyvissä.",
    noActorOrResource: "Ei toimija- tai resurssitietoja",
    noClubs: "Klubeja ei ole nyt näkyvissä.",
    noContactEmail: "Ei yhteyssähköpostia",
    noLocationMeta: "Ei kaupunki- tai yliopistotietoa",
    noFraudSignals: "Fraud-signaaleja ei ole nyt näkyvissä.",
    noOperationalEvents: "Operatiivisia tapahtumia ei ole nyt näkyvissä.",
    operationalEvents: "Operatiiviset tapahtumat",
    operationalEventsBody: "Luonnokset, julkaistut ja aktiiviset tapahtumat, joilla on yhä operatiivista merkitystä.",
    showingAuditLogs: "Näytetään viimeisimmät {count} backendin kirjaamaa audit-riviä.",
    showingClubs: "Näytetään {count} uusinta klubia.",
    showingFraudSignals: "Näytetään viimeisimmät {count} fraud-signaalia, jotka tarvitsevat operaattorin huomiota.",
    showingOperationalEvents: "Näytetään seuraavat {count} tulevaa tai käynnissä olevaa tapahtumaa, joilla on vielä operatiivista merkitystä.",
    timeRangeSeparator: "-",
    traceability: "Jäljitettävyys",
  },
};

const interpolateCount = (template: string, count: number): string =>
  template.replace("{count}", String(count));

const withFallback = (value: string, fallback: string): string => (value.length > 0 ? value : fallback);

const renderMetadataLine = (value: string | null) => {
  if (value === null) {
    return null;
  }

  return <p className="record-note">{value}</p>;
};

export const OversightPanel = ({ locale, snapshot }: OversightPanelProps) => {
  const copy = copyByLocale[locale];
  const [activeTab, setActiveTab] = useState<"clubs-events" | "fraud-signals" | "audit-logs">("clubs-events");

  return (
    <div className="stack-lg">
      <section className="metrics-grid metrics-grid-quad">
        <article className="panel panel-accent">
          <div className="stack-sm">
            <span className="field-label">{copy.activeClubs}</span>
            <strong className="metric-value">{snapshot.summary.activeClubCount}</strong>
            <p className="muted-text">{copy.activeClubsBody}</p>
          </div>
        </article>

        <article className="panel">
          <div className="stack-sm">
            <span className="field-label">{copy.operationalEvents}</span>
            <strong className="metric-value">{snapshot.summary.operationalEventCount}</strong>
            <p className="muted-text">{copy.operationalEventsBody}</p>
          </div>
        </article>

        <article className="panel panel-warning">
          <div className="stack-sm">
            <span className="field-label">{copy.fraudSignals}</span>
            <strong className="metric-value">{snapshot.summary.openFraudSignalCount}</strong>
            <p className="muted-text">{copy.fraudSignalsBody}</p>
          </div>
        </article>

        <article className="panel">
          <div className="stack-sm">
            <span className="field-label">{copy.auditLogs24h}</span>
            <strong className="metric-value">{snapshot.summary.recentAuditCount}</strong>
            <p className="muted-text">{copy.auditLogsBody}</p>
          </div>
        </article>
      </section>

      <div className="tab-nav">
        <button className={activeTab === "clubs-events" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("clubs-events")} type="button">{copy.clubsAndEvents}</button>
        <button className={activeTab === "fraud-signals" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("fraud-signals")} type="button">{copy.fraudSignals}</button>
        <button className={activeTab === "audit-logs" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("audit-logs")} type="button">{copy.auditLogs}</button>
      </div>

      <section className="content-grid" style={{ display: activeTab !== "clubs-events" ? "none" : undefined }}>
        <article className="panel">
          <div className="stack-sm">
            <div className="eyebrow">{copy.catalogHealth}</div>
            <h3 className="section-title">{copy.latestClubs}</h3>
            <p className="muted-text">{interpolateCount(copy.showingClubs, snapshot.summary.latestClubLimit)}</p>
          </div>

          {snapshot.clubs.length === 0 ? (
            <p className="muted-text">{copy.noClubs}</p>
          ) : (
            <ul className="record-list">
              {snapshot.clubs.map((club) => (
                  <li key={club.id} className="record-item">
                    <div className="record-main">
                      <p className="record-title">{club.name}</p>
                      <p className="record-meta record-meta-accent">
                        {withFallback(formatOversightClubMeta(club.city, club.universityName), copy.noLocationMeta)}
                      </p>
                      <p className="record-note">
                        {club.contactEmail ?? copy.noContactEmail} · {copy.created} {formatOversightDateTime(locale, club.createdAt)}
                      </p>
                    </div>
                    <span className="status-pill">{club.status}</span>
                  </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <div className="stack-sm">
            <div className="eyebrow">{copy.eventOperations}</div>
            <h3 className="section-title">{copy.operationalEvents}</h3>
            <p className="muted-text">{interpolateCount(copy.showingOperationalEvents, snapshot.summary.latestEventLimit)}</p>
          </div>

          {snapshot.events.length === 0 ? (
            <p className="muted-text">{copy.noOperationalEvents}</p>
          ) : (
            <ul className="record-list">
              {snapshot.events.map((event) => (
                  <li key={event.id} className="record-item">
                  <div className="record-main">
                    <p className="record-title">{event.name}</p>
                    <p className="record-meta record-meta-accent">{formatOversightEventMeta(event.clubName, event.city, event.visibility)}</p>
                    <p className="record-note">
                      {formatOversightDateTime(locale, event.startAt)} {copy.timeRangeSeparator} {formatOversightDateTime(locale, event.endAt)}
                    </p>
                  </div>
                  <span className="status-pill">{event.status}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="content-grid" style={{ display: activeTab === "clubs-events" ? "none" : undefined }}>
        <article className="panel panel-warning" style={activeTab === "fraud-signals" ? { gridColumn: "1 / -1" } : { display: "none" }}>
          <div className="stack-sm">
            <div className="eyebrow">Integrity</div>
            <h3 className="section-title">{copy.latestFraudSignals}</h3>
            <p className="muted-text">{interpolateCount(copy.showingFraudSignals, snapshot.summary.latestFraudLimit)}</p>
          </div>

          <FraudSignalReviewList
            emptyText={copy.noFraudSignals}
            locale={locale}
            signals={snapshot.fraudSignals}
          />
        </article>

        <article className="panel" style={activeTab === "audit-logs" ? { gridColumn: "1 / -1" } : { display: "none" }}>
          <div className="stack-sm">
            <div className="eyebrow">{copy.traceability}</div>
            <h3 className="section-title">{copy.latestAuditLogs}</h3>
            <p className="muted-text">{interpolateCount(copy.showingAuditLogs, snapshot.summary.latestAuditLimit)}</p>
          </div>

          {snapshot.auditLogs.length === 0 ? (
            <p className="muted-text">{copy.noAuditLogs}</p>
          ) : (
            <ul className="record-list">
              {snapshot.auditLogs.map((log) => (
                <li key={log.id} className="record-item">
                  <div className="record-main">
                    <p className="record-title">{log.action}</p>
                    <p className="record-meta">
                      {withFallback(
                        [log.actorEmail, log.resourceType, log.resourceId]
                          .filter((value) => value !== null)
                          .join(" · "),
                        copy.noActorOrResource
                      )}
                    </p>
                    {renderMetadataLine(log.metadataSummary)}
                    <p className="record-note">{copy.created} {formatOversightDateTime(locale, log.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
};
