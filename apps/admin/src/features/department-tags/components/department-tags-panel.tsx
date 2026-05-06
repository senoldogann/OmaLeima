"use client";

import { useState } from "react";

import { ModeratedTagCard } from "@/features/department-tags/components/moderated-tag-card";
import { ModerationTagCard } from "@/features/department-tags/components/moderation-tag-card";
import type { DepartmentTagModerationSnapshot } from "@/features/department-tags/types";
import type { DashboardLocale } from "@/features/dashboard/i18n";

type DepartmentTagsPanelProps = {
  locale: DashboardLocale;
  snapshot: DepartmentTagModerationSnapshot;
};

export const DepartmentTagsPanel = ({ locale, snapshot }: DepartmentTagsPanelProps) => {
  const [activeTab, setActiveTab] = useState<"moderation-queue" | "custom-tags" | "recent-outcomes">("moderation-queue");

  return (
    <div className="stack-lg">
      <section className="metrics-grid metrics-grid-quad">
        <article className="panel panel-warning">
          <div className="stack-sm">
            <span className="field-label">{locale === "fi" ? "Odottaa tarkistusta" : "Pending review"}</span>
            <strong className="metric-value">{snapshot.summary.pendingCount}</strong>
            <p className="muted-text">
              {locale === "fi"
                ? "Omat tai viralliset tagit, jotka odottavat viela moderointipaatosta."
                : "Custom or official tag records still waiting for a moderation decision."}
            </p>
          </div>
        </article>

        <article className="panel panel-accent">
          <div className="stack-sm">
            <span className="field-label">{locale === "fi" ? "Aktiiviset omat tagit" : "Active custom tags"}</span>
            <strong className="metric-value">{snapshot.summary.activeCustomCount}</strong>
            <p className="muted-text">
              {locale === "fi"
                ? "Kayttajien luomat aktiiviset tagit, jotka voivat viela tarvita kanonista siivousta."
                : "User-created active tags that may still need canonical cleanup."}
            </p>
          </div>
        </article>

        <article className="panel">
          <div className="stack-sm">
            <span className="field-label">{locale === "fi" ? "Kanoniset kohteet" : "Canonical targets"}</span>
            <strong className="metric-value">{snapshot.summary.activeTargetCount}</strong>
            <p className="muted-text">
              {locale === "fi"
                ? "Aktiiviset, yhdistamattomat tagit joita voi kayttaa yhdistamiskohteina."
                : "Active, unmerged department tags available as merge destinations."}
            </p>
          </div>
        </article>

        <article className="panel">
          <div className="stack-sm">
            <span className="field-label">{locale === "fi" ? "Viimeksi moderoitu" : "Recently moderated"}</span>
            <strong className="metric-value">{snapshot.summary.recentlyModeratedCount}</strong>
            <p className="muted-text">
              {locale === "fi"
                ? "Viimeisimmassa moderointinakyamassa nakyvat yhdistetyt tai estetyt tagit."
                : "Merged or blocked tags visible in the latest moderation surface."}
            </p>
          </div>
        </article>
      </section>

      <div className="tab-nav">
        <button className={activeTab === "moderation-queue" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("moderation-queue")} type="button">{locale === "fi" ? "Moderointijono" : "Moderation Queue"}</button>
        <button className={activeTab === "custom-tags" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("custom-tags")} type="button">{locale === "fi" ? "Omat tagit" : "Custom Tags"}</button>
        <button className={activeTab === "recent-outcomes" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("recent-outcomes")} type="button">{locale === "fi" ? "Viimeisimmat paatokset" : "Recent Outcomes"}</button>
      </div>

      <section className="content-grid" style={{ display: activeTab === "recent-outcomes" ? "none" : undefined }}>
        <div className="stack-md" style={activeTab === "moderation-queue" ? { gridColumn: "1 / -1" } : { display: "none" }}>
          <div className="stack-sm">
            <div className="eyebrow">{locale === "fi" ? "Moderointijono" : "Moderation queue"}</div>
            <h3 className="section-title">{locale === "fi" ? "Odottavat tagit" : "Pending department tags"}</h3>
            <p className="muted-text">
              {snapshot.summary.pendingCount === 0
                ? locale === "fi"
                  ? "Yhtaan odottavaa tagia ei ole juuri nyt."
                  : "No pending tags are waiting right now."
                : locale === "fi"
                  ? `Naytetaan vanhimmat ${Math.min(snapshot.summary.pendingCount, snapshot.summary.pendingLimit)} / ${snapshot.summary.pendingCount} odottavasta tagista.`
                  : `Showing the oldest ${Math.min(snapshot.summary.pendingCount, snapshot.summary.pendingLimit)} of ${snapshot.summary.pendingCount} pending tags.`}
            </p>
          </div>

          {snapshot.pendingTags.length === 0 ? (
            <article className="panel">
              <p className="muted-text">{locale === "fi" ? "Moderointijono on tyhja." : "The pending moderation queue is clear."}</p>
            </article>
          ) : (
            <div className="review-grid">
              {snapshot.pendingTags.map((tag) => (
                <ModerationTagCard key={tag.id} locale={locale} mergeTargets={snapshot.mergeTargets} tag={tag} />
              ))}
            </div>
          )}
        </div>

        <div className="stack-md" style={activeTab === "custom-tags" ? { gridColumn: "1 / -1" } : { display: "none" }}>
          <div className="stack-sm">
            <div className="eyebrow">{locale === "fi" ? "Oman datan siivous" : "Custom cleanup"}</div>
            <h3 className="section-title">{locale === "fi" ? "Aktiiviset kayttajatagit" : "Active user-created tags"}</h3>
            <p className="muted-text">
              {snapshot.summary.activeCustomCount === 0
                ? locale === "fi"
                  ? "Yksikaan aktiivinen oma tagi ei tarvitse siivousta juuri nyt."
                  : "No active custom tags need cleanup right now."
                : locale === "fi"
                  ? `Naytetaan uusimmat ${Math.min(snapshot.summary.activeCustomCount, snapshot.summary.userTagLimit)} / ${snapshot.summary.activeCustomCount} aktiivisesta omasta tagista.`
                  : `Showing the latest ${Math.min(snapshot.summary.activeCustomCount, snapshot.summary.userTagLimit)} of ${snapshot.summary.activeCustomCount} active custom tags.`}
            </p>
          </div>

          {snapshot.activeCustomTags.length === 0 ? (
            <article className="panel">
              <p className="muted-text">{locale === "fi" ? "Aktiivisia omia tageja ei nay juuri nyt." : "No active custom tags are visible right now."}</p>
            </article>
          ) : (
            <div className="review-grid">
              {snapshot.activeCustomTags.map((tag) => (
                <ModerationTagCard key={tag.id} locale={locale} mergeTargets={snapshot.mergeTargets} tag={tag} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="stack-md" style={{ display: activeTab !== "recent-outcomes" ? "none" : undefined }}>
        <div className="stack-sm">
          <div className="eyebrow">{locale === "fi" ? "Viimeisimmat paatokset" : "Recent outcomes"}</div>
          <h3 className="section-title">{locale === "fi" ? "Viimeksi yhdistetyt tai estetyt tagit" : "Latest merged or blocked tags"}</h3>
          <p className="muted-text">
            {locale === "fi"
              ? `Naytetaan viimeisimmat ${snapshot.summary.recentLimit} yhdistettya tai estettya paatosta koko alustalta.`
              : `Showing the latest ${snapshot.summary.recentLimit} merged or blocked tag decisions across the platform.`}
          </p>
        </div>

        {snapshot.recentlyModeratedTags.length === 0 ? (
          <article className="panel">
            <p className="section-title">{locale === "fi" ? "Ei viimeaikaista moderointia" : "No recent moderation"}</p>
            <p className="muted-text">
              {locale === "fi"
                ? "Yhdistetyt ja estetyt tagit tulevat tahan ensimmaisen moderointitoimen jalkeen."
                : "Merged and blocked tags will appear here after the first moderation action."}
            </p>
          </article>
        ) : (
          <div className="content-grid">
            {snapshot.recentlyModeratedTags.map((tag) => (
              <ModeratedTagCard key={tag.id} locale={locale} tag={tag} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
