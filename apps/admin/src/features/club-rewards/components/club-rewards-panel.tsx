"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  formatManageableRewardEventMeta,
} from "@/features/club-rewards/format";
import { RewardTierCard } from "@/features/club-rewards/components/reward-tier-card";
import { rewardTierRefreshableStatuses, submitRewardTierCreateRequestAsync } from "@/features/club-rewards/reward-tier-client";
import type { DashboardLocale } from "@/features/dashboard/i18n";
import type {
  ClubRewardTierActionState,
  ClubRewardTierCreatePayload,
  ClubRewardsSnapshot,
} from "@/features/club-rewards/types";

type ClubRewardsPanelProps = {
  locale: DashboardLocale;
  snapshot: ClubRewardsSnapshot;
};

const copyByLocale = {
  en: {
    catalogBody: "Showing the latest reward tiers visible in this organizer session, including disabled tiers kept for stock history.",
    catalogEyebrow: "Reward catalog",
    catalogTitle: "Latest reward tiers",
    claimInstructions: "Claim instructions",
    claimedUnitsPrefix: "Claimed reward units currently visible across these tiers:",
    createButton: "Create reward tier",
    createEventRewardButton: "Create reward for this event",
    createRewardBody: "Publish reward thresholds for an event and keep claim instructions or stock notes in one place.",
    createRewardEyebrow: "Create reward",
    createRewardTab: "Create Reward",
    createRewardTitle: "New reward tier",
    description: "Description",
    editable: "Editable",
    emptyEditableEvents: "No editable events are available for reward tier management right now.",
    emptyEvents: "No club events are visible yet. Create an event first, then return here for rewards.",
    emptyRewardTiers: "No reward tiers are visible yet. Create the first reward tier for an event above.",
    event: "Event",
    eventCatalogBody: "Pick an active club event before publishing a new reward tier. Completed events stay visible for stock context but are not editable.",
    eventCatalogEyebrow: "Event catalog",
    eventCatalogTab: "Event Catalog",
    eventCatalogTitle: "Manageable events",
    inventoryTotal: "Inventory total",
    lowStockBody: "Reward tiers that are nearly out or fully exhausted based on claimed stock.",
    lowStockLabel: "Low-stock tiers",
    manageableEventsBody: "Club events where this organizer can review reward catalog visibility.",
    manageableEventsLabel: "Manageable events",
    readOnly: "Read-only",
    requiredStamps: "Required stamps",
    rewardCatalogTab: "Reward Catalog",
    rewardTierWord: "reward tier",
    rewardTiersWord: "reward tiers",
    rewardType: "Reward type",
    saving: "Saving...",
    title: "Title",
    totalTiersBodyPrefix: "Latest list shows",
    totalTiersBodySuffix: "in the current club session.",
    totalTiersLabel: "Total reward tiers",
    workflowBody: "Pick an editable event, define the stamp threshold, stock, and handoff instructions, then students unlock that tier from the same event scan progress used in mobile.",
    workflowEyebrow: "Reward workflow",
    workflowTitle: "Rewards are always attached to one event",
  },
  fi: {
    catalogBody: "Näytetään viimeisimmät tässä järjestäjäsessiossa näkyvät palkintotasot, myös varastohistoriaa varten säilytetyt pois käytöstä olevat tasot.",
    catalogEyebrow: "Palkintokatalogi",
    catalogTitle: "Viimeisimmät palkintotasot",
    claimInstructions: "Luovutusohjeet",
    claimedUnitsPrefix: "Näissä tasoissa näkyvät luovutetut palkintoyksiköt:",
    createButton: "Luo palkintotaso",
    createEventRewardButton: "Luo palkinto tälle tapahtumalle",
    createRewardBody: "Julkaise tapahtuman palkintorajat ja pidä luovutusohjeet sekä varastomuistiinpanot yhdessä paikassa.",
    createRewardEyebrow: "Luo palkinto",
    createRewardTab: "Luo palkinto",
    createRewardTitle: "Uusi palkintotaso",
    description: "Kuvaus",
    editable: "Muokattavissa",
    emptyEditableEvents: "Tällä hetkellä ei ole tapahtumia, joihin voi lisätä palkintotasoja.",
    emptyEvents: "Klubitapahtumia ei vielä näy. Luo ensin tapahtuma ja palaa sitten palkintoihin.",
    emptyRewardTiers: "Palkintotasoja ei vielä näy. Luo ensimmäinen palkintotaso yllä olevalle tapahtumalle.",
    event: "Tapahtuma",
    eventCatalogBody: "Valitse aktiivinen klubitapahtuma ennen uuden palkintotason julkaisua. Päättyneet tapahtumat näkyvät varastokontekstia varten, mutta niitä ei voi muokata.",
    eventCatalogEyebrow: "Tapahtumakatalogi",
    eventCatalogTab: "Tapahtumat",
    eventCatalogTitle: "Hallittavat tapahtumat",
    inventoryTotal: "Varasto yhteensä",
    lowStockBody: "Palkintotasot, jotka ovat vähissä tai loppuneet luovutetun varaston perusteella.",
    lowStockLabel: "Vähissä olevat tasot",
    manageableEventsBody: "Klubitapahtumat, joissa tämä järjestäjä voi tarkistaa palkintokatalogin näkyvyyden.",
    manageableEventsLabel: "Hallittavat tapahtumat",
    readOnly: "Vain luku",
    requiredStamps: "Vaaditut leimat",
    rewardCatalogTab: "Palkintokatalogi",
    rewardTierWord: "palkintotaso",
    rewardTiersWord: "palkintotasoa",
    rewardType: "Palkinnon tyyppi",
    saving: "Tallennetaan...",
    title: "Otsikko",
    totalTiersBodyPrefix: "Viimeisin lista näyttää",
    totalTiersBodySuffix: "tässä klubisessiossa.",
    totalTiersLabel: "Palkintotasoja yhteensä",
    workflowBody: "Valitse muokattava tapahtuma, määritä leimaraja, varasto ja luovutusohjeet. Opiskelijat avaavat tason samasta tapahtuman scan-edistymisestä kuin mobiilissa.",
    workflowEyebrow: "Palkintovirta",
    workflowTitle: "Palkinnot liitetään aina yhteen tapahtumaan",
  },
} as const satisfies Record<DashboardLocale, Record<string, string>>;

