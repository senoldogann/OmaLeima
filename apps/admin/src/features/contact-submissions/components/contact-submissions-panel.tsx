"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { DashboardLocale } from "@/features/dashboard/i18n";
import { paginateItems } from "@/features/shared/pagination";
import { PaginationControls, type PaginationControlsCopy } from "@/features/shared/pagination-controls";
import { createClient } from "@/lib/supabase/client";
import type {
  ContactSubmissionRecord,
  ContactSubmissionStatus,
  ContactSubmissionSubject,
  ContactSubmissionsSnapshot,
} from "@/features/contact-submissions/types";

type ContactSubmissionsPanelProps = {
  locale: DashboardLocale;
  snapshot: ContactSubmissionsSnapshot;
};

type StatusFilter = "all" | ContactSubmissionStatus;

const subjectLabelsByLocale: Record<DashboardLocale, Record<ContactSubmissionSubject, string>> = {
  en: {
    business_signup: "Business sign-up",
    collaboration: "Collaboration",
    pilot: "Pilot / test",
    press: "Press",
    other: "Other",
  },
  fi: {
    business_signup: "Yrityshakemus",
    collaboration: "Yhteistyö",
    pilot: "Pilotti / testi",
    press: "Media",
    other: "Muu",
  },
};

const statusLabelsByLocale: Record<DashboardLocale, Record<ContactSubmissionStatus, string>> = {
  en: {
    new: "New",
    in_review: "In review",
    closed: "Closed",
    spam: "Spam",
  },
  fi: {
    new: "Uusi",
    in_review: "Käsittelyssä",
    closed: "Suljettu",
    spam: "Roska",
  },
};

const statusOrder: ContactSubmissionStatus[] = ["new", "in_review", "closed", "spam"];

type ContactSubmissionsCopy = PaginationControlsCopy & {
  attachment: string;
  all: string;
  detailEmpty: string;
  email: string;
  empty: string;
  language: string;
  message: string;
  noOrganization: string;
  openAttachment: string;
  organization: string;
  refresh: string;
  refreshing: string;
  searchPlaceholder: string;
  status: string;
  statusUpdateFailed: string;
  submissionCounters: string;
  subject: string;
};

const contactSubmissionsPageSize = 12;

const copyByLocale: Record<DashboardLocale, ContactSubmissionsCopy> = {
  en: {
    attachment: "Attachment",
    all: "All",
    detailEmpty: "Select a submission to review its details.",
    email: "Email",
    empty: "No submissions match this filter.",
    language: "Language",
    message: "Message",
    next: "Next",
    noOrganization: "No organization",
    of: "of",
    openAttachment: "Open file in a new tab",
    organization: "Organization",
    page: "Page",
    previous: "Previous",
    refresh: "Refresh",
    refreshing: "Refreshing...",
    searchPlaceholder: "Search: name, email, organization, message",
    showing: "Showing",
    status: "Status",
    statusUpdateFailed: "Could not update status",
    submissionCounters: "Submission counters",
    subject: "Subject",
  },
  fi: {
    attachment: "Liite",
    all: "Kaikki",
    detailEmpty: "Valitse hakemus nähdäksesi tarkemmat tiedot.",
    email: "Sähköposti",
    empty: "Tällä suodattimella ei löydy viestejä.",
    language: "Kieli",
    message: "Viesti",
    next: "Seuraava",
    noOrganization: "Ei organisaatiota",
    of: "/",
    openAttachment: "Avaa tiedosto uudessa välilehdessä",
    organization: "Organisaatio",
    page: "Sivu",
    previous: "Edellinen",
    refresh: "Päivitä",
    refreshing: "Päivitetään\u2026",
    searchPlaceholder: "Hae: nimi, sähköposti, organisaatio, viesti",
    showing: "Näytetään",
    status: "Tila",
    statusUpdateFailed: "Tilan päivitys epäonnistui",
    submissionCounters: "Yhteydenotot yhteensä",
    subject: "Aihe",
  },
};

