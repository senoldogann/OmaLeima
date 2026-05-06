"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { OfficialDepartmentTagCard } from "@/features/club-department-tags/components/official-department-tag-card";
import {
  clubDepartmentTagRefreshableStatuses,
  submitClubDepartmentTagCreateRequestAsync,
} from "@/features/club-department-tags/department-tag-client";
import { formatManageableDepartmentTagClubMeta } from "@/features/club-department-tags/format";
import type {
  ClubDepartmentTagActionState,
  ClubDepartmentTagCreatePayload,
  ClubDepartmentTagsSnapshot,
} from "@/features/club-department-tags/types";

type ClubDepartmentTagsPanelProps = {
  snapshot: ClubDepartmentTagsSnapshot;
};

const createInitialPayload = (clubId: string): ClubDepartmentTagCreatePayload => ({
  clubId,
  title: "",
});

const renderActionState = (state: ClubDepartmentTagActionState) => {
  if (state.message === null) {
    return null;
  }

  return <p className={state.tone === "success" ? "inline-success" : "inline-error"}>{state.message}</p>;
};

export const ClubDepartmentTagsPanel = ({ snapshot }: ClubDepartmentTagsPanelProps) => {
  const router = useRouter();
  const [payload, setPayload] = useState<ClubDepartmentTagCreatePayload>(
    createInitialPayload(snapshot.clubs[0]?.clubId ?? "")
  );
  const [actionState, setActionState] = useState<ClubDepartmentTagActionState>({
    code: null,
    message: null,
    tone: "idle",
  });
  const [isPending, setIsPending] = useState<boolean>(false);
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

  return (
    <div className="stack-lg">
      <section className="metrics-grid">
        <article className="panel panel-accent">
          <div className="stack-sm">
            <span className="field-label">Manageable clubs</span>
            <strong className="metric-value">{snapshot.summary.manageableClubCount}</strong>
            <p className="muted-text">Organizer-owned communities where official department tags can be published.</p>
          </div>
        </article>

        <article className="panel">
          <div className="stack-sm">
            <span className="field-label">Official tags</span>
            <strong className="metric-value">{snapshot.summary.totalOfficialTagCount}</strong>
            <p className="muted-text">
              Latest list shows {snapshot.summary.visibleOfficialTagCount} official tag{snapshot.summary.visibleOfficialTagCount === 1 ? "" : "s"} in the current club session.
            </p>
          </div>
        </article>

        <article className="panel panel-warning">
          <div className="stack-sm">
            <span className="field-label">Visible limit</span>
            <strong className="metric-value">{snapshot.summary.visibleTagLimit}</strong>
            <p className="muted-text">Keep labels canonical so admin moderation does not need to clean up avoidable duplicates.</p>
          </div>
        </article>
      </section>

      <div className="tab-nav">
        <button className={activeTab === "community-catalog" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("community-catalog")} type="button">Community Catalog</button>
        <button className={activeTab === "publish-tag" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("publish-tag")} type="button">Publish Tag</button>
        <button className={activeTab === "tag-catalog" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("tag-catalog")} type="button">Tag Catalog</button>
      </div>

      <section className="content-grid" style={{ display: activeTab === "tag-catalog" ? "none" : undefined }}>
        <div className="stack-md" style={activeTab === "community-catalog" ? { gridColumn: "1 / -1" } : { display: "none" }}>
          <div className="stack-sm">
            <div className="eyebrow">Community catalog</div>
            <h3 className="section-title">Organizer clubs</h3>
            <p className="muted-text">
              Official department tags become public suggestions for students. Only organizer-level memberships can publish them.
            </p>
          </div>

          {snapshot.clubs.length === 0 ? (
            <article className="panel">
              <p className="muted-text">No organizer-owned clubs are available for official department tag creation right now.</p>
            </article>
          ) : (
            <div className="content-grid">
              {snapshot.clubs.map((club) => (
                <article key={club.clubId} className="panel review-card-compact">
                  <div className="stack-sm">
                    <p className="card-title">{club.clubName}</p>
                    <p className="muted-text">{formatManageableDepartmentTagClubMeta(club)}</p>
                    <p className="review-note">
                      {club.existingOfficialTagCount} official tag{club.existingOfficialTagCount === 1 ? "" : "s"}
                    </p>
                    <span className="status-pill status-pill-success">Organizer access</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="stack-md" style={activeTab === "publish-tag" ? { gridColumn: "1 / -1" } : { display: "none" }}>
          <div className="stack-sm">
            <div className="eyebrow">Publish official tag</div>
            <h3 className="section-title">New department tag</h3>
            <p className="muted-text">
              Publish the official study label students should see first when they manage their profile tags.
            </p>
          </div>

          {snapshot.clubs.length === 0 ? (
            <article className="panel">
              <p className="muted-text">Create or regain organizer access to a club before publishing official tags.</p>
            </article>
          ) : (
            <article className="panel">
              <form className="stack-md" onSubmit={(event) => void handleSubmitAsync(event)}>
                <label className="field">
                  <span className="field-label">Club</span>
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
                  <span className="field-label">Tag title</span>
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
                    ? "Select a club to publish an official study label."
                    : `This tag will be published under ${selectedClub.clubName}${selectedClub.universityName === null ? "" : ` for ${selectedClub.universityName}`}${selectedClub.city === null ? "" : ` in ${selectedClub.city}`}.`}
                </p>

                <button className="button button-primary" disabled={isPending} type="submit">
                  {isPending ? "Publishing..." : "Publish official tag"}
                </button>
                {renderActionState(actionState)}
              </form>
            </article>
          )}
        </div>
      </section>

      <section className="stack-md" style={{ display: activeTab !== "tag-catalog" ? "none" : undefined }}>
        <div className="stack-sm">
          <div className="eyebrow">Current catalog</div>
          <h3 className="section-title">Official department tags</h3>
          <p className="muted-text">Latest published official tags across your organizer-owned communities.</p>
        </div>

        {snapshot.officialTags.length === 0 ? (
          <article className="panel">
            <p className="muted-text">No official department tags have been published for your clubs yet.</p>
          </article>
        ) : (
          <div className="review-grid">
            {snapshot.officialTags.map((tag) => (
              <OfficialDepartmentTagCard key={tag.departmentTagId} tag={tag} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
