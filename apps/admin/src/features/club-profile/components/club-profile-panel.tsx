"use client";

import { useMemo, useState, useTransition } from "react";

import type {
  ClubProfileRecord,
  ClubProfileSnapshot,
  ClubProfileUpdatePayload,
  ClubProfileUpdateResponse,
} from "@/features/club-profile/types";
import type { DashboardLocale } from "@/features/dashboard/i18n";

type ClubProfilePanelProps = {
  locale: DashboardLocale;
  snapshot: ClubProfileSnapshot;
};

type ActionState = {
  message: string;
  tone: "error" | "success";
};

type ClubProfileDraft = ClubProfileUpdatePayload;

type ClubProfilePanelCopy = {
  address: string;
  announcement: string;
  cannotEdit: string;
  contactEmail: string;
  emptyBody: string;
  emptyTitle: string;
  instagram: string;
  profile: string;
  role: string;
  save: string;
  saving: string;
  selectedClub: string;
  subtitle: string;
  title: string;
  phone: string;
  updated: string;
  website: string;
};

const createCopy = (locale: DashboardLocale): ClubProfilePanelCopy => ({
  address: locale === "fi" ? "Osoite" : "Address",
  announcement: locale === "fi" ? "Tiedote" : "Announcement",
  cannotEdit:
    locale === "fi"
      ? "Tällä roolilla voit tarkastella tietoja, mutta profiilin muokkaus vaatii owner- tai organizer-roolin."
      : "This role can view the details, but editing requires an owner or organizer role.",
  contactEmail: locale === "fi" ? "Yhteyssähköposti" : "Contact email",
  emptyBody:
    locale === "fi"
      ? "Tällä järjestäjäistunnolla ei ole aktiivisia klubeja."
      : "This organizer session does not have active clubs.",
  emptyTitle: locale === "fi" ? "Ei aktiivisia klubeja" : "No active clubs",
  instagram: "Instagram",
  phone: locale === "fi" ? "Puhelin" : "Phone",
  profile: locale === "fi" ? "Profiili" : "Profile",
  role: locale === "fi" ? "Rooli" : "Role",
  save: locale === "fi" ? "Tallenna profiili" : "Save profile",
  saving: locale === "fi" ? "Tallennetaan..." : "Saving...",
  selectedClub: locale === "fi" ? "Valittu klubi" : "Selected club",
  subtitle:
    locale === "fi"
      ? "Päivitä julkiset yhteystiedot, joita opiskelijat ja yhteistyökumppanit näkevät OmaLeimassa."
      : "Update public contact details students and partners see in OmaLeima.",
  title: locale === "fi" ? "Järjestäjän profiili" : "Organizer profile",
  updated: locale === "fi" ? "Profiili tallennettu." : "Profile saved.",
  website: locale === "fi" ? "Verkkosivu" : "Website",
});

