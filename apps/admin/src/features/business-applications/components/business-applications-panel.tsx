"use client";

import Link from "next/link";
import { useState } from "react";

import { formatBusinessApplicationDateTime } from "@/features/business-applications/format";
import type { BusinessApplicationsReviewQueue } from "@/features/business-applications/types";
import { PendingApplicationReviewCard } from "@/features/business-applications/components/pending-application-review-card";
import { ReviewedApplicationCard } from "@/features/business-applications/components/reviewed-application-card";
import type { DashboardLocale } from "@/features/dashboard/i18n";

type BusinessApplicationsPanelProps = {
  locale: DashboardLocale;
  reviewQueue: BusinessApplicationsReviewQueue;
};

const copyByLocale = {
  en: {
    decisionsTab: "Decisions",
    emptyDecisionsBody: "Approved and rejected applications will appear here after the first review action.",
    emptyDecisionsTitle: "No recent decisions",
    emptyQueueBody: "The queue is clear right now. New submissions will appear here as soon as they are created.",
    emptyQueueTitle: "No pending applications",
    firstStepBody: "Venue details arrive as a pending application with contact, location, website, Instagram, and operator notes.",
    firstStepTitle: "1. Intake",
    flowBody: "Applications are rows in the `business_applications` table. Admin approval calls the backend review function, creates the business profile once, links the original application, and records the decision in audit logs.",
    flowEyebrow: "How this queue works",
    flowTitle: "Business onboarding flow",
    handoffBody: "After approval, create or reuse operator users from the pilot bootstrap script, assign business memberships, deliver scanner credentials privately, and ask the venue to change any temporary password before event day.",
    handoffEyebrow: "Account handoff",
    handoffTitle: "How businesses and scanner accounts are delivered",
    latestDecisionsBody: "Keep an eye on the latest approvals and rejections without leaving the admin area.",
    latestDecisionsEyebrow: "Recent review activity",
    latestDecisionsTitle: "Latest decisions",
    metricOldestBody: "Oldest application currently visible in the review queue.",
    metricOldestLabel: "Oldest pending",
    metricPendingBody: "Applications still waiting for an admin decision.",
    metricPendingLabel: "Pending queue",
    metricRecentBody: "Most recent approved or rejected applications shown below.",
    metricRecentLabel: "Recent decisions",
    nextPage: "Next page",
    noLaterPages: "No later pages",
    pageLabel: "Page",
    pendingTab: "Pending Queue",
    previousPage: "Previous page",
    queueBeginning: "At the beginning of the queue",
    queueBody: "Approve valid venues or reject them with a clear operator-facing reason.",
    queueEyebrow: "Review queue",
    queueTitle: "Pending business applications",
    rejectStepBody: "Low-quality or unverifiable submissions stay out of the business catalog and keep a clear rejection reason.",
    rejectStepTitle: "3. Reject",
    secondStepBody: "A valid venue becomes a business profile through the atomic approval flow; duplicates are rejected by the backend.",
    secondStepTitle: "2. Approve",
    showingEmpty: "Showing 0 of 0.",
    showingPrefix: "Showing",
    showingSeparator: "of",
  },
  fi: {
    decisionsTab: "Päätökset",
    emptyDecisionsBody: "Hyväksytyt ja hylätyt hakemukset näkyvät täällä ensimmäisen päätöksen jälkeen.",
    emptyDecisionsTitle: "Ei viimeaikaisia päätöksiä",
    emptyQueueBody: "Jono on tällä hetkellä tyhjä. Uudet hakemukset ilmestyvät tänne heti kun ne luodaan.",
    emptyQueueTitle: "Ei avoimia hakemuksia",
    firstStepBody: "Paikan tiedot tulevat avoimena hakemuksena: yhteyshenkilö, sijainti, verkkosivu, Instagram ja operaattorin muistiinpanot.",
    firstStepTitle: "1. Vastaanotto",
    flowBody: "Hakemukset ovat rivejä `business_applications`-taulussa. Admin-hyväksyntä kutsuu backendin tarkistusfunktiota, luo yritysprofiilin vain kerran, linkittää alkuperäisen hakemuksen ja kirjaa päätöksen audit-lokeihin.",
    flowEyebrow: "Näin jono toimii",
    flowTitle: "Yrityksen onboarding-polku",
    handoffBody: "Hyväksynnän jälkeen luo tai käytä operaattoritunnuksia pilotin bootstrap-scriptillä, liitä käyttäjät yrityksen jäseniksi, toimita scanner-tunnukset yksityisesti ja pyydä paikkaa vaihtamaan mahdollinen väliaikainen salasana ennen tapahtumaa.",
    handoffEyebrow: "Tunnusten toimitus",
    handoffTitle: "Miten yritys- ja scanner-tilit toimitetaan",
    latestDecisionsBody: "Seuraa viimeisimpiä hyväksyntöjä ja hylkäyksiä poistumatta admin-alueelta.",
    latestDecisionsEyebrow: "Viimeisin tarkistusaktiviteetti",
    latestDecisionsTitle: "Viimeisimmät päätökset",
    metricOldestBody: "Vanhin hakemus, joka näkyy tällä hetkellä tarkistusjonossa.",
    metricOldestLabel: "Vanhin avoin",
    metricPendingBody: "Hakemukset, jotka odottavat vielä admin-päätöstä.",
    metricPendingLabel: "Avoin jono",
    metricRecentBody: "Alla näkyvät viimeisimmät hyväksytyt tai hylätyt hakemukset.",
    metricRecentLabel: "Viime päätökset",
    nextPage: "Seuraava sivu",
    noLaterPages: "Ei myöhempiä sivuja",
    pageLabel: "Sivu",
    pendingTab: "Avoin jono",
    previousPage: "Edellinen sivu",
    queueBeginning: "Olet jonon alussa",
    queueBody: "Hyväksy oikeat paikat tai hylkää ne selkeällä operaattorille näkyvällä syyllä.",
    queueEyebrow: "Tarkistusjono",
    queueTitle: "Avoimet yrityshakemukset",
    rejectStepBody: "Heikkolaatuiset tai varmistamattomat hakemukset eivät pääse yrityskatalogiin ja säilyttävät selkeän hylkäyssyyn.",
    rejectStepTitle: "3. Hylkäys",
    secondStepBody: "Kelvollinen paikka muuttuu yritysprofiiliksi atomisen hyväksyntävirran kautta; backend estää duplikaatit.",
    secondStepTitle: "2. Hyväksyntä",
    showingEmpty: "Näytetään 0 / 0.",
    showingPrefix: "Näytetään",
    showingSeparator: "/",
  },
} as const satisfies Record<DashboardLocale, Record<string, string>>;

