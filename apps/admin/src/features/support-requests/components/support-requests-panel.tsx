"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import type { DashboardLocale } from "@/features/dashboard/i18n";
import type {
  SupportRequestArea,
  SupportRequestRecord,
  SupportRequestsSnapshot,
  SupportRequestStatus,
} from "@/features/support-requests/types";
import { paginateItems } from "@/features/shared/pagination";
import { PaginationControls, type PaginationControlsCopy } from "@/features/shared/pagination-controls";

type SupportRequestsPanelProps = {
  locale: DashboardLocale;
  snapshot: SupportRequestsSnapshot;
};

type StatusFilter = "all" | SupportRequestStatus;

type SupportReplyResponse = {
  message: string;
  notificationsFailed?: number;
  notificationsSent?: number;
  pushStatus?: string;
  status: string;
};

type ReplyDraft = {
  recordId: string | null;
  status: SupportRequestStatus;
  text: string;
};

type SupportRequestsCopy = PaginationControlsCopy & {
  all: string;
  area: string;
  detailEmpty: string;
  empty: string;
  message: string;
  noTarget: string;
  refresh: string;
  refreshing: string;
  reply: string;
  replyFailed: string;
  replyPlaceholder: string;
  replySaved: string;
  replySavedNoPush: string;
  replySubmit: string;
  replySubmitting: string;
  requester: string;
  searchPlaceholder: string;
  status: string;
  supportCounters: string;
  target: string;
};

const statusOrder: SupportRequestStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const supportRequestsPageSize = 12;

const statusLabelsByLocale: Record<DashboardLocale, Record<SupportRequestStatus, string>> = {
  en: {
    CLOSED: "Closed",
    IN_PROGRESS: "In progress",
    OPEN: "Open",
    RESOLVED: "Resolved",
  },
  fi: {
    CLOSED: "Suljettu",
    IN_PROGRESS: "Käsittelyssä",
    OPEN: "Avoin",
    RESOLVED: "Ratkaistu",
  },
};

const areaLabelsByLocale: Record<DashboardLocale, Record<SupportRequestArea, string>> = {
  en: {
    BUSINESS: "Business",
    CLUB: "Organizer",
    STUDENT: "Student",
  },
  fi: {
    BUSINESS: "Yritys",
    CLUB: "Järjestäjä",
    STUDENT: "Opiskelija",
  },
};

const copyByLocale: Record<DashboardLocale, SupportRequestsCopy> = {
  en: {
    all: "All",
    area: "Area",
    detailEmpty: "Select a support request to review and answer it.",
    empty: "No support requests match this filter.",
    message: "Message",
    noTarget: "No linked organization",
    next: "Next",
    of: "of",
    page: "Page",
    previous: "Previous",
    refresh: "Refresh",
    refreshing: "Refreshing...",
    reply: "Support reply",
    replyFailed: "Could not save support reply",
    replyPlaceholder: "Write the answer that the sender will see in the mobile support history.",
    replySavedNoPush: "Reply saved. Push notification was not delivered because the user has no active device token.",
    replySaved: "Reply saved and sent to the sender's support history.",
    replySubmit: "Save reply",
    replySubmitting: "Saving...",
    requester: "Requester",
    searchPlaceholder: "Search: sender, email, organization, subject, message",
    showing: "Showing",
    status: "Status",
    supportCounters: "Support request counters",
    target: "Target",
  },
  fi: {
    all: "Kaikki",
    area: "Alue",
    detailEmpty: "Valitse tukipyyntö tarkistaaksesi ja vastataksesi siihen.",
    empty: "Tällä suodattimella ei löydy tukipyyntöjä.",
    message: "Viesti",
    noTarget: "Ei liitettyä organisaatiota",
    next: "Seuraava",
    of: "/",
    page: "Sivu",
    previous: "Edellinen",
    refresh: "Päivitä",
    refreshing: "Päivitetään...",
    reply: "Tuen vastaus",
    replyFailed: "Tuen vastauksen tallennus epäonnistui",
    replyPlaceholder: "Kirjoita vastaus, jonka lähettäjä näkee mobiilin tukihistoriassa.",
    replySavedNoPush: "Vastaus tallennettu. Push-ilmoitusta ei toimitettu, koska käyttäjällä ei ole aktiivista laitetokenia.",
    replySaved: "Vastaus tallennettu ja lähetetty lähettäjän tukihistoriaan.",
    replySubmit: "Tallenna vastaus",
    replySubmitting: "Tallennetaan...",
    requester: "Lähettäjä",
    searchPlaceholder: "Hae: lähettäjä, sähköposti, organisaatio, aihe, viesti",
    showing: "Näytetään",
    status: "Tila",
    supportCounters: "Tukipyynnöt yhteensä",
    target: "Kohde",
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

const createRequesterLabel = (record: SupportRequestRecord): string =>
  record.requester.displayName ?? record.requester.email;

const createTargetLabel = (record: SupportRequestRecord, noTargetLabel: string): string => {
  if (record.target === null) {
    return noTargetLabel;
  }

  return [record.target.name, record.target.city].filter(Boolean).join(" · ");
};

const countForStatus = (snapshot: SupportRequestsSnapshot, status: SupportRequestStatus): number => {
  if (status === "OPEN") {
    return snapshot.counts.open;
  }
  if (status === "IN_PROGRESS") {
    return snapshot.counts.inProgress;
  }
  if (status === "RESOLVED") {
    return snapshot.counts.resolved;
  }
  return snapshot.counts.closed;
};

const parseReplyResponseAsync = async (response: Response): Promise<SupportReplyResponse> => {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const responseText = await response.text();

    return {
      message:
        responseText.length > 0
          ? responseText
          : `Support reply request returned HTTP ${response.status}.`,
      status: "NON_JSON_RESPONSE",
    };
  }

  let body: Partial<SupportReplyResponse>;

  try {
    body = (await response.json()) as Partial<SupportReplyResponse>;
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? `Could not parse support reply response JSON: ${error.message}`
          : "Could not parse support reply response JSON.",
      status: "INVALID_JSON_RESPONSE",
    };
  }

  return {
    message: typeof body.message === "string" ? body.message : "Unknown support reply response.",
    notificationsFailed:
      typeof body.notificationsFailed === "number" ? body.notificationsFailed : undefined,
    notificationsSent:
      typeof body.notificationsSent === "number" ? body.notificationsSent : undefined,
    pushStatus: typeof body.pushStatus === "string" ? body.pushStatus : undefined,
    status: typeof body.status === "string" ? body.status : "UNKNOWN_STATUS",
  };
};

