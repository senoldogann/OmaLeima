"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  clubDepartmentTagRefreshableStatuses,
  submitClubDepartmentTagCreateRequestAsync,
  submitClubDepartmentTagDeleteRequestAsync,
  submitClubDepartmentTagUpdateRequestAsync,
} from "@/features/club-department-tags/department-tag-client";
import { formatManageableDepartmentTagClubMeta, formatOfficialDepartmentTagMeta } from "@/features/club-department-tags/format";
import type {
  ClubDepartmentTagActionState,
  ClubDepartmentTagCreatePayload,
  ClubDepartmentTagsSnapshot,
  ClubOfficialDepartmentTagRecord,
} from "@/features/club-department-tags/types";
import type { DashboardLocale } from "@/features/dashboard/i18n";
import { successNoticeDurationMs, useTransientSuccessKey } from "@/features/shared/use-transient-success-key";

type ClubDepartmentTagsPanelProps = {
  locale: DashboardLocale;
  snapshot: ClubDepartmentTagsSnapshot;
};

const createInitialPayload = (clubId: string): ClubDepartmentTagCreatePayload => ({
  clubId,
  title: "",
});

type EditingDepartmentTag = {
  departmentTagId: string;
  title: string;
};

const renderActionState = (state: ClubDepartmentTagActionState) => {
  if (state.message === null) {
    return null;
  }

  return <p className={state.tone === "success" ? "inline-success" : "inline-error"}>{state.message}</p>;
};

