"use client";

import { useMemo, useState } from "react";

import type { DashboardLocale } from "@/features/dashboard/i18n";
import { RewardClaimCandidateCard } from "@/features/club-claims/components/reward-claim-candidate-card";
import {
  formatClubClaimEventMeta,
  formatClubClaimHistoryMeta,
  formatClubClaimInventory,
  formatClubClaimProgress,
  formatClubClaimRewardType,
  getClubClaimStatusClassName,
} from "@/features/club-claims/format";
import type { ClubClaimsSnapshot } from "@/features/club-claims/types";

type ClubClaimsPanelProps = {
  locale: DashboardLocale;
  snapshot: ClubClaimsSnapshot;
};

export const ClubClaimsPanel = ({ locale, snapshot }: ClubClaimsPanelProps) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(snapshot.events[0]?.eventId ?? "");
  const [activeTab, setActiveTab] = useState<"event-queue" | "recent-claims">("event-queue");
  const effectiveSelectedEventId = snapshot.events.some((event) => event.eventId === selectedEventId)
    ? selectedEventId
    : (snapshot.events[0]?.eventId ?? "");
  const selectedEvent = snapshot.events.find((event) => event.eventId === effectiveSelectedEventId) ?? null;
  const filteredCandidates = useMemo(
    () => snapshot.candidates.filter((candidate) => candidate.eventId === effectiveSelectedEventId),
    [effectiveSelectedEventId, snapshot.candidates]
  );
  const filteredRecentClaims = useMemo(
    () => snapshot.recentClaims.filter((claim) => claim.eventId === effectiveSelectedEventId),
    [effectiveSelectedEventId, snapshot.recentClaims]
  );
  const filteredProgress = useMemo(
    () => snapshot.progress.filter((record) => record.eventId === effectiveSelectedEventId),
    [effectiveSelectedEventId, snapshot.progress]
  );
  const handleEventSelect = (eventId: string): void => {
    setSelectedEventId(eventId);
    setActiveTab("event-queue");
  };

  return (
    <div className="stack-lg">
      <section className="metrics-grid">
        <article className="panel panel-accent">
          <div className="stack-sm">
            <span className="field-label">{locale === "fi" ? "Käynnissä olevat tapahtumat" : "Operational events"}</span>
            <strong className="metric-value">{snapshot.summary.operationalEventCount}</strong>
            <p className="muted-text">{locale === "fi" ? "Aktiiviset tai päättyneet tapahtumat, joissa palkinto voidaan luovuttaa." : "Active or completed events where club staff can confirm reward handoff."}</p>
          </div>
        </article>

        <article className="panel">
          <div className="stack-sm">
            <span className="field-label">{locale === "fi" ? "Palkintoa odottavat" : "Claimable candidates"}</span>
            <strong className="metric-value">{snapshot.summary.claimableCandidateCount}</strong>
            <p className="muted-text">
              {locale === "fi"
                ? `Näytetään ${snapshot.summary.visibleCandidateCount} opiskelijaa, jotka odottavat palkintoa.`
                : `Showing the latest ${snapshot.summary.visibleCandidateCount} candidate${snapshot.summary.visibleCandidateCount === 1 ? "" : "s"} across visible events.`}
            </p>
          </div>
        </article>

        <article className="panel">
          <div className="stack-sm">
            <span className="field-label">{locale === "fi" ? "Kesken" : "In progress"}</span>
            <strong className="metric-value">{snapshot.summary.progressCandidateCount}</strong>
            <p className="muted-text">
              {locale === "fi"
                ? `Näytetään ${snapshot.summary.visibleProgressCount} opiskelijaa, joilta puuttuu vielä leimoja.`
                : `Showing ${snapshot.summary.visibleProgressCount} student reward progress row${snapshot.summary.visibleProgressCount === 1 ? "" : "s"} below the handoff threshold.`}
            </p>
          </div>
        </article>

        <article className="panel panel-warning">
          <div className="stack-sm">
            <span className="field-label">{locale === "fi" ? "Viimeksi jaetut" : "Recent claims"}</span>
            <strong className="metric-value">{snapshot.summary.recentClaimCount}</strong>
            <p className="muted-text">
              {locale === "fi"
                ? `Näytetään ${snapshot.summary.visibleClaimCount} viimeisintä jaettua palkintoa.`
                : `Showing the latest ${snapshot.summary.visibleClaimCount} recorded reward claim${snapshot.summary.visibleClaimCount === 1 ? "" : "s"}.`}
            </p>
          </div>
        </article>
      </section>

      <div className="tab-nav">
        <button className={activeTab === "event-queue" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("event-queue")} type="button">{locale === "fi" ? "Tapahtumat" : "Event Queue"}</button>
        <button className={activeTab === "recent-claims" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("recent-claims")} type="button">{locale === "fi" ? "Viimeksi jaetut" : "Recent Claims"}</button>
      </div>

      <section className="content-grid" style={{ display: activeTab !== "event-queue" ? "none" : undefined }}>
        <div className="stack-md">
          <div className="stack-sm">
            <div className="eyebrow">{locale === "fi" ? "Tapahtumat" : "Event handoff queue"}</div>
            <h3 className="section-title">{locale === "fi" ? "Käynnissä olevat tapahtumat" : "Operational events"}</h3>
            <p className="muted-text">
              {locale === "fi"
                ? "Valitse tapahtuma tarkistaaksesi palkintoa odottavat opiskelijat, kesken olevat palkintopolut ja viimeksi vahvistetut luovutukset."
                : "Pick an event to review claimable students, in-progress reward paths, and recently confirmed rewards."}
            </p>
          </div>

          {snapshot.events.length === 0 ? (
            <article className="panel">
              <p className="muted-text">{locale === "fi" ? "Aktiivisia tai päättyneitä klubitapahtumia ei ole nyt näkyvissä palkintoluovutusta varten." : "No active or completed club events are visible for reward handoff right now."}</p>
            </article>
          ) : (
            <div className="panel-table-wrap">
              <table className="panel-table">
                <thead>
                  <tr>
                    <th>{locale === "fi" ? "Tapahtuma" : "Event"}</th>
                    <th>{locale === "fi" ? "Tila" : "Status"}</th>
                    <th>{locale === "fi" ? "Odottaa" : "Claimable"}</th>
                    <th>{locale === "fi" ? "Kesken" : "Progress"}</th>
                    <th>{locale === "fi" ? "Jaettu" : "Claimed"}</th>
                    <th>{locale === "fi" ? "Tasot" : "Tiers"}</th>
                    <th>{locale === "fi" ? "Valinta" : "Select"}</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.events.map((event) => {
                    const isSelected = event.eventId === selectedEvent?.eventId;
                    return (
                      <tr key={event.eventId} className={isSelected ? "panel-table-row-active" : undefined}>
                        <td>
                          <span>{event.name}</span>
                          <span className="record-meta">{formatClubClaimEventMeta(locale, event)}</span>
                        </td>
                        <td>
                          <span className={event.eventStatus === "ACTIVE" ? "status-pill status-pill-success" : "status-pill"}>
                            {event.eventStatus}
                          </span>
                        </td>
                        <td className="record-meta">{event.claimableCandidateCount}</td>
                        <td className="record-meta">{event.progressCandidateCount}</td>
                        <td className="record-meta">{event.recentClaimCount}</td>
                        <td className="record-meta">{event.activeRewardTierCount}</td>
                        <td>
                          <button
                            className="button button-secondary"
                            disabled={isSelected}
                            onClick={() => handleEventSelect(event.eventId)}
                            type="button"
                          >
                            {isSelected
                              ? locale === "fi" ? "Valittu" : "Selected"
                              : locale === "fi" ? "Avaa" : "Open queue"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="stack-md">
          <div className="stack-sm">
            <div className="eyebrow">{locale === "fi" ? "Valittu tapahtuma" : "Selected event"}</div>
            <h3 className="section-title">{selectedEvent?.name ?? (locale === "fi" ? "Tapahtumaa ei ole valittu" : "No event selected")}</h3>
            <p className="muted-text">
              {locale === "fi"
                ? "Vahvista palkinnon luovutus vasta, kun fyysinen tuote on oikeasti annettu opiskelijalle."
                : "Confirm reward handoff only after the physical item is actually delivered to the student."}
            </p>
            {selectedEvent !== null ? (
              <p className="review-note">
                {locale === "fi"
                  ? "Alla oleva jono ja historia on rajattu tähän valittuun tapahtumaan."
                  : "The queue and recent history below are filtered to this selected event."}
              </p>
            ) : null}
          </div>

          {selectedEvent === null ? (
            <article className="panel">
              <p className="muted-text">{locale === "fi" ? "Valitse tapahtuma nähdäksesi palkintoa odottavat opiskelijat." : "Select an operational event to inspect reward handoff candidates."}</p>
            </article>
          ) : filteredCandidates.length === 0 ? (
            <article className="panel">
              <p className="muted-text">{locale === "fi" ? "Tälle tapahtumalle ei ole nyt näkyvissä lunastettavia opiskelijoita." : "No claimable students are visible for this event right now."}</p>
            </article>
          ) : (
            <div className="review-grid">
              {filteredCandidates.map((candidate) => (
                <RewardClaimCandidateCard
                  key={`${candidate.eventId}:${candidate.rewardTierId}:${candidate.studentId}`}
                  candidate={candidate}
                  locale={locale}
                />
              ))}
            </div>
          )}

          {selectedEvent !== null ? (
            <div className="stack-sm">
              <div className="eyebrow">{locale === "fi" ? "Seuranta" : "Progress"}</div>
              <h3 className="section-title">{locale === "fi" ? "Ei vielä lunastettavissa" : "Not claimable yet"}</h3>
              <p className="muted-text">
                {locale === "fi"
                  ? "Nämä opiskelijat ovat ilmoittautuneet, mutta heiltä puuttuu vielä leimoja tähän palkintotasoon. Luovutuspainike pysyy piilossa, kunnes raja täyttyy."
                  : "These registered students are still below this reward threshold. The handoff action stays hidden until the required leimas are collected."}
              </p>
              {filteredProgress.length === 0 ? (
                <article className="panel">
                  <p className="muted-text">{locale === "fi" ? "Tälle tapahtumalle ei ole kesken olevia palkintopolkuja näkyvissä." : "No in-progress reward rows are visible for this event."}</p>
                </article>
              ) : (
                <div className="panel-table-wrap">
                  <table className="panel-table">
                    <thead>
                      <tr>
                        <th>{locale === "fi" ? "Opiskelija" : "Student"}</th>
                        <th>{locale === "fi" ? "Palkinto" : "Reward"}</th>
                        <th>{locale === "fi" ? "Leimat" : "Leimas"}</th>
                        <th>{locale === "fi" ? "Puuttuu" : "Missing"}</th>
                        <th>{locale === "fi" ? "Tiedot" : "Details"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProgress.map((record) => (
                        <tr key={`${record.eventId}:${record.rewardTierId}:${record.studentId}`}>
                          <td>{record.studentLabel}</td>
                          <td>
                            <span>{record.rewardTitle}</span>
                            <span className="record-meta">{formatClubClaimRewardType(locale, record.rewardType)}</span>
                          </td>
                          <td className="record-meta">{formatClubClaimProgress(locale, record)}</td>
                          <td>
                            <span className="status-pill status-pill-warning">
                              {locale === "fi"
                                ? `${record.missingStampCount} puuttuu`
                                : `${record.missingStampCount} missing`}
                            </span>
                          </td>
                          <td className="record-meta">{formatClubClaimInventory(locale, record)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section className="stack-md" style={{ display: activeTab !== "recent-claims" ? "none" : undefined }}>
        <div className="stack-sm">
          <div className="eyebrow">{locale === "fi" ? "Historia" : "Recent history"}</div>
          <h3 className="section-title">{locale === "fi" ? "Jaetut palkinnot" : "Reward claims"}</h3>
          <p className="muted-text">
            {selectedEvent === null
              ? locale === "fi"
                ? "Tarkista valitulle tapahtumalle kirjatut viimeisimmät palkintoluovutukset."
                : "Review the latest reward handoffs recorded for the selected event."
              : locale === "fi"
                ? `Näytetään tapahtuman "${selectedEvent.name}" viimeisimmät palkintoluovutukset.`
                : `Showing recent reward handoffs for "${selectedEvent.name}".`}
          </p>
        </div>

        {selectedEvent === null || filteredRecentClaims.length === 0 ? (
          <article className="panel">
            <p className="muted-text">{locale === "fi" ? "Tälle tapahtumalle ei ole vielä näkyvissä viimeisimpiä lunastuksia." : "No recent reward claims are visible for this event yet."}</p>
          </article>
        ) : (
          <div className="panel-table-wrap">
            <table className="panel-table">
              <thead>
                <tr>
                  <th>{locale === "fi" ? "Opiskelija" : "Student"}</th>
                  <th>{locale === "fi" ? "Palkinto" : "Reward"}</th>
                  <th>{locale === "fi" ? "Tila" : "Status"}</th>
                  <th>{locale === "fi" ? "Tiedot" : "Details"}</th>
                  <th>{locale === "fi" ? "Muistiinpanot" : "Notes"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecentClaims.map((claim) => (
                  <tr key={claim.rewardClaimId}>
                    <td>{claim.studentLabel}</td>
                    <td className="record-meta">{claim.rewardTitle}</td>
                    <td>
                      <span className={getClubClaimStatusClassName(claim.status)}>{claim.status}</span>
                    </td>
                    <td className="record-meta">{formatClubClaimHistoryMeta(locale, claim)}</td>
                    <td className="record-meta">{claim.notes ?? "—"}</td>
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