const createReplySavedMessage = (copy: SupportRequestsCopy, response: SupportReplyResponse): string => {
  if (response.pushStatus === "NO_DEVICE_TOKENS" || response.pushStatus === "REQUESTER_NOT_ACTIVE") {
    return copy.replySavedNoPush;
  }

  if ((response.notificationsFailed ?? 0) > 0 && (response.notificationsSent ?? 0) === 0) {
    return `${copy.replySaved} Push: ${response.pushStatus ?? "failed"}.`;
  }

  return copy.replySaved;
};

const createReplyDraft = (record: SupportRequestRecord | undefined): ReplyDraft => ({
  recordId: record?.id ?? null,
  status: record?.adminReply === null ? "RESOLVED" : (record?.status ?? "RESOLVED"),
  text: record?.adminReply ?? "",
});

export const SupportRequestsPanel = ({ locale, snapshot }: SupportRequestsPanelProps) => {
  const router = useRouter();
  const copy = copyByLocale[locale];
  const areaLabels = areaLabelsByLocale[locale];
  const statusLabels = statusLabelsByLocale[locale];
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState<string>("");
  const [activeId, setActiveId] = useState<string | null>(snapshot.records[0]?.id ?? null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [replyDraft, setReplyDraft] = useState<ReplyDraft>(createReplyDraft(snapshot.records[0]));
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRefreshing, startRefresh] = useTransition();

  const filteredRecords = useMemo<SupportRequestRecord[]>(() => {
    const trimmedSearch = search.trim().toLowerCase();
    return snapshot.records.filter((record) => {
      if (filter !== "all" && record.status !== filter) {
        return false;
      }
      if (trimmedSearch.length === 0) {
        return true;
      }

      const searchableValues = [
        record.requester.displayName ?? "",
        record.requester.email,
        record.target?.name ?? "",
        record.subject,
        record.message,
        record.adminReply ?? "",
      ];

      return searchableValues.some((value) => value.toLowerCase().includes(trimmedSearch));
    });
  }, [filter, search, snapshot.records]);

  const paginatedRecords = paginateItems(filteredRecords, currentPage, supportRequestsPageSize);

  const activeRecord = useMemo<SupportRequestRecord | null>(() => {
    if (activeId === null) {
      return paginatedRecords.items[0] ?? null;
    }

    return paginatedRecords.items.find((record) => record.id === activeId) ?? paginatedRecords.items[0] ?? null;
  }, [activeId, paginatedRecords.items]);

  const activeReplyText =
    activeRecord !== null && replyDraft.recordId === activeRecord.id
      ? replyDraft.text
      : (activeRecord?.adminReply ?? "");
  const activeReplyStatus =
    activeRecord !== null && replyDraft.recordId === activeRecord.id
      ? replyDraft.status
      : activeRecord?.adminReply === null
        ? "RESOLVED"
        : (activeRecord?.status ?? "RESOLVED");

  useEffect(() => {
    if (successMessage === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [successMessage]);

  const submitReplyAsync = async (
    record: SupportRequestRecord,
    reply: string,
    status: SupportRequestStatus
  ): Promise<void> => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmittingId(record.id);

    try {
      const response = await fetch("/api/admin/support-requests/reply", {
        body: JSON.stringify({
          reply,
          status,
          supportRequestId: record.id,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const body = await parseReplyResponseAsync(response);

      if (!response.ok || body.status !== "SUCCESS") {
        setErrorMessage(`${copy.replyFailed}: ${body.message}`);
        return;
      }

      setSuccessMessage(createReplySavedMessage(copy, body));
      startRefresh(() => {
        router.refresh();
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `${copy.replyFailed}: ${error.message}`
          : `${copy.replyFailed}: Unknown network error.`
      );
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="support-requests">
      <header className="contact-submissions__summary" role="group" aria-label={copy.supportCounters}>
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
        {statusOrder.map((status) => (
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
            <span className="contact-submissions__counter-value">{countForStatus(snapshot, status)}</span>
            <span className="contact-submissions__counter-label">{statusLabels[status]}</span>
          </button>
        ))}
      </header>

      <div className="contact-submissions__toolbar">
        <input
          aria-label={copy.searchPlaceholder}
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
      {successMessage !== null ? (
        <p className="support-requests__success" role="status">
          {successMessage}
        </p>
      ) : null}

      <div className="contact-submissions__layout support-requests__layout">
        <ol className="contact-submissions__list" aria-label="Support requests">
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
                      <span className="contact-submissions__row-name">{createRequesterLabel(record)}</span>
                      <span className="contact-submissions__row-date">
                        {formatDateTime(locale, record.createdAt)}
                      </span>
                    </div>
                    <div className="contact-submissions__row-meta">
                      <span className="contact-submissions__chip" data-status={record.status}>
                        {statusLabels[record.status]}
                      </span>
                      <span className="contact-submissions__row-subject">{areaLabels[record.area]}</span>
                      <span className="contact-submissions__row-locale">
                        {record.target?.type ?? "user"}
                      </span>
                    </div>
                    <strong className="support-requests__subject">{record.subject}</strong>
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

        <aside className="contact-submissions__detail support-requests__detail" aria-live="polite">
          {activeRecord === null ? (
            <p className="contact-submissions__detail-empty">{copy.detailEmpty}</p>
          ) : (
            <article>
              <header className="contact-submissions__detail-head">
                <div>
                  <p className="contact-submissions__detail-eyebrow">
                    {areaLabels[activeRecord.area]} · {statusLabels[activeRecord.status]}
                  </p>
                  <h2 className="contact-submissions__detail-title">{activeRecord.subject}</h2>
                  <p className="contact-submissions__detail-sub">
                    {formatDateTime(locale, activeRecord.createdAt)}
                  </p>
                </div>
              </header>

              <dl className="contact-submissions__detail-meta">
                <div>
                  <dt>{copy.requester}</dt>
                  <dd>{createRequesterLabel(activeRecord)}</dd>
                  <dd>
                    <a href={`mailto:${activeRecord.requester.email}`}>{activeRecord.requester.email}</a>
                  </dd>
                </div>
                <div>
                  <dt>{copy.area}</dt>
                  <dd>{areaLabels[activeRecord.area]}</dd>
                </div>
                <div>
                  <dt>{copy.target}</dt>
                  <dd>{createTargetLabel(activeRecord, copy.noTarget)}</dd>
                </div>
                <div>
                  <dt>{copy.status}</dt>
                  <dd>{statusLabels[activeRecord.status]}</dd>
                </div>
              </dl>

              <section className="contact-submissions__detail-message">
                <h3>{copy.message}</h3>
                <p>{activeRecord.message}</p>
              </section>

              <section className="support-requests__reply-card">
                <h3>{copy.reply}</h3>
                <label className="contact-submissions__status-control">
                  <span>{copy.status}</span>
                  <select
                    disabled={submittingId === activeRecord.id}
                    onChange={(event) =>
                      setReplyDraft({
                        recordId: activeRecord.id,
                        status: event.target.value as SupportRequestStatus,
                        text: activeReplyText,
                      })
                    }
                    value={activeReplyStatus}
                  >
                    {statusOrder.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <textarea
                  className="support-requests__reply-textarea"
                  disabled={submittingId === activeRecord.id}
                  maxLength={2000}
                  minLength={2}
                  onChange={(event) =>
                    setReplyDraft({
                      recordId: activeRecord.id,
                      status: activeReplyStatus,
                      text: event.target.value,
                    })
                  }
                  placeholder={copy.replyPlaceholder}
                  rows={7}
                  value={activeReplyText}
                />
                <button
                  className="support-requests__reply-submit"
                  disabled={submittingId === activeRecord.id || activeReplyText.trim().length < 2}
                  onClick={() => void submitReplyAsync(activeRecord, activeReplyText, activeReplyStatus)}
                  type="button"
                >
                  {submittingId === activeRecord.id ? copy.replySubmitting : copy.replySubmit}
                </button>
              </section>
            </article>
          )}
        </aside>
      </div>
    </div>
  );
};