const createInitialPayload = (eventId: string): ClubRewardTierCreatePayload => ({
  claimInstructions: "",
  description: "",
  eventId,
  inventoryTotal: "",
  requiredStampCount: "1",
  rewardType: "HAALARIMERKKI",
  title: "",
});

const renderActionState = (state: ClubRewardTierActionState) => {
  if (state.message === null) {
    return null;
  }

  return <p className={state.tone === "success" ? "inline-success" : "inline-error"}>{state.message}</p>;
};

export const ClubRewardsPanel = ({ locale, snapshot }: ClubRewardsPanelProps) => {
  const router = useRouter();
  const copy = copyByLocale[locale];
  const editableEvents = useMemo(
    () => snapshot.events.filter((event) => event.canManageRewards),
    [snapshot.events]
  );
  const [payload, setPayload] = useState<ClubRewardTierCreatePayload>(
    createInitialPayload(editableEvents[0]?.eventId ?? "")
  );
  const [actionState, setActionState] = useState<ClubRewardTierActionState>({
    code: null,
    message: null,
    tone: "idle",
  });
  const [isPending, setIsPending] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"event-catalog" | "create-reward" | "reward-catalog">("event-catalog");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsPending(true);
    setActionState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const response = await submitRewardTierCreateRequestAsync(payload);
      setActionState({
        code: response.status,
        message: response.message,
        tone: response.status === "SUCCESS" ? "success" : "error",
      });

      if (response.status !== null && rewardTierRefreshableStatuses.has(response.status)) {
        setPayload(createInitialPayload(payload.eventId));
        router.refresh();
      }
    } catch (error) {
      setActionState({
        code: "REQUEST_ERROR",
        message: error instanceof Error ? error.message : "Unknown reward tier request error.",
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
            <span className="field-label">{copy.manageableEventsLabel}</span>
            <strong className="metric-value">{snapshot.summary.manageableEventCount}</strong>
            <p className="muted-text">{copy.manageableEventsBody}</p>
          </div>
        </article>

        <article className="panel">
          <div className="stack-sm">
            <span className="field-label">{copy.totalTiersLabel}</span>
            <strong className="metric-value">{snapshot.summary.totalTierCount}</strong>
            <p className="muted-text">
              {copy.totalTiersBodyPrefix} {snapshot.summary.visibleTierCount} {snapshot.summary.visibleTierCount === 1 ? copy.rewardTierWord : copy.rewardTiersWord} {copy.totalTiersBodySuffix}
            </p>
          </div>
        </article>

        <article className="panel panel-warning">
          <div className="stack-sm">
            <span className="field-label">{copy.lowStockLabel}</span>
            <strong className="metric-value">{snapshot.summary.lowStockTierCount}</strong>
            <p className="muted-text">{copy.lowStockBody}</p>
          </div>
        </article>
      </section>

      <div className="tab-nav">
        <button className={activeTab === "event-catalog" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("event-catalog")} type="button">{copy.eventCatalogTab}</button>
        <button className={activeTab === "create-reward" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("create-reward")} type="button">{copy.createRewardTab}</button>
        <button className={activeTab === "reward-catalog" ? "tab-btn tab-btn-active" : "tab-btn"} onClick={() => setActiveTab("reward-catalog")} type="button">{copy.rewardCatalogTab}</button>
      </div>

      <section className="panel">
        <div className="stack-sm">
          <div className="eyebrow">{copy.workflowEyebrow}</div>
          <h3 className="section-title">{copy.workflowTitle}</h3>
          <p className="muted-text">{copy.workflowBody}</p>
        </div>
      </section>

      <section className="content-grid" style={{ display: activeTab === "reward-catalog" ? "none" : undefined }}>
        <div className="stack-md" style={activeTab === "event-catalog" ? { gridColumn: "1 / -1" } : { display: "none" }}>
          <div className="stack-sm">
            <div className="eyebrow">{copy.eventCatalogEyebrow}</div>
            <h3 className="section-title">{copy.eventCatalogTitle}</h3>
            <p className="muted-text">{copy.eventCatalogBody}</p>
          </div>

          {snapshot.events.length === 0 ? (
            <article className="panel">
              <p className="muted-text">{copy.emptyEvents}</p>
            </article>
          ) : (
            <div className="content-grid">
              {snapshot.events.map((event) => (
                <article key={event.eventId} className="panel review-card-compact">
                  <div className="stack-sm">
                    <h3 className="section-title">{event.name}</h3>
                    <p className="muted-text">{formatManageableRewardEventMeta(event)}</p>
                    <p className="review-note">
                      {event.rewardTierCount} {event.rewardTierCount === 1 ? copy.rewardTierWord : copy.rewardTiersWord} · {event.eventStatus}
                    </p>
                    <span className={event.canManageRewards ? "status-pill status-pill-success" : "status-pill"}>
                      {event.canManageRewards ? copy.editable : copy.readOnly}
                    </span>
                    {event.canManageRewards ? (
                      <button
                        className="button button-secondary"
                        onClick={() => {
                          setPayload((currentPayload) => ({
                            ...currentPayload,
                            eventId: event.eventId,
                          }));
                          setActiveTab("create-reward");
                        }}
                        type="button"
                      >
                        {copy.createEventRewardButton}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="stack-md" style={activeTab === "create-reward" ? { gridColumn: "1 / -1" } : { display: "none" }}>
          <div className="stack-sm">
            <div className="eyebrow">{copy.createRewardEyebrow}</div>
            <h3 className="section-title">{copy.createRewardTitle}</h3>
            <p className="muted-text">{copy.createRewardBody}</p>
          </div>

          {editableEvents.length === 0 ? (
            <article className="panel">
              <p className="muted-text">{copy.emptyEditableEvents}</p>
            </article>
          ) : (
            <article className="panel">
              <form className="stack-md" onSubmit={(event) => void handleSubmit(event)}>
                <label className="field">
                  <span className="field-label">{copy.event}</span>
                  <select
                    className="field-input"
                    disabled={isPending}
                    onChange={(event) =>
                      setPayload((currentPayload) => ({
                        ...currentPayload,
                        eventId: event.target.value,
                      }))
                    }
                    value={payload.eventId}
                  >
                    {editableEvents.map((event) => (
                      <option key={event.eventId} value={event.eventId}>
                        {event.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="detail-grid">
                  <label className="field">
                    <span className="field-label">{copy.title}</span>
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

                  <label className="field">
                    <span className="field-label">{copy.rewardType}</span>
                    <select
                      className="field-input"
                      disabled={isPending}
                      onChange={(event) =>
                        setPayload((currentPayload) => ({
                          ...currentPayload,
                          rewardType: event.target.value as ClubRewardTierCreatePayload["rewardType"],
                        }))
                      }
                      value={payload.rewardType}
                    >
                      <option value="HAALARIMERKKI">Haalarimerkki</option>
                      <option value="PATCH">Patch</option>
                      <option value="COUPON">Coupon</option>
                      <option value="PRODUCT">Product</option>
                      <option value="ENTRY">Entry</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>

                  <label className="field">
                    <span className="field-label">{copy.requiredStamps}</span>
                    <input
                      className="field-input"
                      disabled={isPending}
                      onChange={(event) =>
                        setPayload((currentPayload) => ({
                          ...currentPayload,
                          requiredStampCount: event.target.value,
                        }))
                      }
                      type="number"
                      value={payload.requiredStampCount}
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">{copy.inventoryTotal}</span>
                    <input
                      className="field-input"
                      disabled={isPending}
                      onChange={(event) =>
                        setPayload((currentPayload) => ({
                          ...currentPayload,
                          inventoryTotal: event.target.value,
                        }))
                      }
                      type="number"
                      value={payload.inventoryTotal}
                    />
                  </label>
                </div>

                <label className="field">
                  <span className="field-label">{copy.description}</span>
                  <textarea
                    className="field-input field-textarea"
                    disabled={isPending}
                    onChange={(event) =>
                      setPayload((currentPayload) => ({
                        ...currentPayload,
                        description: event.target.value,
                      }))
                    }
                    value={payload.description}
                  />
                </label>

                <label className="field">
                  <span className="field-label">{copy.claimInstructions}</span>
                  <textarea
                    className="field-input field-textarea"
                    disabled={isPending}
                    onChange={(event) =>
                      setPayload((currentPayload) => ({
                        ...currentPayload,
                        claimInstructions: event.target.value,
                      }))
                    }
                    value={payload.claimInstructions}
                  />
                </label>

                <button className="button button-primary" disabled={isPending} type="submit">
                  {isPending ? copy.saving : copy.createButton}
                </button>
                {renderActionState(actionState)}
              </form>
            </article>
          )}
        </div>
      </section>

      <section className="stack-md" style={{ display: activeTab !== "reward-catalog" ? "none" : undefined }}>
        <div className="stack-sm">
          <div className="eyebrow">{copy.catalogEyebrow}</div>
          <h3 className="section-title">{copy.catalogTitle}</h3>
          <p className="muted-text">{copy.catalogBody}</p>
        </div>

        {snapshot.rewardTiers.length === 0 ? (
          <article className="panel">
            <p className="muted-text">{copy.emptyRewardTiers}</p>
          </article>
        ) : (
          <div className="review-grid">
            {snapshot.rewardTiers.map((tier) => (
              <RewardTierCard key={tier.rewardTierId} tier={tier} />
            ))}
          </div>
        )}

        <p className="muted-text">{copy.claimedUnitsPrefix} {snapshot.summary.claimedUnitCount}.</p>
      </section>
    </div>
  );
};
