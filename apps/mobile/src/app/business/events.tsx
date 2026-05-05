import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "expo-router";
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import {
  useJoinBusinessEventMutation,
  useLeaveBusinessEventMutation,
} from "@/features/business/business-events";
import { useBusinessHomeOverviewQuery } from "@/features/business/business-home";
import type {
  BusinessJoinEventStatus,
  BusinessLeaveEventStatus,
  BusinessOpportunitySummary,
  BusinessJoinedEventSummary,
} from "@/features/business/types";
import { getEventCoverSource, getFallbackCoverSource } from "@/features/events/event-visuals";
import { findOverlappingEvents } from "@/features/events/event-overlaps";
import { useManualRefresh } from "@/features/foundation/use-manual-refresh";
import type { MobileTheme } from "@/features/foundation/theme";
import { interactiveSurfaceShadowStyle } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

type FeedbackState = {
  tone: "ready" | "warning";
  title: string;
  message: string;
};

type EventPreview =
  | {
    event: BusinessJoinedEventSummary;
    kind: "joined";
  }
  | {
    event: BusinessOpportunitySummary;
    kind: "opportunity";
  };

const formatDateTime = (formatter: Intl.DateTimeFormat, value: string): string =>
  formatter.format(new Date(value));

const getJoinedEventBadge = (
  event: BusinessJoinedEventSummary,
  language: "fi" | "en"
): { label: string; state: "pending" | "ready" | "warning" } => {
  switch (event.timelineState) {
    case "ACTIVE":
      return { label: language === "fi" ? "Live" : "Live", state: "ready" };
    case "UPCOMING":
      return { label: language === "fi" ? "Tulossa" : "Upcoming", state: "pending" };
    case "COMPLETED":
      return { label: language === "fi" ? "Päättynyt" : "Completed", state: "warning" };
  }
};

const getPreviewEvent = (preview: EventPreview): BusinessJoinedEventSummary | BusinessOpportunitySummary =>
  preview.event;

const createJoinResultMessages = (
  language: "fi" | "en"
): Record<BusinessJoinEventStatus, string> => ({
  SUCCESS:
    language === "fi"
      ? "Yritys liitettiin tapahtumaan onnistuneesti."
      : "Business joined the event successfully.",
  ALREADY_JOINED:
    language === "fi"
      ? "Yritys on jo liitetty tähän tapahtumaan."
      : "This business already joined the event.",
  EVENT_NOT_FOUND:
    language === "fi"
      ? "Tapahtumaa ei enää löytynyt."
      : "The event was not found anymore.",
  EVENT_NOT_AVAILABLE:
    language === "fi"
      ? "Tapahtumaa ei voi liittää yritykselle juuri nyt."
      : "This event is not available for business joining.",
  EVENT_JOIN_CLOSED:
    language === "fi"
      ? "Liittymisikkuna on jo sulkeutunut."
      : "Join window has already closed for this event.",
  BUSINESS_NOT_ACTIVE:
    language === "fi"
      ? "Valittu yritys ei ole enää aktiivinen."
      : "The target business is not active anymore.",
  BUSINESS_STAFF_NOT_ALLOWED:
    language === "fi"
      ? "Tällä tunnuksella ei voi liittää tätä yritystä tapahtumaan."
      : "This account cannot join events for that business.",
  PROFILE_NOT_ACTIVE:
    language === "fi"
      ? "Profiili ei ole aktiivinen."
      : "The profile is no longer active.",
  PROFILE_NOT_FOUND:
    language === "fi"
      ? "Profiilia ei löytynyt."
      : "The profile could not be found.",
  VENUE_REMOVED:
    language === "fi"
      ? "Tämä piste on poistettu tapahtumasta eikä sitä voi liittää uudelleen."
      : "This venue was removed from the event and cannot self-rejoin.",
  AUTH_REQUIRED:
    language === "fi" ? "Kirjaudu sisään uudelleen." : "Sign in again.",
  ACTOR_NOT_ALLOWED:
    language === "fi"
      ? "Toimijalla ei ole oikeutta tähän pyyntöön."
      : "The current actor is not allowed to do this.",
});