const buildPageHref = (pageNumber: number): string => {
  if (pageNumber <= 1) {
    return "/admin/business-applications";
  }

  return `/admin/business-applications?page=${pageNumber}`;
};

export const BusinessApplicationsPanel = ({ locale, reviewQueue }: BusinessApplicationsPanelProps) => {
  const [activeTab, setActiveTab] = useState<"pending-queue" | "decisions">("pending-queue");
  const copy = copyByLocale[locale];

  return (
    <div className="stack-lg">
      <section className="metrics-grid">
        <article className="panel panel-accent">
          <div className="stack-sm">
            <span className="field-label">{copy.metricPendingLabel}</span>
            <strong className="metric-value">{reviewQueue.summary.pendingCount}</strong>
            <p className="muted-text">{copy.metricPendingBody}</p>
          </div>
        </article>

        <article className="panel">
          <div className="stack-sm">
            <span className="field-label">{copy.metricOldestLabel}</span>
            <strong className="metric-value">
              {formatBusinessApplicationDateTime(reviewQueue.summary.oldestPendingCreatedAt)}
            </strong>
            <p className="muted-text">{copy.metricOldestBody}</p>
          </div>
        </article>

        <article className="panel panel-warning">
          <div className="stack-sm">
            <span className="field-label">{copy.metricRecentLabel}</span>
            <strong className="metric-value">{reviewQueue.summary.recentlyReviewedCount}</strong>
            <p className="muted-text">{copy.metricRecentBody}</p>
          </div>
        </article>
      </section>

      <div className="tab-nav">
        <button className={activeTab === "pending-queue" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("pending-queue")} type="button">{copy.pendingTab}</button>
        <button className={activeTab === "decisions" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("decisions")} type="button">{copy.decisionsTab}</button>
      </div>

      <section className="info-callout stack-sm">
        <div className="eyebrow">{copy.flowEyebrow}</div>
        <p className="info-callout-title">{copy.flowTitle}</p>
        <p className="muted-text">{copy.flowBody}</p>
        <div className="content-grid">
          <div className="stack-sm">
            <span className="status-pill">{copy.firstStepTitle}</span>
            <p className="muted-text">{copy.firstStepBody}</p>
          </div>
          <div className="stack-sm">
            <span className="status-pill status-pill-success">{copy.secondStepTitle}</span>
            <p className="muted-text">{copy.secondStepBody}</p>
          </div>
          <div className="stack-sm">
            <span className="status-pill status-pill-danger">{copy.rejectStepTitle}</span>
            <p className="muted-text">{copy.rejectStepBody}</p>
          </div>
        </div>
      </section>

      <div className="info-callout info-callout-accent">
        <div className="eyebrow">{copy.handoffEyebrow}</div>
        <p className="info-callout-title">{copy.handoffTitle}</p>
        <p className="muted-text">{copy.handoffBody}</p>
      </div>

      <section className="stack-md" style={{ display: activeTab !== "pending-queue" ? "none" : undefined }}>
        <div className="stack-sm">
          <div className="eyebrow">{copy.queueEyebrow}</div>
          <h3 className="section-title">{copy.queueTitle}</h3>
          <p className="muted-text">
            {copy.queueBody}{" "}
            {reviewQueue.summary.pendingCount === 0
              ? copy.showingEmpty
              : `${copy.showingPrefix} ${reviewQueue.summary.pendingVisibleStart}-${reviewQueue.summary.pendingVisibleEnd} ${copy.showingSeparator} ${reviewQueue.summary.pendingCount}.`}
          </p>
        </div>

        {reviewQueue.pendingApplications.length === 0 ? (
          <article className="panel">
            <p className="section-title">{copy.emptyQueueTitle}</p>
            <p className="muted-text">{copy.emptyQueueBody}</p>
          </article>
        ) : (
          <div className="review-grid">
            {reviewQueue.pendingApplications.map((application) => (
              <PendingApplicationReviewCard key={application.id} application={application} />
            ))}
          </div>
        )}

        {reviewQueue.summary.pendingPageCount > 1 ? (
          <div className="pagination-row">
            {reviewQueue.summary.hasPreviousPage ? (
              <Link className="button button-secondary" href={buildPageHref(reviewQueue.summary.currentPage - 1)}>
                {copy.previousPage}
              </Link>
            ) : (
              <span className="muted-text">{copy.queueBeginning}</span>
            )}

            <span className="status-pill">
              {copy.pageLabel} {reviewQueue.summary.currentPage} {copy.showingSeparator} {reviewQueue.summary.pendingPageCount}
            </span>

            {reviewQueue.summary.hasNextPage ? (
              <Link className="button button-secondary" href={buildPageHref(reviewQueue.summary.currentPage + 1)}>
                {copy.nextPage}
              </Link>
            ) : (
              <span className="muted-text">{copy.noLaterPages}</span>
            )}
          </div>
        ) : null}
      </section>

      <section className="stack-md" style={{ display: activeTab !== "decisions" ? "none" : undefined }}>
        <div className="stack-sm">
          <div className="eyebrow">{copy.latestDecisionsEyebrow}</div>
          <h3 className="section-title">{copy.latestDecisionsTitle}</h3>
          <p className="muted-text">{copy.latestDecisionsBody}</p>
        </div>

        {reviewQueue.recentlyReviewedApplications.length === 0 ? (
          <article className="panel">
            <p className="section-title">{copy.emptyDecisionsTitle}</p>
            <p className="muted-text">{copy.emptyDecisionsBody}</p>
          </article>
        ) : (
          <div className="content-grid">
            {reviewQueue.recentlyReviewedApplications.map((application) => (
              <ReviewedApplicationCard key={application.id} application={application} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
