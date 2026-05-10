"use client";

import { useMemo, useState } from "react";

import type { AdminUserRecord, AdminUserRole, AdminUsersSnapshot, AdminUserStatus } from "@/features/admin-users/types";
import type { DashboardLocale } from "@/features/dashboard/i18n";
import { paginateItems } from "@/features/shared/pagination";
import { PaginationControls, type PaginationControlsCopy } from "@/features/shared/pagination-controls";
import { successNoticeDurationMs, useTransientSuccessKey } from "@/features/shared/use-transient-success-key";

type AdminUsersPanelProps = {
  currentUserId: string;
  locale: DashboardLocale;
  snapshot: AdminUsersSnapshot;
};

type StatusMutationResponse = {
  message?: string;
  status?: string;
};

type RoleFilter = "all" | AdminUserRole;
type StatusFilter = "all" | AdminUserStatus;

type AdminUsersCopy = PaginationControlsCopy & {
  actions: string;
  activate: string;
  active: string;
  activeUsers: string;
  allRoles: string;
  allStatuses: string;
  businessMemberships: string;
  clubs: string;
  deleted: string;
  deletedUsers: string;
  deleteUser: string;
  deleteUserConfirm: string;
  empty: string;
  emptyMemberships: string;
  passive: string;
  role: string;
  searchPlaceholder: string;
  setPassive: string;
  status: string;
  suspendedUsers: string;
  tableBody: string;
  tableTitle: string;
  updated: string;
  user: string;
};

const roleOrder: AdminUserRole[] = [
  "PLATFORM_ADMIN",
  "CLUB_ORGANIZER",
  "CLUB_STAFF",
  "BUSINESS_OWNER",
  "BUSINESS_STAFF",
  "STUDENT",
];

const statusOrder: AdminUserStatus[] = ["ACTIVE", "SUSPENDED", "DELETED"];

const usersPageSize = 20;

const copyByLocale = {
  en: {
    actions: "Actions",
    activate: "Activate",
    active: "Active",
    activeUsers: "Active users",
    allRoles: "All roles",
    allStatuses: "All statuses",
    businessMemberships: "Business memberships",
    clubs: "Club memberships",
    deleted: "Deleted",
    deletedUsers: "Deleted users",
    deleteUser: "Delete account",
    deleteUserConfirm: "Delete this account? The profile will be anonymized, memberships and push tokens disabled, and access will be blocked. Leima/event/audit history will be preserved.",
    empty: "No users match these filters.",
    emptyMemberships: "No memberships",
    next: "Next",
    of: "of",
    page: "Page",
    passive: "Passive",
    previous: "Previous",
    role: "Role",
    searchPlaceholder: "Search users by name, email, role, organization, city",
    setPassive: "Set passive",
    showing: "Showing",
    status: "Status",
    suspendedUsers: "Passive users",
    tableBody: "Changing profile status is immediate. Passive users are signed out through the realtime profile watcher and blocked by existing access guards. Delete account anonymizes the profile and disables access while preserving leima/event history.",
    tableTitle: "All accounts",
    updated: "Updated",
    user: "User",
  },
  fi: {
    actions: "Toiminnot",
    activate: "Aktivoi",
    active: "Aktiivinen",
    activeUsers: "Aktiiviset käyttäjät",
    allRoles: "Kaikki roolit",
    allStatuses: "Kaikki tilat",
    businessMemberships: "Yritysjäsennydet",
    clubs: "Klubijäsenyydet",
    deleted: "Poistettu",
    deletedUsers: "Poistetut käyttäjät",
    deleteUser: "Poista tili",
    deleteUserConfirm: "Poistetaanko tämä tili? Profiili anonymisoidaan, jäsenyydet ja push-tokenit poistetaan käytöstä, ja käyttö estetään. Leima-, tapahtuma- ja audit-historia säilytetään.",
    empty: "Näillä suodattimilla ei löydy käyttäjiä.",
    emptyMemberships: "Ei jäsenyyksiä",
    next: "Seuraava",
    of: "/",
    page: "Sivu",
    passive: "Passiivinen",
    previous: "Edellinen",
    role: "Rooli",
    searchPlaceholder: "Hae nimellä, sähköpostilla, roolilla, organisaatiolla, kaupungilla",
    setPassive: "Passivoi",
    showing: "Näytetään",
    status: "Tila",
    suspendedUsers: "Passiiviset käyttäjät",
    tableBody: "Profiilin tila vaihtuu heti. Passivoitu käyttäjä kirjataan ulos realtime-profiilivalvonnalla ja nykyiset käyttöoikeusvahdit estävät uuden sisäänpääsyn. Tilin poisto anonymisoi profiilin ja estää käytön, mutta leima- ja tapahtumahistoria säilyy.",
    tableTitle: "Kaikki käyttäjät",
    updated: "Päivitetty",
    user: "Käyttäjä",
  },
} as const satisfies Record<DashboardLocale, AdminUsersCopy>;

