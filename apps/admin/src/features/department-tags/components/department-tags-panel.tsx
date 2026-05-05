"use client";

import { useState } from "react";

import { ModeratedTagCard } from "@/features/department-tags/components/moderated-tag-card";
import { ModerationTagCard } from "@/features/department-tags/components/moderation-tag-card";
import type { DepartmentTagModerationSnapshot } from "@/features/department-tags/types";

type DepartmentTagsPanelProps = {
  snapshot: DepartmentTagModerationSnapshot;
};

export const DepartmentTagsPanel = ({ snapshot }: DepartmentTagsPanelProps) => {
  const [activeTab, setActiveTab] = useState<"moderation-queue" | "custom-tags" | "recent-outcomes">("moderation-queue");

  return (
    <div className="stack-lg">
      <section className="metrics-grid metrics-grid-quad">
        <article className="panel panel-warning">
          <div className="stack-sm">
            <span className="field-label">Pending review</span>
            <strong className="metric-value">{snapshot.summary.pendingCount}</strong>
            <p className="muted-text">Custom or official tag records still waiting for a moderation decision.</p>
          </div>
        </article>

        <article className="panel panel-accent">
          <div className="stack-sm">
            <span className="field-label">Active custom tags</span>
            <strong className="metric-value">{snapshot.summary.activeCustomCount}</strong>
            <p className="muted-text">User-created active tags that may still need canonical cleanup.</p>
          </div>
        </article>

        <article className="panel">
          <div className="stack-sm">
            <span className="field-label">Canonical targets</span>
            <strong className="metric-value">{snapshot.summary.activeTargetCount}</strong>
            <p className="muted-text">Active, unmerged department tags available as merge destinations.</p>
          </div>
        </article>

        <article className="panel">
          <div className="stack-sm">
            <span className="field-label">Recently moderated</span>
            <strong className="metric-value">{snapshot.summary.recentlyModeratedCount}</strong>
            <p className="muted-text">Merged or blocked tags visible in the latest moderation surface.</p>
          </div>
        </article>
      </section>

      <div className="tab-nav">
        <button className={activeTab === "moderation-queue" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("moderation-queue")} type="button">Moderation Queue</button>
        <button className={activeTab === "custom-tags" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("custom-tags")} type="button">Custom Tags</button>
        <button className={activeTab === "recent-outcomes" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("recent-outcomes")} type="button">Recent Outcomes</button>
      </div>

      <section className="content-grid" style={{ display: activeTab === "recent-outcomes" ? "none" : undefined }}>
        <div className="stack-md" style={activeTab === "moderation-queue" ? { gridColumn: "1 / -1" } : { display: "none" }}>
          <div className="stack-sm">
            <div className="eyebrow">Moderation queue</div>
            <h3 className="section-title">Pending department tags</h3>
            <p className="muted-text">
              {snapshot.summary.pendingCount === 0
                ? "No pending tags are waiting right now."
                : `Showing the oldest ${Math.min(snapshot.summary.pendingCount, snapshot.summary.pendingLimit)} of ${snapshot.summary.pendingCount} pending tags.`}
            </p>
          </div>

          {snapshot.pendingTags.length === 0 ? (
            <article className="panel">
              <p className="muted-text">The pending moderation queue is clear.</p>
            </article>
          ) : (
            <div className="review-grid">
              {snapshot.pendingTags.map((tag) => (
                <ModerationTagCard key={tag.id} mergeTargets={snapshot.mergeTargets} tag={tag} />
              ))}
            </div>
          )}
        </div>

        <div className="stack-md" style={activeTab === "custom-tags" ? { gridColumn: "1 / -1" } : { display: "none" }}>
          <div className="stack-sm">
            <div className="eyebrow">Custom cleanup</div>
            <h3 className="section-title">Active user-created tags</h3>
            <p className="muted-text">
              {snapshot.summary.activeCustomCount === 0
                ? "No active custom tags need cleanup right now."
                : `Showing the latest ${Math.min(snapshot.summary.activeCustomCount, snapshot.summary.userTagLimit)} of ${snapshot.summary.activeCustomCount} active custom tags.`}
            </p>
          </div>

          {snapshot.activeCustomTags.length === 0 ? (
            <article className="panel">
              <p className="muted-text">No active custom tags are visible right now.</p>
            </article>
          ) : (
            <div className="review-grid">
              {snapshot.activeCustomTags.map((tag) => (
                <ModerationTagCard key={tag.id} mergeTargets={snapshot.mergeTargets} tag={tag} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="stack-md" style={{ display: activeTab !== "recent-outcomes" ? "none" : undefined }}>
        <div className="stack-sm">
          <div className="eyebrow">Recent outcomes</div>
          <h3 className="section-title">Latest merged or blocked tags</h3>
          <p className="muted-text">
            Showing the latest {snapshot.summary.recentLimit} merged or blocked tag decisions across the platform.
          </p>
        </div>

        {snapshot.recentlyModeratedTags.length === 0 ? (
          <article className="panel">
            <p className="section-title">No recent moderation</p>
            <p className="muted-text">Merged and blocked tags will appear here after the first moderation action.</p>
          </article>
        ) : (
          <div className="content-grid">
            {snapshot.recentlyModeratedTags.map((tag) => (
              <ModeratedTagCard key={tag.id} tag={tag} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
