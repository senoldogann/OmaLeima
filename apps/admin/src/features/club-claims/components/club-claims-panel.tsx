"use client";

import { useMemo, useState } from "react";

import type { DashboardLocale } from "@/features/dashboard/i18n";
import { RewardClaimCandidateCard } from "@/features/club-claims/components/reward-claim-candidate-card";
import { RecentRewardClaimCard } from "@/features/club-claims/components/recent-reward-claim-card";
import { formatClubClaimEventMeta } from "@/features/club-claims/format";
import type { ClubClaimsSnapshot } from "@/features/club-claims/types";

type ClubClaimsPanelProps = {
  locale: DashboardLocale;
  snapshot: ClubClaimsSnapshot;
};

export const ClubClaimsPanel = ({ locale, snapshot }: ClubClaimsPanelProps) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(snapshot.events[0]?.eventId ?? "");
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
  const [activeTab, setActiveTab] = useState<"event-queue" | "recent-claims">("event-queue");

  return (
    <div className="stack-lg">
      <section className="metrics-grid">
        <article className="panel panel-accent">
          <div className="stack-sm">
            <span className="field-label">{locale === "fi" ? "Operatiiviset tapahtumat" : "Operational events"}</span>
            <strong className="metric-value">{snapshot.summary.operationalEventCount}</strong>
            <p className="muted-text">{locale === "fi" ? "Aktiiviset tai päättyneet tapahtumat, joissa klubi voi vahvistaa palkinnon luovutuksen." : "Active or completed events where club staff can confirm reward handoff."}</p>
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

        <article className="panel panel-warning">
          <div className="stack-sm">
            <span className="field-label">{locale === "fi" ? "Vastikään jaetut" : "Recent claims"}</span>
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
        <button className={activeTab === "event-queue" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("event-queue")} type="button">{locale === "fi" ? "Tapahtumajono" : "Event Queue"}</button>
        <button className={activeTab === "recent-claims" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("recent-claims")} type="button">{locale === "fi" ? "Vastikään jaetut" : "Recent Claims"}</button>
      </div>

      <section className="content-grid" style={{ display: activeTab !== "event-queue" ? "none" : undefined }}>
        <div className="stack-md">
          <div className="stack-sm">
            <div className="eyebrow">{locale === "fi" ? "Tapahtumajono" : "Event handoff queue"}</div>
            <h3 className="section-title">{locale === "fi" ? "Operatiiviset tapahtumat" : "Operational events"}</h3>
            <p className="muted-text">
              {locale === "fi"
                ? "Valitse tapahtuma tarkistaaksesi palkintoa odottavat opiskelijat ja viimeksi vahvistetut luovutukset. Opiskelijoiden tunnisteet pysyvät peitettyinä."
                : "Pick an event to review claimable students and recently confirmed rewards. Student labels stay masked in this panel."}
            </p>
          </div>

          {snapshot.events.length === 0 ? (
            <article className="panel">
              <p className="muted-text">{locale === "fi" ? "Aktiivisia tai päättyneitä klubitapahtumia ei ole nyt näkyvissä palkintoluovutusta varten." : "No active or completed club events are visible for reward handoff right now."}</p>
            </article>
          ) : (
            <div className="content-grid">
              {snapshot.events.map((event) => (
                <article key={event.eventId} className="panel review-card-compact">
                  <div className="stack-sm">
                    <p className="card-title">{event.name}</p>
                    <p className="muted-text">{formatClubClaimEventMeta(locale, event)}</p>
                    <p className="review-note">
                      {locale === "fi"
                        ? `${event.claimableCandidateCount} odottaa · ${event.recentClaimCount} jaettu · ${event.activeRewardTierCount} tasoa`
                        : `${event.claimableCandidateCount} claimable · ${event.recentClaimCount} claimed · ${event.activeRewardTierCount} active reward tier${event.activeRewardTierCount === 1 ? "" : "s"}`}
                    </p>
                    <div className="pagination-row">
                      <span className={event.eventStatus === "ACTIVE" ? "status-pill status-pill-success" : "status-pill"}>
                        {event.eventStatus}
                      </span>
                      <button
                        className="button button-secondary"
                        onClick={() => setSelectedEventId(event.eventId)}
                        type="button"
                      >
                        {effectiveSelectedEventId === event.eventId
                          ? locale === "fi" ? "Valittu" : "Selected"
                          : locale === "fi" ? "Avaa" : "Open queue"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
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
          </div>

          {selectedEvent === null ? (
            <article className="panel">
              <p className="muted-text">{locale === "fi" ? "Valitse operatiivinen tapahtuma tarkistaaksesi palkintoluovutuksen ehdokkaat." : "Select an operational event to inspect reward handoff candidates."}</p>
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
        </div>
      </section>

      <section className="stack-md" style={{ display: activeTab !== "recent-claims" ? "none" : undefined }}>
        <div className="stack-sm">
          <div className="eyebrow">{locale === "fi" ? "Historia" : "Recent history"}</div>
          <h3 className="section-title">{locale === "fi" ? "Jaetut palkinnot" : "Reward claims"}</h3>
          <p className="muted-text">{locale === "fi" ? "Tarkista valitulle tapahtumalle kirjatut viimeisimmät palkintoluovutukset." : "Review the latest reward handoffs recorded for the selected event."}</p>
        </div>

        {selectedEvent === null || filteredRecentClaims.length === 0 ? (
          <article className="panel">
            <p className="muted-text">{locale === "fi" ? "Tälle tapahtumalle ei ole vielä näkyvissä viimeisimpiä lunastuksia." : "No recent reward claims are visible for this event yet."}</p>
          </article>
        ) : (
          <div className="review-grid">
            {filteredRecentClaims.map((claim) => (
              <RecentRewardClaimCard key={claim.rewardClaimId} claim={claim} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