const createDraftFromClub = (club: ClubProfileRecord): ClubProfileDraft => ({
  address: club.address ?? "",
  announcement: club.announcement ?? "",
  clubId: club.clubId,
  contactEmail: club.contactEmail ?? "",
  instagramUrl: club.instagramUrl ?? "",
  phone: club.phone ?? "",
  websiteUrl: club.websiteUrl ?? "",
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isClubProfileRecord = (value: unknown): value is ClubProfileRecord => {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.clubId === "string" && typeof value.clubName === "string";
};

const isClubProfileUpdateResponse = (value: unknown): value is ClubProfileUpdateResponse => {
  if (!isRecord(value)) {
    return false;
  }

  return value.status === "SUCCESS" && typeof value.message === "string" && isClubProfileRecord(value.club);
};

const fieldLabels = {
  address: "Address",
  announcement: "Announcement",
  clubId: "Club",
  contactEmail: "Contact email",
  instagramUrl: "Instagram",
  phone: "Phone",
  websiteUrl: "Website",
} as const satisfies Record<keyof ClubProfileUpdatePayload, string>;

const orderedErrorFields = Object.keys(fieldLabels) as Array<keyof ClubProfileUpdatePayload>;

const readFirstFieldError = (value: unknown): string | null => {
  if (!isRecord(value)) {
    return null;
  }

  for (const fieldName of orderedErrorFields) {
    const errors = value[fieldName];

    if (Array.isArray(errors) && typeof errors[0] === "string" && errors[0].length > 0) {
      return `${fieldLabels[fieldName]}: ${errors[0]}`;
    }
  }

  return null;
};

const readErrorMessage = (value: unknown, fallback: string): string => {
  if (isRecord(value)) {
    const fieldError = readFirstFieldError(value.fieldErrors);

    if (fieldError !== null) {
      return fieldError;
    }
  }

  if (isRecord(value) && typeof value.message === "string" && value.message.length > 0) {
    return value.message;
  }

  return fallback;
};

export const ClubProfilePanel = ({ locale, snapshot }: ClubProfilePanelProps) => {
  const copy = createCopy(locale);
  const initialClub = snapshot.clubs[0] ?? null;
  const [clubs, setClubs] = useState<ClubProfileRecord[]>(snapshot.clubs);
  const [selectedClubId, setSelectedClubId] = useState<string>(initialClub?.clubId ?? "");
  const selectedClub = clubs.find((club) => club.clubId === selectedClubId) ?? clubs[0] ?? null;
  const [draft, setDraft] = useState<ClubProfileDraft | null>(
    selectedClub === null ? null : createDraftFromClub(selectedClub)
  );
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [isPending, startTransition] = useTransition();
  const canEditSelectedClub = selectedClub?.canEditProfile ?? false;
  const selectedClubMeta = useMemo(
    () => [selectedClub?.city, selectedClub?.universityName].filter((value) => typeof value === "string" && value.length > 0).join(" · "),
    [selectedClub?.city, selectedClub?.universityName]
  );

  const handleClubChange = (clubId: string): void => {
    const nextClub = clubs.find((club) => club.clubId === clubId) ?? null;

    if (nextClub === null) {
      return;
    }

    setSelectedClubId(nextClub.clubId);
    setDraft(createDraftFromClub(nextClub));
    setActionState(null);
  };

  const handleSubmit = (): void => {
    if (draft === null || !canEditSelectedClub) {
      return;
    }

    setActionState(null);
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/club/profile", {
          body: JSON.stringify(draft),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PATCH",
        });
        const body: unknown = await response.json();

        if (!response.ok) {
          throw new Error(readErrorMessage(body, `Profile update failed with status ${response.status}.`));
        }

        if (!isClubProfileUpdateResponse(body)) {
          throw new Error("Profile update response was not in the expected format.");
        }

        setClubs((currentClubs) =>
          currentClubs.map((club) => (club.clubId === body.club.clubId ? body.club : club))
        );
        setDraft(createDraftFromClub(body.club));
        setActionState({
          message: copy.updated,
          tone: "success",
        });
      })().catch((error: unknown) => {
        setActionState({
          message: error instanceof Error ? error.message : "Profile update failed.",
          tone: "error",
        });
      });
    });
  };

  if (selectedClub === null || draft === null) {
    return (
      <section className="panel">
        <p className="eyebrow">{copy.profile}</p>
        <h2>{copy.emptyTitle}</h2>
        <p className="muted-text">{copy.emptyBody}</p>
      </section>
    );
  }

  return (
    <section className="stack-xl">
      <article className="panel">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">{copy.selectedClub}</p>
            <h2>{selectedClub.clubName}</h2>
            <p className="muted-text">{selectedClubMeta.length > 0 ? selectedClubMeta : selectedClub.membershipRole}</p>
          </div>
          {clubs.length > 1 ? (
            <label className="field compact-field">
              <span className="field-label">{copy.selectedClub}</span>
              <select className="field-input" onChange={(event) => handleClubChange(event.target.value)} value={selectedClub.clubId}>
                {clubs.map((club) => (
                  <option key={club.clubId} value={club.clubId}>
                    {club.clubName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="overview-strip">
          <article className="overview-tile overview-tile-neutral">
            <span className="overview-tile-label">{copy.role}</span>
            <strong className="overview-tile-value">{selectedClub.membershipRole}</strong>
            <p className="overview-tile-description">{canEditSelectedClub ? copy.save : copy.cannotEdit}</p>
          </article>
        </div>

        <div className="form-grid">
          <label className="field">
            <span className="field-label">{copy.contactEmail}</span>
            <input
              className="field-input"
              disabled={!canEditSelectedClub || isPending}
              onChange={(event) => setDraft((currentDraft) => currentDraft === null ? null : { ...currentDraft, contactEmail: event.target.value })}
              type="email"
              value={draft.contactEmail}
            />
          </label>
          <label className="field">
            <span className="field-label">{copy.phone}</span>
            <input
              className="field-input"
              disabled={!canEditSelectedClub || isPending}
              onChange={(event) => setDraft((currentDraft) => currentDraft === null ? null : { ...currentDraft, phone: event.target.value })}
              type="tel"
              value={draft.phone}
            />
          </label>
          <label className="field">
            <span className="field-label">{copy.address}</span>
            <input
              className="field-input"
              disabled={!canEditSelectedClub || isPending}
              onChange={(event) => setDraft((currentDraft) => currentDraft === null ? null : { ...currentDraft, address: event.target.value })}
              type="text"
              value={draft.address}
            />
          </label>
          <label className="field">
            <span className="field-label">{copy.website}</span>
            <input
              className="field-input"
              disabled={!canEditSelectedClub || isPending}
              onChange={(event) => setDraft((currentDraft) => currentDraft === null ? null : { ...currentDraft, websiteUrl: event.target.value })}
              type="url"
              value={draft.websiteUrl}
            />
          </label>
          <label className="field">
            <span className="field-label">{copy.instagram}</span>
            <input
              className="field-input"
              disabled={!canEditSelectedClub || isPending}
              onChange={(event) => setDraft((currentDraft) => currentDraft === null ? null : { ...currentDraft, instagramUrl: event.target.value })}
              type="url"
              value={draft.instagramUrl}
            />
          </label>
          <label className="field form-grid-full">
            <span className="field-label">{copy.announcement}</span>
            <textarea
              className="field-input field-textarea"
              disabled={!canEditSelectedClub || isPending}
              onChange={(event) => setDraft((currentDraft) => currentDraft === null ? null : { ...currentDraft, announcement: event.target.value })}
              rows={4}
              value={draft.announcement}
            />
          </label>
        </div>

        <button className="button button-primary" disabled={!canEditSelectedClub || isPending} onClick={handleSubmit} type="button">
          {isPending ? copy.saving : copy.save}
        </button>
        {actionState !== null ? (
          <p className={actionState.tone === "success" ? "inline-success" : "inline-error"}>{actionState.message}</p>
        ) : null}
      </article>
    </section>
  );
};