const statusClassName = (status: AdminUserStatus): string => {
  if (status === "ACTIVE") {
    return "status-pill status-pill-success";
  }

  if (status === "SUSPENDED") {
    return "status-pill status-pill-warning";
  }

  return "status-pill status-pill-danger";
};

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat("fi-FI", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const formatMemberships = (
  memberships: { role: string; status: string; businessName?: string; clubName?: string }[],
  emptyLabel: string
): string =>
  memberships.length === 0
    ? emptyLabel
    : memberships
      .map((membership) => {
        const name = membership.businessName ?? membership.clubName ?? "Unknown";

        return `${name} · ${membership.role} · ${membership.status}`;
      })
      .join(" | ");

const uuidLikePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const titleCaseToken = (token: string): string => {
  if (token.length === 0) {
    return "";
  }

  return `${token.slice(0, 1).toUpperCase()}${token.slice(1).toLowerCase()}`;
};

const getReadableUserName = (user: AdminUserRecord, locale: DashboardLocale): string => {
  const trimmedDisplayName = user.displayName?.trim() ?? "";

  if (trimmedDisplayName.length > 0) {
    return trimmedDisplayName;
  }

  const emailLocalPart = user.email.split("@")[0]?.trim() ?? "";

  if (emailLocalPart.length > 0 && !uuidLikePattern.test(emailLocalPart)) {
    return emailLocalPart
      .split(/[._\s-]+/u)
      .filter((token) => token.length > 0)
      .map(titleCaseToken)
      .join(" ");
  }

  if (user.primaryRole === "STUDENT") {
    return locale === "fi" ? "Opiskelijaprofiili" : "Student profile";
  }

  return locale === "fi" ? "Käyttäjäprofiili" : "User profile";
};

const updateUserStatusAsync = async (
  userId: string,
  status: AdminUserStatus
): Promise<StatusMutationResponse> => {
  const response = await fetch("/api/admin/users/status", {
    body: JSON.stringify({
      status,
      userId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json()) as StatusMutationResponse;

  if (!response.ok) {
    throw new Error(typeof responseBody.message === "string" ? responseBody.message : "User status update failed.");
  }

  return responseBody;
};

const renderActionButton = ({
  copy,
  currentUserId,
  isPending,
  onPress,
  pendingUserId,
  user,
}: {
  copy: AdminUsersCopy;
  currentUserId: string;
  isPending: boolean;
  onPress: (userId: string, status: AdminUserStatus) => void;
  pendingUserId: string | null;
  user: AdminUserRecord;
}) => {
  if (user.id === currentUserId || user.status === "DELETED") {
    return null;
  }

  const isCurrentUserPending = isPending && pendingUserId === user.id;

  if (user.status === "ACTIVE") {
    return (
      <div className="admin-users-actions">
        <button
          className="button button-danger"
          disabled={isCurrentUserPending}
          onClick={() => onPress(user.id, "SUSPENDED")}
          type="button"
        >
          {copy.setPassive}
        </button>
        <button
          className="button button-danger"
          disabled={isCurrentUserPending}
          onClick={() => onPress(user.id, "DELETED")}
          type="button"
        >
          {copy.deleteUser}
        </button>
      </div>
    );
  }

  return (
    <div className="admin-users-actions">
      <button
        className="button button-secondary"
        disabled={isCurrentUserPending}
        onClick={() => onPress(user.id, "ACTIVE")}
        type="button"
      >
        {copy.activate}
      </button>
      <button
        className="button button-danger"
        disabled={isCurrentUserPending}
        onClick={() => onPress(user.id, "DELETED")}
        type="button"
      >
        {copy.deleteUser}
      </button>
    </div>
  );
};

const createSearchText = (user: AdminUserRecord): string =>
  [
    user.displayName ?? "",
    user.email,
    user.primaryRole,
    user.status,
    ...user.businessMemberships.flatMap((membership) => [
      membership.businessName,
      membership.businessCity ?? "",
      membership.role,
      membership.status,
      membership.businessStatus,
    ]),
    ...user.clubMemberships.flatMap((membership) => [
      membership.clubName,
      membership.clubCity ?? "",
      membership.role,
      membership.status,
      membership.clubStatus,
    ]),
  ]
    .join(" ")
    .toLowerCase();

export const AdminUsersPanel = ({ currentUserId, locale, snapshot }: AdminUsersPanelProps) => {
  const copy = copyByLocale[locale];
  const [users, setUsers] = useState<AdminUserRecord[]>(snapshot.users);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);

  useTransientSuccessKey(successMessage, () => setSuccessMessage(null), successNoticeDurationMs);

  const filteredUsers = useMemo<AdminUserRecord[]>(() => {
    const trimmedSearch = search.trim().toLowerCase();

    return users.filter((user) => {
      if (roleFilter !== "all" && user.primaryRole !== roleFilter) {
        return false;
      }

      if (statusFilter !== "all" && user.status !== statusFilter) {
        return false;
      }

      if (trimmedSearch.length === 0) {
        return true;
      }

      return createSearchText(user).includes(trimmedSearch);
    });
  }, [roleFilter, search, statusFilter, users]);

  const userCounts = useMemo(
    () => ({
      active: users.filter((user) => user.status === "ACTIVE").length,
      deleted: users.filter((user) => user.status === "DELETED").length,
      suspended: users.filter((user) => user.status === "SUSPENDED").length,
    }),
    [users]
  );

  const paginatedUsers = paginateItems(filteredUsers, currentPage, usersPageSize);

  const handleStatusPress = async (userId: string, status: AdminUserStatus): Promise<void> => {
    if (status === "DELETED" && !window.confirm(copy.deleteUserConfirm)) {
      return;
    }

    setPendingUserId(userId);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await updateUserStatusAsync(userId, status);

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === userId
            ? {
                ...user,
                status,
                updatedAt: new Date().toISOString(),
              }
            : user
        )
      );
      setSuccessMessage(typeof response.message === "string" ? response.message : "User status updated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown user status update error.");
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <div className="stack-lg">
      <section className="metrics-grid">
        <article className="panel panel-accent">
          <span className="field-label">{copy.activeUsers}</span>
          <strong className="metric-value">{userCounts.active}</strong>
        </article>
        <article className="panel panel-warning">
          <span className="field-label">{copy.suspendedUsers}</span>
          <strong className="metric-value">{userCounts.suspended}</strong>
        </article>
        <article className="panel panel-danger">
          <span className="field-label">{copy.deletedUsers}</span>
          <strong className="metric-value">{userCounts.deleted}</strong>
        </article>
      </section>

      <section className="panel stack-md">
        <div className="stack-sm">
          <div className="eyebrow">{copy.tableTitle}</div>
          <p className="muted-text">{copy.tableBody}</p>
        </div>

        {successMessage !== null ? <p className="inline-success">{successMessage}</p> : null}
        {errorMessage !== null ? <p className="inline-error">{errorMessage}</p> : null}

        <div className="admin-users-toolbar">
          <input
            className="contact-submissions__search"
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder={copy.searchPlaceholder}
            type="search"
            value={search}
          />
          <select
            className="admin-users-filter"
            onChange={(event) => {
              setRoleFilter(event.target.value as RoleFilter);
              setCurrentPage(1);
            }}
            value={roleFilter}
          >
            <option value="all">{copy.allRoles}</option>
            {roleOrder.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <select
            className="admin-users-filter"
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
              setCurrentPage(1);
            }}
            value={statusFilter}
          >
            <option value="all">{copy.allStatuses}</option>
            {statusOrder.map((status) => (
              <option key={status} value={status}>
                {status === "ACTIVE" ? copy.active : status === "SUSPENDED" ? copy.passive : copy.deleted}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-users-table-wrap">
          <table className="admin-users-table" style={{ minWidth: "1240px" }}>
            <thead>
              <tr>
                <th>{copy.user}</th>
                <th>{copy.role}</th>
                <th>{copy.status}</th>
                <th>{copy.businessMemberships}</th>
                <th>{copy.clubs}</th>
                <th>{copy.updated}</th>
                <th aria-label={copy.actions}>{copy.actions}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.items.length === 0 ? (
                <tr>
                  <td colSpan={7}>{copy.empty}</td>
                </tr>
              ) : paginatedUsers.items.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{getReadableUserName(user, locale)}</strong>
                    <span className="muted-text">{user.email}</span>
                  </td>
                  <td>{user.primaryRole}</td>
                  <td>
                    <span className={statusClassName(user.status)}>
                      {user.status === "ACTIVE" ? copy.active : user.status === "SUSPENDED" ? copy.passive : copy.deleted}
                    </span>
                  </td>
                  <td>{formatMemberships(user.businessMemberships, copy.emptyMemberships)}</td>
                  <td>{formatMemberships(user.clubMemberships, copy.emptyMemberships)}</td>
                  <td>{formatDateTime(user.updatedAt)}</td>
                  <td>
                    {renderActionButton({
                      copy,
                      currentUserId,
                      isPending: pendingUserId !== null,
                      onPress: (selectedUserId, selectedStatus) => void handleStatusPress(selectedUserId, selectedStatus),
                      pendingUserId,
                      user,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationControls
          copy={copy}
          currentPage={paginatedUsers.currentPage}
          endItem={paginatedUsers.endItem}
          onPageChange={setCurrentPage}
          startItem={paginatedUsers.startItem}
          totalItems={paginatedUsers.totalItems}
          totalPages={paginatedUsers.totalPages}
        />
      </section>
    </div>
  );
};