export const ClubDepartmentTagsPanel = ({ locale, snapshot }: ClubDepartmentTagsPanelProps) => {
  const router = useRouter();
  const isFinnish = locale === "fi";
  const [payload, setPayload] = useState<ClubDepartmentTagCreatePayload>(
    createInitialPayload(snapshot.clubs[0]?.clubId ?? "")
  );
  const [actionState, setActionState] = useState<ClubDepartmentTagActionState>({
    code: null,
    message: null,
    tone: "idle",
  });

  useTransientSuccessKey(
    actionState.tone === "success" ? actionState.message : null,
    () => setActionState({ code: null, message: null, tone: "idle" }),
    successNoticeDurationMs
  );
  const [isPending, setIsPending] = useState<boolean>(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<EditingDepartmentTag | null>(null);
  const [activeTab, setActiveTab] = useState<"community-catalog" | "publish-tag" | "tag-catalog">("community-catalog");
  const selectedClub = useMemo(
    () => snapshot.clubs.find((club) => club.clubId === payload.clubId) ?? null,
    [payload.clubId, snapshot.clubs]
  );

  const handleSubmitAsync = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsPending(true);
    setActionState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const response = await submitClubDepartmentTagCreateRequestAsync(payload);
      setActionState({
        code: response.status,
        message: response.message,
        tone: response.status === "SUCCESS" ? "success" : "error",
      });

      if (response.status !== null && clubDepartmentTagRefreshableStatuses.has(response.status)) {
        setPayload(createInitialPayload(payload.clubId));
        router.refresh();
      }
    } catch (error) {
      setActionState({
        code: "REQUEST_ERROR",
        message: error instanceof Error ? error.message : "Unknown department tag request error.",
        tone: "error",
      });
    } finally {
      setIsPending(false);
    }
  };

  const handleUpdateAsync = async (): Promise<void> => {
    if (editingTag === null) {
      return;
    }

    setPendingActionId(`update-${editingTag.departmentTagId}`);
    setActionState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const response = await submitClubDepartmentTagUpdateRequestAsync(editingTag);
      setActionState({
        code: response.status,
        message: response.message,
        tone: response.status === "SUCCESS" ? "success" : "error",
      });

      if (response.status !== null && clubDepartmentTagRefreshableStatuses.has(response.status)) {
        setEditingTag(null);
        router.refresh();
      }
    } catch (error) {
      setActionState({
        code: "REQUEST_ERROR",
        message: error instanceof Error ? error.message : "Unknown department tag update error.",
        tone: "error",
      });
    } finally {
      setPendingActionId(null);
    }
  };

  const handleDeleteAsync = async (tag: ClubOfficialDepartmentTagRecord): Promise<void> => {
    const confirmed = window.confirm(
      isFinnish
        ? `Poistetaanko virallinen tunniste "${tag.title}"?`
        : `Delete official department tag "${tag.title}"?`
    );

    if (!confirmed) {
      return;
    }

    setPendingActionId(`delete-${tag.departmentTagId}`);
    setActionState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const response = await submitClubDepartmentTagDeleteRequestAsync({
        departmentTagId: tag.departmentTagId,
      });
      setActionState({
        code: response.status,
        message: response.message,
        tone: response.status === "SUCCESS" ? "success" : "error",
      });

      if (response.status !== null && clubDepartmentTagRefreshableStatuses.has(response.status)) {
        if (editingTag?.departmentTagId === tag.departmentTagId) {
          setEditingTag(null);
        }
        router.refresh();
      }
    } catch (error) {
      setActionState({
        code: "REQUEST_ERROR",
        message: error instanceof Error ? error.message : "Unknown department tag delete error.",
        tone: "error",
      });
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <div className="stack-lg">
      <section className="metrics-grid">
        <article className="panel panel-accent">
          <div className="stack-sm">
            <span className="field-label">{isFinnish ? "Hallinnoidut klubit" : "Manageable clubs"}</span>
            <strong className="metric-value">{snapshot.summary.manageableClubCount}</strong>
            <p className="muted-text">
              {isFinnish
                ? "Järjestäjän hallinnoimat yhteisöt, joille virallisia opiskelualojen tunnisteita voi julkaista."
                : "Organizer-owned communities where official department tags can be published."}
            </p>
          </div>
        </article>

        <article className="panel">
          <div className="stack-sm">
            <span className="field-label">{isFinnish ? "Viralliset tunnisteet" : "Official tags"}</span>
            <strong className="metric-value">{snapshot.summary.totalOfficialTagCount}</strong>
            <p className="muted-text">
              {isFinnish
                ? `Viimeisin lista näyttää ${snapshot.summary.visibleOfficialTagCount} virallista tunnistetta tässä järjestäjäistunnossa.`
                : `Latest list shows ${snapshot.summary.visibleOfficialTagCount} official tag${snapshot.summary.visibleOfficialTagCount === 1 ? "" : "s"} in the current club session.`}
            </p>
          </div>
        </article>

        <article className="panel panel-warning">
          <div className="stack-sm">
            <span className="field-label">{isFinnish ? "Näkyvä raja" : "Visible limit"}</span>
            <strong className="metric-value">{snapshot.summary.visibleTagLimit}</strong>
            <p className="muted-text">
              {isFinnish
                ? "Pidä tunnisteet yhdenmukaisina, jotta admin-moderointi ei joudu siivoamaan vältettäviä duplikaatteja."
                : "Keep labels canonical so admin moderation does not need to clean up avoidable duplicates."}
            </p>
          </div>
        </article>
      </section>

      <div className="tab-nav">
        <button className={activeTab === "community-catalog" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("community-catalog")} type="button">{isFinnish ? "Yhteisöt" : "Community Catalog"}</button>
        <button className={activeTab === "publish-tag" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("publish-tag")} type="button">{isFinnish ? "Julkaise tunniste" : "Publish Tag"}</button>
        <button className={activeTab === "tag-catalog" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("tag-catalog")} type="button">{isFinnish ? "Tunnistekatalogi" : "Tag Catalog"}</button>
      </div>

      <section className="content-grid" style={{ display: activeTab === "tag-catalog" ? "none" : undefined }}>
        <div className="stack-md" style={activeTab === "community-catalog" ? { gridColumn: "1 / -1" } : { display: "none" }}>
          <div className="stack-sm">
            <div className="eyebrow">{isFinnish ? "Yhteisökatalogi" : "Community catalog"}</div>
            <h3 className="section-title">{isFinnish ? "Järjestäjäklubit" : "Organizer clubs"}</h3>
            <p className="muted-text">
              {isFinnish
                ? "Virallisista opiskelualojen tunnisteista tulee opiskelijoille näkyviä ehdotuksia. Vain järjestäjätason jäsenyydet voivat julkaista niitä."
                : "Official department tags become public suggestions for students. Only organizer-level memberships can publish them."}
            </p>
          </div>

          {snapshot.clubs.length === 0 ? (
            <article className="panel">
              <p className="muted-text">
                {isFinnish
                  ? "Virallisten tunnisteiden julkaisuun ei juuri nyt ole hallinnoituja klubeja."
                  : "No organizer-owned clubs are available for official department tag creation right now."}
              </p>
            </article>
          ) : (
            <div className="panel-table-wrap">
              <table className="panel-table">
                <thead>
                  <tr>
                    <th>{isFinnish ? "Klubi" : "Club"}</th>
                    <th>{isFinnish ? "Sijainti" : "Location"}</th>
                    <th>{isFinnish ? "Tunnisteet" : "Tags"}</th>
                    <th>{isFinnish ? "Pääsy" : "Access"}</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.clubs.map((club) => (
                    <tr key={club.clubId}>
                      <td>{club.clubName}</td>
                      <td className="record-meta">{formatManageableDepartmentTagClubMeta(club)}</td>
                      <td className="record-meta">{club.existingOfficialTagCount}</td>
                      <td><span className="status-pill status-pill-success">{isFinnish ? "Järjestäjäpääsy" : "Organizer access"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="stack-md" style={activeTab === "publish-tag" ? { gridColumn: "1 / -1" } : { display: "none" }}>
          <div className="stack-sm">
            <div className="eyebrow">{isFinnish ? "Julkaise virallinen tunniste" : "Publish official tag"}</div>
            <h3 className="section-title">{isFinnish ? "Uusi opiskelualan tunniste" : "New department tag"}</h3>
            <p className="muted-text">
              {isFinnish
                ? "Julkaise virallinen opiskelualan nimi, jonka opiskelijat näkevät ensimmäisenä profiilin tunnisteissa."
                : "Publish the official study label students should see first when they manage their profile tags."}
            </p>
          </div>

          {snapshot.clubs.length === 0 ? (
            <article className="panel">
              <p className="muted-text">
                {isFinnish
                  ? "Luo tai palauta järjestäjäpääsy klubiin ennen virallisten tunnisteiden julkaisua."
                  : "Create or regain organizer access to a club before publishing official tags."}
              </p>
            </article>
          ) : (
            <article className="panel">
              <form className="stack-md" onSubmit={(event) => void handleSubmitAsync(event)}>
                <label className="field">
                  <span className="field-label">{isFinnish ? "Klubi" : "Club"}</span>
                  <select
                    className="field-input"
                    disabled={isPending}
                    onChange={(event) =>
                      setPayload((currentPayload) => ({
                        ...currentPayload,
                        clubId: event.target.value,
                      }))
                    }
                    value={payload.clubId}
                  >
                    {snapshot.clubs.map((club) => (
                      <option key={club.clubId} value={club.clubId}>
                        {club.clubName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span className="field-label">{isFinnish ? "Tunnisteen nimi" : "Tag title"}</span>
                  <input
                    className="field-input"
                    disabled={isPending}
                    onChange={(event) =>
                      setPayload((currentPayload) => ({
                        ...currentPayload,
                        title: event.target.value,
                      }))
                    }
                    value={payload.title}
                  />
                </label>

                <p className="muted-text">
                  {selectedClub === null
                    ? isFinnish
                      ? "Valitse klubi virallisen opiskelualan tunnisteen julkaisuun."
                      : "Select a club to publish an official study label."
                    : isFinnish
                      ? `Tunniste julkaistaan klubille ${selectedClub.clubName}${selectedClub.universityName === null ? "" : ` / ${selectedClub.universityName}`}${selectedClub.city === null ? "" : ` / ${selectedClub.city}`}.`
                      : `This tag will be published under ${selectedClub.clubName}${selectedClub.universityName === null ? "" : ` for ${selectedClub.universityName}`}${selectedClub.city === null ? "" : ` in ${selectedClub.city}`}.`}
                </p>

                <button className="button button-primary" disabled={isPending} type="submit">
                  {isPending
                    ? isFinnish ? "Julkaistaan..." : "Publishing..."
                    : isFinnish ? "Julkaise virallinen tunniste" : "Publish official tag"}
                </button>
                {renderActionState(actionState)}
              </form>
            </article>
          )}
        </div>
      </section>

      <section className="stack-md" style={{ display: activeTab !== "tag-catalog" ? "none" : undefined }}>
        <div className="stack-sm">
          <div className="eyebrow">{isFinnish ? "Nykyinen katalogi" : "Current catalog"}</div>
          <h3 className="section-title">{isFinnish ? "Viralliset opiskelualojen tunnisteet" : "Official department tags"}</h3>
          <p className="muted-text">
            {isFinnish
              ? "Viimeksi julkaistut viralliset tunnisteet järjestäjän hallinnoimissa yhteisöissä."
              : "Latest published official tags across your organizer-owned communities."}
          </p>
        </div>

        {snapshot.officialTags.length === 0 ? (
          <article className="panel">
            <p className="muted-text">
              {isFinnish
                ? "Klubeillesi ei ole vielä julkaistu virallisia opiskelualojen tunnisteita."
                : "No official department tags have been published for your clubs yet."}
            </p>
          </article>
        ) : (
          <div className="panel-table-wrap">
            <table className="panel-table">
              <thead>
                <tr>
                  <th>{isFinnish ? "Tunniste" : "Tag"}</th>
                  <th>{isFinnish ? "Meta" : "Details"}</th>
                  <th>Slug</th>
                  <th>{isFinnish ? "Tila" : "Status"}</th>
                  <th>{isFinnish ? "Toiminnot" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.officialTags.map((tag) => {
                  const isEditing = editingTag?.departmentTagId === tag.departmentTagId;
                  const isUpdating = pendingActionId === `update-${tag.departmentTagId}`;
                  const isDeleting = pendingActionId === `delete-${tag.departmentTagId}`;

                  return (
                    <tr key={tag.departmentTagId}>
                      <td>
                        {isEditing ? (
                          <input
                            className="field-input"
                            disabled={isUpdating || isDeleting}
                            onChange={(event) =>
                              setEditingTag({
                                departmentTagId: tag.departmentTagId,
                                title: event.target.value,
                              })
                            }
                            value={editingTag.title}
                          />
                        ) : (
                          tag.title
                        )}
                      </td>
                      <td className="record-meta">{formatOfficialDepartmentTagMeta(tag)}</td>
                      <td className="record-meta">{tag.slug}</td>
                      <td><span className="status-pill status-pill-success">{isFinnish ? "Virallinen" : "Official"}</span></td>
                      <td>
                        <div className="action-row">
                          {isEditing ? (
                            <>
                              <button className="button button-primary" disabled={isUpdating || isDeleting} onClick={() => void handleUpdateAsync()} type="button">
                                {isUpdating ? isFinnish ? "Tallennetaan..." : "Saving..." : isFinnish ? "Tallenna" : "Save"}
                              </button>
                              <button className="button button-secondary" disabled={isUpdating || isDeleting} onClick={() => setEditingTag(null)} type="button">
                                {isFinnish ? "Peruuta" : "Cancel"}
                              </button>
                            </>
                          ) : (
                            <button
                              className="button button-secondary"
                              disabled={pendingActionId !== null}
                              onClick={() =>
                                setEditingTag({
                                  departmentTagId: tag.departmentTagId,
                                  title: tag.title,
                                })
                              }
                              type="button"
                            >
                              {isFinnish ? "Muokkaa" : "Edit"}
                            </button>
                          )}
                          <button
                            className="button button-danger"
                            disabled={pendingActionId !== null}
                            onClick={() => void handleDeleteAsync(tag)}
                            type="button"
                          >
                            {isDeleting ? isFinnish ? "Poistetaan..." : "Deleting..." : isFinnish ? "Poista" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {renderActionState(actionState)}
      </section>
    </div>
  );
};
