import { formatOversightClubMeta, formatOversightDateTime, formatOversightEventMeta } from "@/features/oversight/format";
import type { AdminOversightSnapshot } from "@/features/oversight/types";
import { FraudSignalReviewList } from "@/features/fraud-review/components/fraud-signal-review-list";

type OversightPanelProps = {
  snapshot: AdminOversightSnapshot;
};

const withFallback = (value: string, fallback: string): string => (value.length > 0 ? value : fallback);

const renderMetadataLine = (value: string | null) => {
  if (value === null) {
    return null;
  }

  return <p className="record-note">{value}</p>;
};

export const OversightPanel = ({ snapshot }: OversightPanelProps) => (
  <div className="stack-lg">
    <section className="metrics-grid metrics-grid-quad">
      <article className="panel panel-accent">
        <div className="stack-sm">
          <span className="field-label">Active clubs</span>
          <strong className="metric-value">{snapshot.summary.activeClubCount}</strong>
          <p className="muted-text">Platform-wide active clubs visible to system admins.</p>
        </div>
      </article>

      <article className="panel">
        <div className="stack-sm">
          <span className="field-label">Operational events</span>
          <strong className="metric-value">{snapshot.summary.operationalEventCount}</strong>
          <p className="muted-text">Draft, published, or active events that are still operationally relevant.</p>
        </div>
      </article>

      <article className="panel panel-warning">
        <div className="stack-sm">
          <span className="field-label">Open fraud signals</span>
          <strong className="metric-value">{snapshot.summary.openFraudSignalCount}</strong>
          <p className="muted-text">Signals still waiting for an explicit review or confirmation path.</p>
        </div>
      </article>

      <article className="panel">
        <div className="stack-sm">
          <span className="field-label">Audit logs in 24h</span>
          <strong className="metric-value">{snapshot.summary.recentAuditCount}</strong>
          <p className="muted-text">Recent system-side actions captured in the admin-visible audit trail.</p>
        </div>
      </article>
    </section>

    <section className="content-grid">
      <article className="panel">
        <div className="stack-sm">
          <div className="eyebrow">Catalog health</div>
          <h3 className="section-title">Latest clubs</h3>
          <p className="muted-text">Showing the latest {snapshot.summary.latestClubLimit} clubs by creation time.</p>
        </div>

        {snapshot.clubs.length === 0 ? (
          <p className="muted-text">No clubs are visible right now.</p>
        ) : (
          <ul className="record-list">
            {snapshot.clubs.map((club) => (
              <li key={club.id} className="record-item">
                <div className="record-main">
                  <p className="record-title">{club.name}</p>
                  <p className="record-meta">
                    {withFallback(formatOversightClubMeta(club.city, club.universityName), "No city or university label")}
                  </p>
                  <p className="record-note">
                    {club.contactEmail ?? "No contact email"} · Created {formatOversightDateTime(club.createdAt)}
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
          <div className="eyebrow">Event operations</div>
          <h3 className="section-title">Operational events</h3>
          <p className="muted-text">Showing the next {snapshot.summary.latestEventLimit} upcoming or currently active events that still matter operationally.</p>
        </div>

        {snapshot.events.length === 0 ? (
          <p className="muted-text">No operational events are visible right now.</p>
        ) : (
          <ul className="record-list">
            {snapshot.events.map((event) => (
              <li key={event.id} className="record-item">
                <div className="record-main">
                  <p className="record-title">{event.name}</p>
                  <p className="record-meta">{formatOversightEventMeta(event.clubName, event.city, event.visibility)}</p>
                  <p className="record-note">
                    {formatOversightDateTime(event.startAt)} to {formatOversightDateTime(event.endAt)}
                  </p>
                </div>
                <span className="status-pill">{event.status}</span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>

    <section className="content-grid">
      <article className="panel panel-warning">
        <div className="stack-sm">
          <div className="eyebrow">Integrity</div>
          <h3 className="section-title">Latest open fraud signals</h3>
          <p className="muted-text">Showing the latest {snapshot.summary.latestFraudLimit} fraud signals that still need operator attention.</p>
        </div>

        <FraudSignalReviewList
          emptyText="No fraud signals are visible right now."
          signals={snapshot.fraudSignals}
        />
      </article>

      <article className="panel">
        <div className="stack-sm">
          <div className="eyebrow">Traceability</div>
          <h3 className="section-title">Latest audit logs</h3>
          <p className="muted-text">Showing the latest {snapshot.summary.latestAuditLimit} audit entries recorded by the backend.</p>
        </div>

        {snapshot.auditLogs.length === 0 ? (
          <p className="muted-text">No audit logs are visible right now.</p>
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
                      "No actor or resource details"
                    )}
                  </p>
                  {renderMetadataLine(log.metadataSummary)}
                  <p className="record-note">Created {formatOversightDateTime(log.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  </div>
);