const formatDateTime = (locale: DashboardLocale, iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const ContactSubmissionsPanel = ({ locale, snapshot }: ContactSubmissionsPanelProps) => {
  const router = useRouter();
  const copy = copyByLocale[locale];
  const subjectLabels = subjectLabelsByLocale[locale];
  const statusLabels = statusLabelsByLocale[locale];
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState<string>("");
  const [activeId, setActiveId] = useState<string | null>(snapshot.records[0]?.id ?? null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, startRefresh] = useTransition();

  const filteredRecords = useMemo<ContactSubmissionRecord[]>(() => {
    const trimmedSearch = search.trim().toLowerCase();
    return snapshot.records.filter((record) => {
      if (filter !== "all" && record.status !== filter) {
        return false;
      }
      if (trimmedSearch.length === 0) {
        return true;
      }
      return (
        record.name.toLowerCase().includes(trimmedSearch) ||
        record.email.toLowerCase().includes(trimmedSearch) ||
        (record.organization ?? "").toLowerCase().includes(trimmedSearch) ||
        record.message.toLowerCase().includes(trimmedSearch)
      );
    });
  }, [filter, search, snapshot.records]);

  const paginatedRecords = paginateItems(filteredRecords, currentPage, contactSubmissionsPageSize);

  const activeRecord = useMemo<ContactSubmissionRecord | null>(() => {
    if (activeId === null) {
      return paginatedRecords.items[0] ?? null;
    }
    return paginatedRecords.items.find((record) => record.id === activeId) ?? paginatedRecords.items[0] ?? null;
  }, [activeId, paginatedRecords.items]);

  const handleStatusChangeAsync = async (
    recordId: string,
    nextStatus: ContactSubmissionStatus
  ): Promise<void> => {
    setErrorMessage(null);
    setUpdatingId(recordId);

    const supabase = createClient();
    const { error } = await supabase
      .from("public_contact_submissions")
      .update({ status: nextStatus })
      .eq("id", recordId);

    setUpdatingId(null);

    if (error !== null) {
      setErrorMessage(`${copy.statusUpdateFailed}: ${error.message}`);
      return;
    }

    startRefresh(() => {
      router.refresh();
    });
  };

  return (
    <div className="contact-submissions">
      <header className="contact-submissions__summary" role="group" aria-label={copy.submissionCounters}>
        <button
          className={`contact-submissions__counter${filter === "all" ? " is-active" : ""}`}
          onClick={() => {
            setFilter("all");
            setActiveId(null);
            setCurrentPage(1);
          }}
          type="button"
        >
          <span className="contact-submissions__counter-value">{snapshot.counts.total}</span>
          <span className="contact-submissions__counter-label">{copy.all}</span>
        </button>
        {statusOrder.map((status) => {
          const value =
            status === "new"
              ? snapshot.counts.new
              : status === "in_review"
                ? snapshot.counts.inReview
                : status === "closed"
                  ? snapshot.counts.closed
                  : snapshot.counts.spam;
          return (
            <button
              key={status}
              className={`contact-submissions__counter${filter === status ? " is-active" : ""}`}
              data-status={status}
              onClick={() => {
                setFilter(status);
                setActiveId(null);
                setCurrentPage(1);
              }}
              type="button"
            >
              <span className="contact-submissions__counter-value">{value}</span>
              <span className="contact-submissions__counter-label">{statusLabels[status]}</span>
            </button>
          );
        })}
      </header>

      <div className="contact-submissions__toolbar">
        <input
          className="contact-submissions__search"
          onChange={(event) => {
            setSearch(event.target.value);
            setActiveId(null);
            setCurrentPage(1);
          }}
          placeholder={copy.searchPlaceholder}
          type="search"
          value={search}
        />
        <button
          className="contact-submissions__refresh"
          disabled={isRefreshing}
          onClick={() =>
            startRefresh(() => {
              router.refresh();
            })
          }
          type="button"
        >
          {isRefreshing ? copy.refreshing : copy.refresh}
        </button>
      </div>

      {errorMessage !== null ? (
        <p className="contact-submissions__error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="contact-submissions__layout">
        <ol className="contact-submissions__list" aria-label="Contact submissions">
          {filteredRecords.length === 0 ? (
            <li className="contact-submissions__empty">{copy.empty}</li>
          ) : (
            paginatedRecords.items.map((record) => {
              const isActive = activeRecord?.id === record.id;
              return (
                <li key={record.id}>
                  <button
                    className={`contact-submissions__row${isActive ? " is-active" : ""}`}
                    data-status={record.status}
                    onClick={() => setActiveId(record.id)}
                    type="button"
                  >
                    <div className="contact-submissions__row-head">
                      <span className="contact-submissions__row-name">{record.name}</span>
                      <span className="contact-submissions__row-date">
                        {formatDateTime(locale, record.createdAt)}
                      </span>
                    </div>
                    <div className="contact-submissions__row-meta">
                      <span className="contact-submissions__chip" data-status={record.status}>
                        {statusLabels[record.status]}
                      </span>
                      <span className="contact-submissions__row-subject">
                        {subjectLabels[record.subject]}
                      </span>
                      <span className="contact-submissions__row-locale">{record.locale.toUpperCase()}</span>
                    </div>
                    <p className="contact-submissions__row-preview">{record.message}</p>
                  </button>
                </li>
              );
            })
          )}
          <li className="contact-submissions__pagination">
            <PaginationControls
              copy={copy}
              currentPage={paginatedRecords.currentPage}
              endItem={paginatedRecords.endItem}
              onPageChange={(page) => {
                setActiveId(null);
                setCurrentPage(page);
              }}
              startItem={paginatedRecords.startItem}
              totalItems={paginatedRecords.totalItems}
              totalPages={paginatedRecords.totalPages}
            />
          </li>
        </ol>

        <aside className="contact-submissions__detail" aria-live="polite">
          {activeRecord === null ? (
            <p className="contact-submissions__detail-empty">{copy.detailEmpty}</p>
          ) : (
            <article>
              <header className="contact-submissions__detail-head">
                <div>
                  <p className="contact-submissions__detail-eyebrow">
                    {subjectLabels[activeRecord.subject]} · {activeRecord.locale.toUpperCase()}
                  </p>
                  <h2 className="contact-submissions__detail-title">{activeRecord.name}</h2>
                  <p className="contact-submissions__detail-sub">
                    {formatDateTime(locale, activeRecord.createdAt)}
                  </p>
                </div>
                <label className="contact-submissions__status-control">
                  <span>{copy.status}</span>
                  <select
                    disabled={updatingId === activeRecord.id}
                    onChange={(event) =>
                      void handleStatusChangeAsync(
                        activeRecord.id,
                        event.target.value as ContactSubmissionStatus
                      )
                    }
                    value={activeRecord.status}
                  >
                    {statusOrder.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
              </header>

              <dl className="contact-submissions__detail-meta">
                <div>
                  <dt>{copy.email}</dt>
                  <dd>
                    <a href={`mailto:${activeRecord.email}`}>{activeRecord.email}</a>
                  </dd>
                </div>
                <div>
                  <dt>{copy.organization}</dt>
                  <dd>{activeRecord.organization ?? copy.noOrganization}</dd>
                </div>
                <div>
                  <dt>{copy.subject}</dt>
                  <dd>{subjectLabels[activeRecord.subject]}</dd>
                </div>
                <div>
                  <dt>{copy.language}</dt>
                  <dd>{activeRecord.locale.toUpperCase()}</dd>
                </div>
              </dl>

              <section className="contact-submissions__detail-message">
                <h3>{copy.message}</h3>
                <p>{activeRecord.message}</p>
              </section>

              {activeRecord.attachmentSignedUrl !== null ? (
                <section className="contact-submissions__detail-attachment">
                  <h3>{copy.attachment}</h3>
                  <a
                    className="contact-submissions__attachment-link"
                    href={activeRecord.attachmentSignedUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {copy.openAttachment}
                  </a>
                </section>
              ) : null}
            </article>
          )}
        </aside>
      </div>
    </div>
  );
};
