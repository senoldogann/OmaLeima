"use client";

import { useMemo, useState } from "react";

import { RewardClaimCandidateCard } from "@/features/club-claims/components/reward-claim-candidate-card";
import { RecentRewardClaimCard } from "@/features/club-claims/components/recent-reward-claim-card";
import { formatClubClaimEventMeta } from "@/features/club-claims/format";
import type { ClubClaimsSnapshot } from "@/features/club-claims/types";

type ClubClaimsPanelProps = {
  snapshot: ClubClaimsSnapshot;
};

export const ClubClaimsPanel = ({ snapshot }: ClubClaimsPanelProps) => {
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

  return (
    <div className="stack-lg">
      <section className="metrics-grid">
        <article className="panel panel-accent">
          <div className="stack-sm">
            <span className="field-label">Operational events</span>
            <strong className="metric-value">{snapshot.summary.operationalEventCount}</strong>
            <p className="muted-text">Active or completed events where club staff can confirm reward handoff.</p>
          </div>
        </article>

        <article className="panel">
          <div className="stack-sm">
            <span className="field-label">Claimable candidates</span>
            <strong className="metric-value">{snapshot.summary.claimableCandidateCount}</strong>
            <p className="muted-text">
              Showing the latest {snapshot.summary.visibleCandidateCount} candidate{snapshot.summary.visibleCandidateCount === 1 ? "" : "s"} across visible events.
            </p>
          </div>
        </article>

        <article className="panel panel-warning">
          <div className="stack-sm">
            <span className="field-label">Recent claims</span>
            <strong className="metric-value">{snapshot.summary.recentClaimCount}</strong>
            <p className="muted-text">
              Showing the latest {snapshot.summary.visibleClaimCount} recorded reward claim{snapshot.summary.visibleClaimCount === 1 ? "" : "s"}.
            </p>
          </div>
        </article>
      </section>

      <section className="content-grid">
        <div className="stack-md">
          <div className="stack-sm">
            <div className="eyebrow">Event handoff queue</div>
            <h3 className="section-title">Operational events</h3>
            <p className="muted-text">
              Pick an event to review claimable students and recently confirmed rewards. Student labels stay masked in this panel.
            </p>
          </div>

          {snapshot.events.length === 0 ? (
            <article className="panel">
              <p className="muted-text">No active or completed club events are visible for reward handoff right now.</p>
            </article>
          ) : (
            <div className="content-grid">
              {snapshot.events.map((event) => (
                <article key={event.eventId} className="panel review-card-compact">
                  <div className="stack-sm">
                    <h3 className="section-title">{event.name}</h3>
                    <p className="muted-text">{formatClubClaimEventMeta(event)}</p>
                    <p className="review-note">
                      {event.claimableCandidateCount} claimable · {event.recentClaimCount} claimed · {event.activeRewardTierCount} active reward tier{event.activeRewardTierCount === 1 ? "" : "s"}
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
                        {effectiveSelectedEventId === event.eventId ? "Selected" : "Open queue"}
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
            <div className="eyebrow">Selected event</div>
            <h3 className="section-title">{selectedEvent?.name ?? "No event selected"}</h3>
            <p className="muted-text">
              Confirm reward handoff only after the physical item is actually delivered to the student.
            </p>
          </div>

          {selectedEvent === null ? (
            <article className="panel">
              <p className="muted-text">Select an operational event to inspect reward handoff candidates.</p>
            </article>
          ) : filteredCandidates.length === 0 ? (
            <article className="panel">
              <p className="muted-text">No claimable students are visible for this event right now.</p>
            </article>
          ) : (
            <div className="review-grid">
              {filteredCandidates.map((candidate) => (
                <RewardClaimCandidateCard
                  key={`${candidate.eventId}:${candidate.rewardTierId}:${candidate.studentId}`}
                  candidate={candidate}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="stack-md">
        <div className="stack-sm">
          <div className="eyebrow">Recent history</div>
          <h3 className="section-title">Reward claims</h3>
          <p className="muted-text">Review the latest reward handoffs recorded for the selected event.</p>
        </div>

        {selectedEvent === null || filteredRecentClaims.length === 0 ? (
          <article className="panel">
            <p className="muted-text">No recent reward claims are visible for this event yet.</p>
          </article>
        ) : (
          <div className="review-grid">
            {filteredRecentClaims.map((claim) => (
              <RecentRewardClaimCard key={claim.rewardClaimId} claim={claim} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
