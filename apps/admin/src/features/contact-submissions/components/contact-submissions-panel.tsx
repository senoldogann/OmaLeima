"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { createClient } from "@/lib/supabase/client";
import type {
  ContactSubmissionRecord,
  ContactSubmissionStatus,
  ContactSubmissionSubject,
  ContactSubmissionsSnapshot,
} from "@/features/contact-submissions/types";

type ContactSubmissionsPanelProps = {
  snapshot: ContactSubmissionsSnapshot;
};

type StatusFilter = "all" | ContactSubmissionStatus;

const subjectLabels: Record<ContactSubmissionSubject, string> = {
  business_signup: "Business sign-up",
  collaboration: "Collaboration",
  pilot: "Pilot / test",
  press: "Press",
  other: "Other",
};

const statusLabels: Record<ContactSubmissionStatus, string> = {
  new: "New",
  in_review: "In review",
  closed: "Closed",
  spam: "Spam",
};

const statusOrder: ContactSubmissionStatus[] = ["new", "in_review", "closed", "spam"];

const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("fi-FI", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const ContactSubmissionsPanel = ({ snapshot }: ContactSubmissionsPanelProps) => {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState<string>("");
  const [activeId, setActiveId] = useState<string | null>(snapshot.records[0]?.id ?? null);
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

  const activeRecord = useMemo<ContactSubmissionRecord | null>(() => {
    if (activeId === null) {
      return filteredRecords[0] ?? null;
    }
    return filteredRecords.find((record) => record.id === activeId) ?? filteredRecords[0] ?? null;
  }, [activeId, filteredRecords]);

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
      setErrorMessage(`Status güncellenemedi: ${error.message}`);
      return;
    }

    startRefresh(() => {
      router.refresh();
    });
  };

  return (
    <div className="contact-submissions">
      <header className="contact-submissions__summary" role="group" aria-label="Submission counters">
        <button
          className={`contact-submissions__counter${filter === "all" ? " is-active" : ""}`}
          onClick={() => setFilter("all")}
          type="button"
        >
          <span className="contact-submissions__counter-value">{snapshot.counts.total}</span>
          <span className="contact-submissions__counter-label">All</span>
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
              onClick={() => setFilter(status)}
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
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Ara: isim, e-posta, kuruluş, mesaj"
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
          {isRefreshing ? "Yenileniyor…" : "Yenile"}
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
            <li className="contact-submissions__empty">Bu filtreye uygun başvuru yok.</li>
          ) : (
            filteredRecords.map((record) => {
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
                        {formatDateTime(record.createdAt)}
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
        </ol>

        <aside className="contact-submissions__detail" aria-live="polite">
          {activeRecord === null ? (
            <p className="contact-submissions__detail-empty">Görüntülemek için bir başvuru seçin.</p>
          ) : (
            <article>
              <header className="contact-submissions__detail-head">
                <div>
                  <p className="contact-submissions__detail-eyebrow">
                    {subjectLabels[activeRecord.subject]} · {activeRecord.locale.toUpperCase()}
                  </p>
                  <h2 className="contact-submissions__detail-title">{activeRecord.name}</h2>
                  <p className="contact-submissions__detail-sub">
                    {formatDateTime(activeRecord.createdAt)}
                  </p>
                </div>
                <label className="contact-submissions__status-control">
                  <span>Status</span>
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
                  <dt>E-posta</dt>
                  <dd>
                    <a href={`mailto:${activeRecord.email}`}>{activeRecord.email}</a>
                  </dd>
                </div>
                {activeRecord.organization !== null ? (
                  <div>
                    <dt>Kuruluş</dt>
                    <dd>{activeRecord.organization}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Konu</dt>
                  <dd>{subjectLabels[activeRecord.subject]}</dd>
                </div>
                <div>
                  <dt>Dil</dt>
                  <dd>{activeRecord.locale.toUpperCase()}</dd>
                </div>
              </dl>

              <section className="contact-submissions__detail-message">
                <h3>Mesaj</h3>
                <p>{activeRecord.message}</p>
              </section>

              {activeRecord.attachmentSignedUrl !== null ? (
                <section className="contact-submissions__detail-attachment">
                  <h3>Ek</h3>
                  <a
                    className="contact-submissions__attachment-link"
                    href={activeRecord.attachmentSignedUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Dosyayı yeni sekmede aç
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