const createLeaveResultMessages = (
  language: "fi" | "en"
): Record<BusinessLeaveEventStatus, string> => ({
  SUCCESS:
    language === "fi"
      ? "Yritys poistui tapahtumasta ennen live-vaihetta."
      : "Business left the event before the live window started.",
  EVENT_NOT_FOUND:
    language === "fi"
      ? "Tapahtumaa ei enää löytynyt."
      : "The event was not found anymore.",
  EVENT_LEAVE_CLOSED:
    language === "fi"
      ? "Poistumisikkuna sulkeutui, koska tapahtuma on jo alkanut tai tila muuttui."
      : "Leave window closed because the event has already started or changed state.",
  BUSINESS_NOT_ACTIVE:
    language === "fi"
      ? "Valittu yritys ei ole enää aktiivinen."
      : "The target business is not active anymore.",
  BUSINESS_STAFF_NOT_ALLOWED:
    language === "fi"
      ? "Tällä tunnuksella ei voi poistaa tätä yritystä tapahtumasta."
      : "This account cannot leave events for that business.",
  VENUE_NOT_FOUND:
    language === "fi"
      ? "Tälle yritykselle ei löytynyt pistettä tapahtumasta."
      : "No venue row was found for this business on that event.",
  VENUE_NOT_JOINED:
    language === "fi"
      ? "Yritys ei ole tällä hetkellä mukana tässä tapahtumassa."
      : "This business is not currently joined to that event.",
  VENUE_ALREADY_LEFT:
    language === "fi"
      ? "Yritys on jo poistunut tästä tulevasta tapahtumasta."
      : "This business already left that upcoming event.",
  VENUE_REMOVED:
    language === "fi"
      ? "Tämä piste on poistettu tapahtumasta eikä sitä voi hallita itse."
      : "This venue was removed from the event and cannot self-manage anymore.",
  PROFILE_NOT_FOUND:
    language === "fi" ? "Profiilia ei löytynyt." : "The profile could not be found.",
  PROFILE_NOT_ACTIVE:
    language === "fi" ? "Profiili ei ole aktiivinen." : "The profile is no longer active.",
  AUTH_REQUIRED:
    language === "fi" ? "Kirjaudu sisään uudelleen." : "Sign in again.",
  ACTOR_NOT_ALLOWED:
    language === "fi"
      ? "Toimijalla ei ole oikeutta tähän pyyntöön."
      : "The current actor is not allowed to do this.",
});

const createFeedback = (
  language: "fi" | "en",
  joinStatus: BusinessJoinEventStatus | undefined,
  leaveStatus: BusinessLeaveEventStatus | undefined
): FeedbackState | null => {
  if (typeof joinStatus !== "undefined") {
    const messages = createJoinResultMessages(language);

    return {
      tone: joinStatus === "SUCCESS" || joinStatus === "ALREADY_JOINED" ? "ready" : "warning",
      title: joinStatus,
      message: messages[joinStatus],
    };
  }

  if (typeof leaveStatus !== "undefined") {
    const messages = createLeaveResultMessages(language);

    return {
      tone: leaveStatus === "SUCCESS" ? "ready" : "warning",
      title: leaveStatus,
      message: messages[leaveStatus],
    };
  }

  return null;
};

