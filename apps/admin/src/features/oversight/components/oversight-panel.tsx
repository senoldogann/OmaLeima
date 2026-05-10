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
  fraudSignalsDetectionRule: string;
  fraudSignalsReviewRule: string;
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
    fraudSignalsDetectionRule: "Current detection: a signal is created when a stamp scan includes scanner coordinates that are more than 300 meters from the business location. Severity rises at 750 m and 1.5 km.",
    fraudSignalsReviewRule: "Review actions are atomic: dismiss for a false positive, confirm for a real issue, or mark reviewed after checking the scan context. Every action is written to the audit log.",
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
    auditLogs: "Valvontakirjaukset",
    auditLogs24h: "Kirjaukset 24 h",
    auditLogsBody: "Viimeisimmät järjestelmän toimet valvontahistoriassa.",
    catalogHealth: "Katalogin tila",
    clubsAndEvents: "Klubit ja tapahtumat",
    created: "Luotu",
    eventOperations: "Tapahtumat",
    fraudSignals: "Väärinkäyttöilmoitukset",
    fraudSignalsBody: "Ilmoitukset, joita ei ole vielä tarkistettu.",
    fraudSignalsDetectionRule: "Nykyinen tunnistus: signaali luodaan, kun leimaskannaus sisältää skannerin sijainnin, joka on yli 300 metriä yrityksen sijainnista. Vakavuus kasvaa 750 m ja 1,5 km kohdalla.",
    fraudSignalsReviewRule: "Tarkistus on atominen: hylkää virhehälytys, vahvista todellinen ongelma tai merkitse tarkistetuksi. Jokainen toimi kirjataan valvontalokiin.",
    latestAuditLogs: "Viimeisimmät valvontakirjaukset",
    latestClubs: "Viimeisimmät klubit",
    latestFraudSignals: "Viimeisimmät avoimet väärinkäyttöilmoitukset",
    noAuditLogs: "Valvontakirjauksia ei ole nyt näkyvissä.",
    noActorOrResource: "Ei toimija- tai resurssitietoja",
    noClubs: "Klubeja ei ole nyt näkyvissä.",
    noContactEmail: "Ei yhteyssähköpostia",
    noLocationMeta: "Ei kaupunki- tai yliopistotietoa",
    noFraudSignals: "Väärinkäyttöilmoituksia ei ole nyt näkyvissä.",
    noOperationalEvents: "Käynnissä olevia tapahtumia ei ole nyt näkyvissä.",
    operationalEvents: "Käynnissä olevat tapahtumat",
    operationalEventsBody: "Luonnokset, julkaistut ja aktiiviset tapahtumat, jotka ovat vielä ajankohtaisia.",
    showingAuditLogs: "Näytetään viimeisimmät {count} valvontakirjausta.",
    showingClubs: "Näytetään {count} uusinta klubia.",
    showingFraudSignals: "Näytetään viimeisimmät {count} väärinkäyttöilmoitusta, jotka odottavat tarkistusta.",
    showingOperationalEvents: "Näytetään seuraavat {count} tulevaa tai käynnissä olevaa tapahtumaa.",
    timeRangeSeparator: "-",
    traceability: "Jäljitettävyys",
  },
};

const interpolateCount = (template: string, count: number): string =>
  template.replace("{count}", String(count));

const withFallback = (value: string, fallback: string): string => (value.length > 0 ? value : fallback);

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
            <div className="panel-table-wrap">
              <table className="panel-table">
                <thead>
                  <tr>
                    <th>{locale === "fi" ? "Nimi" : "Name"}</th>
                    <th>{locale === "fi" ? "Sijainti" : "Location"}</th>
                    <th>{locale === "fi" ? "Sähköposti" : "Email"}</th>
                    <th>{locale === "fi" ? "Luotu" : "Created"}</th>
                    <th>{locale === "fi" ? "Tila" : "Status"}</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.clubs.map((club) => (
                    <tr key={club.id}>
                      <td>{club.name}</td>
                      <td className="record-meta">{withFallback(formatOversightClubMeta(club.city, club.universityName), copy.noLocationMeta)}</td>
                      <td className="record-meta">{club.contactEmail ?? copy.noContactEmail}</td>
                      <td className="record-meta">{formatOversightDateTime(locale, club.createdAt)}</td>
                      <td><span className="status-pill">{club.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <div className="panel-table-wrap">
              <table className="panel-table">
                <thead>
                  <tr>
                    <th>{locale === "fi" ? "Nimi" : "Name"}</th>
                    <th>{locale === "fi" ? "Järjestäjä" : "Club"}</th>
                    <th>{locale === "fi" ? "Ajankohta" : "Date range"}</th>
                    <th>{locale === "fi" ? "Tila" : "Status"}</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.events.map((event) => (
                    <tr key={event.id}>
                      <td>{event.name}</td>
                      <td className="record-meta">{formatOversightEventMeta(event.clubName, event.city, event.visibility)}</td>
                      <td className="record-meta">{formatOversightDateTime(locale, event.startAt)} {copy.timeRangeSeparator} {formatOversightDateTime(locale, event.endAt)}</td>
                      <td><span className="status-pill">{event.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <section className="content-grid" style={{ display: activeTab === "clubs-events" ? "none" : undefined }}>
        <article className="panel panel-warning" style={activeTab === "fraud-signals" ? { gridColumn: "1 / -1" } : { display: "none" }}>
          <div className="stack-sm">
            <div className="eyebrow">Integrity</div>
            <h3 className="section-title">{copy.latestFraudSignals}</h3>
            <p className="muted-text">{interpolateCount(copy.showingFraudSignals, snapshot.summary.latestFraudLimit)}</p>
            <p className="review-note">{copy.fraudSignalsDetectionRule}</p>
            <p className="review-note">{copy.fraudSignalsReviewRule}</p>
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
            <div className="panel-table-wrap">
              <table className="panel-table">
                <thead>
                  <tr>
                    <th>{locale === "fi" ? "Toiminto" : "Action"}</th>
                    <th>{locale === "fi" ? "Toimija / resurssi" : "Actor / resource"}</th>
                    <th>{locale === "fi" ? "Lisätiedot" : "Metadata"}</th>
                    <th>{locale === "fi" ? "Aika" : "Time"}</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.action}</td>
                      <td className="record-meta">
                        {withFallback(
                          [log.actorEmail, log.resourceType, log.resourceId]
                            .filter((value) => value !== null)
                            .join(" · "),
                          copy.noActorOrResource
                        )}
                      </td>
                      <td className="record-meta">{log.metadataSummary ?? "—"}</td>
                      <td className="record-meta">{formatOversightDateTime(locale, log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </div>
  );
};