export default function BusinessEventsScreen() {
  const router = useRouter();
  const styles = useThemeStyles(createStyles);
  const { session } = useSession();
  const { copy, language, localeTag, theme } = useUiPreferences();
  const userId = session?.user.id ?? null;
  const [preview, setPreview] = useState<EventPreview | null>(null);

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [localeTag]
  );

  const labels = useMemo(
    () => ({
      loadingTitle: language === "fi" ? "Avataan tapahtumia" : "Opening business events",
      loadingBody:
        language === "fi"
          ? "Ladataan liittyneet tapahtumat ja avoimet mahdollisuudet."
          : "Loading joined events and public opportunities for this account.",
      errorTitle:
        language === "fi"
          ? "Yritystapahtumat eivät latautuneet"
          : "Could not load business events",
      requestFailedTitle: language === "fi" ? "Pyyntö epäonnistui" : "Request failed",
      updateEyebrow: language === "fi" ? "Päivitys" : "Update",
      queueEmptyBody: copy.business.noActiveEvents,
      joinedNextEmptyBody:
        language === "fi"
          ? "Ei vielä yhtään tulevaa liittynyttä tapahtumaa."
          : "No upcoming joined event yet.",
      availableEmptyBody:
        language === "fi"
          ? "Tällä tunnuksella ei ole hallittavia tapahtumaliittymisiä juuri nyt."
          : "This account does not have manageable event joins right now.",
      pastJoinedTitle: language === "fi" ? "Aiemmat tapahtumat" : "Past joined events",
      pastJoinedEmptyBody:
        language === "fi"
          ? "Tällä yrityksellä ei ole vielä päättyneitä liittyneitä tapahtumia."
          : "This business does not have past joined events yet.",
      endedAt: language === "fi" ? "Päättyi" : "Ended",
      closePreview: language === "fi" ? "Sulje" : "Close",
      eventPreview: language === "fi" ? "Tapahtuman tiedot" : "Event details",
      description: language === "fi" ? "Kuvaus" : "Description",
      noDescription:
        language === "fi"
          ? "Tälle tapahtumalle ei ole vielä lisätty kuvausta."
          : "No description has been added for this event yet.",
      venue: language === "fi" ? "Piste" : "Venue",
      openScanner: copy.business.openScanner,
      openHistory: copy.business.history,
      leaveEvent: language === "fi" ? "Poistu tapahtumasta" : "Leave event",
      leavingEvent: language === "fi" ? "Poistutaan..." : "Leaving...",
      joinEvent: language === "fi" ? "Liity tapahtumaan" : "Join event",
      joiningEvent: language === "fi" ? "Liitytään..." : "Joining...",
      joinDeadline: language === "fi" ? "Liittyminen sulkeutuu" : "Join deadline",
    }),
    [copy.business.history, copy.business.noActiveEvents, copy.business.openScanner, language]
  );

  const homeOverviewQuery = useBusinessHomeOverviewQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });
  const manualRefresh = useManualRefresh(homeOverviewQuery.refetch);
  const joinMutation = useJoinBusinessEventMutation(userId ?? "");
  const leaveMutation = useLeaveBusinessEventMutation(userId ?? "");

  const activeJoinedEvents = homeOverviewQuery.data?.joinedActiveEvents ?? [];
  const upcomingJoinedEvents = homeOverviewQuery.data?.joinedUpcomingEvents ?? [];
  const completedJoinedEvents = homeOverviewQuery.data?.joinedCompletedEvents ?? [];
  const cityOpportunities = homeOverviewQuery.data?.cityOpportunities ?? [];
  const canManageEventMemberships =
    homeOverviewQuery.data?.memberships.some((membership) => membership.role !== "SCANNER") ?? false;
  const overlappingEvents = useMemo(
    () => {
      if (typeof homeOverviewQuery.data === "undefined") {
        return [];
      }

      return findOverlappingEvents(
        [
          ...homeOverviewQuery.data.joinedActiveEvents,
          ...homeOverviewQuery.data.joinedUpcomingEvents,
          ...homeOverviewQuery.data.cityOpportunities,
        ].map((event) => ({
          endAt: event.endAt,
          id: event.eventId,
          name: event.eventName,
          startAt: event.startAt,
        }))
      );
    },
    [homeOverviewQuery.data]
  );

  const activeJoinKey = joinMutation.variables
    ? `${joinMutation.variables.businessId}:${joinMutation.variables.eventId}`
    : null;
  const activeLeaveKey = leaveMutation.variables
    ? `${leaveMutation.variables.businessId}:${leaveMutation.variables.eventId}`
    : null;

  const feedback = useMemo(
    () => createFeedback(language, joinMutation.data?.status, leaveMutation.data?.status),
    [joinMutation.data?.status, language, leaveMutation.data?.status]
  );
  const previewEvent = preview === null ? null : getPreviewEvent(preview);
  const previewBadge =
    preview === null
      ? null
      : preview.kind === "joined"
        ? getJoinedEventBadge(preview.event, language)
        : { label: language === "fi" ? "Liityttävissä" : "Joinable", state: "pending" as const };

  const renderJoinedEventCard = (
    event: BusinessJoinedEventSummary,
    primaryAction: ReactNode
  ) => {
    const badge = getJoinedEventBadge(event, language);

    return (
      <View key={event.eventVenueId} style={styles.railCard}>
        <Pressable onPress={() => setPreview({ event, kind: "joined" })} style={styles.cardPreviewButton}>
          <CoverImageSurface
            fallbackSource={getFallbackCoverSource("eventDiscovery")}
            imageStyle={styles.cardCoverImage}
            source={getEventCoverSource(event.coverImageUrl, `${event.eventId}:${event.eventName}`)}
            style={styles.cardCover}
          >
            <View style={styles.cardCoverOverlay} />
            <View style={styles.cardCoverContent}>
              <StatusBadge label={badge.label} state={badge.state} />
              <Text numberOfLines={2} style={styles.coverTitle}>{event.eventName}</Text>
            </View>
          </CoverImageSurface>
          <View style={styles.cardBody}>
            <Text numberOfLines={1} style={styles.metaText}>{event.businessName} · {event.city}</Text>
            <Text numberOfLines={1} style={styles.metaText}>
              {event.timelineState === "ACTIVE"
                ? `${language === "fi" ? "Päättyy" : "Ends"} ${formatDateTime(formatter, event.endAt)}`
                : event.timelineState === "UPCOMING"
                  ? `${language === "fi" ? "Alkaa" : "Starts"} ${formatDateTime(formatter, event.startAt)}`
                  : `${labels.endedAt} ${formatDateTime(formatter, event.endAt)}`}
            </Text>
            {event.stampLabel ? <Text numberOfLines={1} style={styles.eventStamp}>{event.stampLabel}</Text> : null}
          </View>
        </Pressable>
        {primaryAction === null ? null : <View style={styles.cardActionSlot}>{primaryAction}</View>}
      </View>
    );
  };

  const renderOpportunityCard = (event: BusinessOpportunitySummary) => {
    const joinKey = `${event.businessId}:${event.eventId}`;
    const isPending = joinMutation.isPending && activeJoinKey === joinKey;

    return (
      <View key={joinKey} style={styles.railCard}>
        <Pressable onPress={() => setPreview({ event, kind: "opportunity" })} style={styles.cardPreviewButton}>
          <CoverImageSurface
            fallbackSource={getFallbackCoverSource("eventDiscovery")}
            imageStyle={styles.cardCoverImage}
            source={getEventCoverSource(event.coverImageUrl, `${event.eventId}:${event.eventName}`)}
            style={styles.cardCover}
          >
            <View style={styles.cardCoverOverlay} />
            <View style={styles.cardCoverContent}>
              <StatusBadge label={language === "fi" ? "Liityttävissä" : "Joinable"} state="pending" />
              <Text numberOfLines={2} style={styles.coverTitle}>{event.eventName}</Text>
            </View>
          </CoverImageSurface>
          <View style={styles.cardBody}>
            <Text numberOfLines={1} style={styles.metaText}>{event.city}</Text>
            <Text numberOfLines={1} style={styles.metaText}>
              {labels.joinDeadline} {formatDateTime(formatter, event.joinDeadlineAt)}
            </Text>
          </View>
        </Pressable>
        <Pressable
          disabled={userId === null || isPending}
          onPress={() => {
            if (userId === null) {
              return;
            }

            void joinMutation.mutateAsync({
              eventId: event.eventId,
              businessId: event.businessId,
              staffUserId: userId,
            });
          }}
          style={[styles.primaryButton, isPending ? styles.disabledButton : null]}
        >
          <Text style={styles.primaryButtonText}>
            {isPending ? labels.joiningEvent : labels.joinEvent}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          onRefresh={manualRefresh.refreshAsync}
          refreshing={manualRefresh.isRefreshing}
          tintColor={theme.colors.lime}
        />
      }
    >
      <View style={styles.topBar}>
        <View style={styles.topBarCopy}>
          <Text style={styles.topBarEyebrow}>{language === "fi" ? "Yritys" : "Business"}</Text>
          <Text style={styles.screenTitle}>{copy.common.events}</Text>
          <Text style={styles.metaText}>{copy.business.eventsMeta}</Text>
        </View>
      </View>

      {homeOverviewQuery.isLoading ? (
        <InfoCard eyebrow={copy.common.loading} title={labels.loadingTitle}>
          <Text style={styles.bodyText}>{labels.loadingBody}</Text>
        </InfoCard>
      ) : null}

      {homeOverviewQuery.error ? (
        <InfoCard eyebrow={copy.common.error} title={labels.errorTitle}>
          <Text style={styles.bodyText}>{homeOverviewQuery.error.message}</Text>
          <Pressable onPress={() => void homeOverviewQuery.refetch()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{copy.common.retry}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {joinMutation.isError || leaveMutation.isError ? (
        <InfoCard eyebrow={copy.common.error} title={labels.requestFailedTitle}>
          <Text style={styles.bodyText}>
            {joinMutation.error?.message ?? leaveMutation.error?.message}
          </Text>
        </InfoCard>
      ) : null}

      {feedback ? (
        <InfoCard eyebrow={labels.updateEyebrow} title={feedback.title}>
          <View style={styles.feedbackRow}>
            <StatusBadge label={feedback.tone} state={feedback.tone} />
            <Text style={styles.bodyText}>{feedback.message}</Text>
          </View>
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error && overlappingEvents.length > 1 ? (
        <InfoCard
          eyebrow={language === "fi" ? "Huomio" : "Heads up"}
          title={language === "fi" ? "Samanaikaisia tapahtumia" : "Overlapping events"}
          variant="subtle"
        >
          <Text style={styles.bodyText}>
            {language === "fi"
              ? "Kun samaan aikaan on useita tapahtumia, valitse skannerissa aina oikea tapahtumapiste ennen leiman antamista. QR ja skannaus sidotaan tapahtumaan."
              : "When multiple events overlap, choose the correct event venue in the scanner before stamping. QR scans stay tied to the event."}
          </Text>
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>{copy.business.live}</Text>
            <Text style={styles.sectionTitle}>{copy.business.scannerQueue}</Text>
          </View>
          {activeJoinedEvents.length === 0 ? (
            <Text style={styles.bodyText}>{labels.queueEmptyBody}</Text>
          ) : (
            <ScrollView
              contentContainerStyle={activeJoinedEvents.length === 1 ? styles.railScrollSingle : null}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              <View style={[styles.railContent, activeJoinedEvents.length === 1 ? styles.railContentSingle : null]}>
                {activeJoinedEvents.map((event) =>
                  renderJoinedEventCard(
                    event,
                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: "/business/scanner",
                            params: { eventVenueId: event.eventVenueId },
                          })
                        }
                        style={[styles.primaryButton, styles.actionFlex]}
                      >
                        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.primaryButtonText}>{labels.openScanner}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => router.push("/business/history")}
                        style={[styles.secondaryButton, styles.actionFlex]}
                      >
                        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.secondaryButtonText}>{labels.openHistory}</Text>
                      </Pressable>
                    </View>
                  )
                )}
              </View>
            </ScrollView>
          )}
        </View>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>{copy.business.upcoming}</Text>
            <Text style={styles.sectionTitle}>{copy.business.joinedNext}</Text>
          </View>
          {upcomingJoinedEvents.length === 0 ? (
            <Text style={styles.bodyText}>{labels.joinedNextEmptyBody}</Text>
          ) : (
            <ScrollView
              contentContainerStyle={upcomingJoinedEvents.length === 1 ? styles.railScrollSingle : null}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              <View style={[styles.railContent, upcomingJoinedEvents.length === 1 ? styles.railContentSingle : null]}>
                {upcomingJoinedEvents.map((event) => {
                  const leaveKey = `${event.businessId}:${event.eventId}`;
                  const isLeaving = leaveMutation.isPending && activeLeaveKey === leaveKey;

                  return renderJoinedEventCard(
                    event,
                    event.staffRole === "SCANNER" ? null : (
                      <Pressable
                        disabled={userId === null || isLeaving}
                        onPress={() => {
                          if (userId === null) {
                            return;
                          }

                          void leaveMutation.mutateAsync({
                            eventId: event.eventId,
                            businessId: event.businessId,
                            staffUserId: userId,
                          });
                        }}
                        style={[styles.secondaryButton, isLeaving ? styles.disabledButton : null]}
                      >
                        <Text style={styles.secondaryButtonText}>
                          {isLeaving ? labels.leavingEvent : labels.leaveEvent}
                        </Text>
                      </Pressable>
                    )
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error && canManageEventMemberships ? (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>{copy.common.manage}</Text>
            <Text style={styles.sectionTitle}>{copy.business.availableToJoin}</Text>
          </View>
          {cityOpportunities.length === 0 ? (
            <Text style={styles.bodyText}>{labels.availableEmptyBody}</Text>
          ) : (
            <ScrollView
              contentContainerStyle={cityOpportunities.length === 1 ? styles.railScrollSingle : null}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              <View style={[styles.railContent, cityOpportunities.length === 1 ? styles.railContentSingle : null]}>
                {cityOpportunities.map((event) => renderOpportunityCard(event))}
              </View>
            </ScrollView>
          )}
        </View>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <InfoCard eyebrow={copy.business.history} title={labels.pastJoinedTitle}>
          {completedJoinedEvents.length === 0 ? (
            <Text style={styles.bodyText}>{labels.pastJoinedEmptyBody}</Text>
          ) : (
            <ScrollView
              contentContainerStyle={completedJoinedEvents.length === 1 ? styles.railScrollSingle : null}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              <View style={[styles.railContent, completedJoinedEvents.length === 1 ? styles.railContentSingle : null]}>
                {completedJoinedEvents.map((event) => renderJoinedEventCard(event, null))}
              </View>
            </ScrollView>
          )}
        </InfoCard>
      ) : null}
      <Modal
        animationType="fade"
        onRequestClose={() => setPreview(null)}
        transparent
        visible={preview !== null}
      >
        <Pressable onPress={() => setPreview(null)} style={styles.modalBackdrop}>
          {previewEvent !== null && previewBadge !== null ? (
            <Pressable onPress={() => undefined} style={styles.modalSheet}>
              <CoverImageSurface
                fallbackSource={getFallbackCoverSource("eventDiscovery")}
                imageStyle={styles.modalCoverImage}
                source={getEventCoverSource(
                  previewEvent.coverImageUrl,
                  `${previewEvent.eventId}:${previewEvent.eventName}`
                )}
                style={styles.modalCover}
              >
                <View style={styles.modalCoverOverlay} />
                <View style={styles.modalCoverContent}>
                  <View style={styles.eventStatusRow}>
                    <Text style={styles.eyebrow}>{labels.eventPreview}</Text>
                    <StatusBadge label={previewBadge.label} state={previewBadge.state} />
                  </View>
                  <Text numberOfLines={2} style={styles.modalTitle}>{previewEvent.eventName}</Text>
                  <Text numberOfLines={1} style={styles.coverMeta}>{previewEvent.city}</Text>
                </View>
              </CoverImageSurface>
              <View style={styles.modalContent}>
                <View style={styles.detailGrid}>
                  <View style={styles.detailPill}>
                    <Text style={styles.detailLabel}>{language === "fi" ? "Alkaa" : "Starts"}</Text>
                    <Text style={styles.detailValue}>{formatDateTime(formatter, previewEvent.startAt)}</Text>
                  </View>
                  <View style={styles.detailPill}>
                    <Text style={styles.detailLabel}>{language === "fi" ? "Päättyy" : "Ends"}</Text>
                    <Text style={styles.detailValue}>{formatDateTime(formatter, previewEvent.endAt)}</Text>
                  </View>
                </View>
                <Text style={styles.sectionLabel}>{labels.description}</Text>
                <Text style={styles.bodyText}>
                  {previewEvent.description !== null && previewEvent.description.trim().length > 0
                    ? previewEvent.description.trim()
                    : labels.noDescription}
                </Text>
                <Pressable onPress={() => setPreview(null)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>{labels.closePreview}</Text>
                </Pressable>
              </View>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    actionFlex: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    cardBody: {
      gap: 5,
      minHeight: 74,
      padding: 12,
    },
    cardCover: {
      height: 146,
      overflow: "hidden",
    },
    cardCoverContent: {
      bottom: 12,
      gap: 8,
      left: 12,
      position: "absolute",
      right: 12,
    },
    cardCoverImage: {
      borderTopLeftRadius: theme.radius.inner,
      borderTopRightRadius: theme.radius.inner,
    },
    cardCoverOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.34)",
    },
    cardPreviewButton: {
      borderRadius: theme.radius.inner,
      flexShrink: 0,
      overflow: "hidden",
    },
    cardActionSlot: {
      alignSelf: "stretch",
      paddingHorizontal: 12,
    },
    coverMeta: {
      color: "rgba(255,255,255,0.78)",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    coverTitle: {
      color: "#FFFFFF",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    detailGrid: {
      flexDirection: "row",
      gap: 10,
    },
    detailLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textTransform: "uppercase",
    },
    detailPill: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      flex: 1,
      gap: 4,
      padding: 12,
    },
    detailValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    disabledButton: {
      opacity: 0.7,
    },
    elevatedButton: {
      ...interactiveSurfaceShadowStyle,
    },
    feedbackRow: {
      alignItems: "flex-start",
      gap: 8,
    },
    eventStamp: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    eventStatusRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      justifyContent: "space-between",
    },
    eyebrow: {
      color: "rgba(255,255,255,0.8)",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.caption,
      letterSpacing: 2,
      lineHeight: theme.typography.lineHeights.caption,
      textTransform: "uppercase",
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    modalBackdrop: {
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.72)",
      flex: 1,
      justifyContent: "center",
      padding: 18,
    },
    modalContent: {
      gap: 14,
      padding: 16,
    },
    modalCover: {
      height: 220,
      overflow: "hidden",
    },
    modalCoverContent: {
      bottom: 16,
      gap: 8,
      left: 16,
      position: "absolute",
      right: 16,
    },
    modalCoverImage: {
      borderTopLeftRadius: theme.radius.card,
      borderTopRightRadius: theme.radius.card,
    },
    modalCoverOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.38)",
    },
    modalSheet: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      maxWidth: 520,
      overflow: "hidden",
      width: "100%",
    },
    modalTitle: {
      color: "#FFFFFF",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      flexDirection: "row",
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    primaryButtonText: {
      color: theme.colors.actionPrimaryText,
      flexShrink: 1,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      textAlign: "center",
    },
    rowCard: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      gap: 7,
      padding: 14,
    },
    railCard: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      gap: 10,
      height: 302,
      justifyContent: "space-between",
      overflow: "hidden",
      paddingBottom: 12,
      width: 274,
    },
    railContent: {
      flexDirection: "row",
      gap: 12,
      paddingRight: 4,
    },
    railContentSingle: {
      justifyContent: "center",
      minWidth: "100%",
      paddingRight: 0,
    },
    railScrollSingle: {
      flexGrow: 1,
    },
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.titleLarge,
      letterSpacing: -0.8,
      lineHeight: theme.typography.lineHeights.titleLarge,
    },
    topBarEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    sectionCard: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      gap: 14,
      padding: 18,
    },
    sectionHeader: {
      gap: 4,
    },
    sectionEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      letterSpacing: -0.3,
      lineHeight: 24,
    },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      flexShrink: 1,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      textAlign: "center",
    },
    sectionLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    stack: {
      gap: 12,
    },
    topBar: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      marginBottom: 4,
    },
    topBarCopy: {
      flex: 1,
      gap: 6,
    },
  });
