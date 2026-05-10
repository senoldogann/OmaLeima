import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "expo-router";
import { Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { EmptyStateCard } from "@/components/empty-state-card";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { createBusinessEventRequestErrorBody } from "@/features/business/business-event-errors";
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
import { hapticImpact, ImpactStyle } from "@/features/foundation/safe-haptics";
import type { MobileTheme } from "@/features/foundation/theme";
import { interactiveSurfaceShadowStyle } from "@/features/foundation/theme";
import { successNoticeDurationMs, useTransientSuccessKey } from "@/features/foundation/use-transient-success-key";
import { useManualRefresh } from "@/features/foundation/use-manual-refresh";
import { createUserSafeErrorMessage } from "@/features/foundation/user-safe-error";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

type FeedbackState = {
  message: string;
  title: string;
  tone: "ready" | "warning";
};

type EventSectionCopy = {
  description: string;
  emptyBody: string;
  title: string;
};

type BusinessEventsCopy = {
  activeDescription: string;
  availableDescription: string;
  availableEmptyBody: string;
  availableTitle: string;
  businessEyebrow: string;
  cityLabel: string;
  emptySearchBody: string;
  endedAt: string;
  eventMeta: string;
  joinDeadline: string;
  joinEvent: string;
  joinedNextDescription: string;
  joinedNextEmptyBody: string;
  joinedNextTitle: string;
  joiningEvent: string;
  leaveEvent: string;
  leavingEvent: string;
  loadingBody: string;
  loadingTitle: string;
  openHistory: string;
  openScanner: string;
  overlapBody: string;
  overlapTitle: string;
  pastDescription: string;
  pastJoinedEmptyBody: string;
  pastJoinedTitle: string;
  quickGuideBody: string;
  quickGuideTitle: string;
  requestFailedTitle: string;
  resultsTitle: string;
  screenMeta: string;
  screenTitle: string;
  searchPlaceholder: string;
  startsAt: string;
  updateEyebrow: string;
  viewDetail: string;
};

const formatDateTime = (formatter: Intl.DateTimeFormat, value: string): string =>
  formatter.format(new Date(value));

const getJoinedEventBadge = (
  event: BusinessJoinedEventSummary,
  language: "fi" | "en"
): { label: string; state: "pending" | "ready" | "warning" } => {
  switch (event.timelineState) {
    case "ACTIVE":
      return { label: language === "fi" ? "Käynnissä" : "Live", state: "ready" };
    case "UPCOMING":
      return { label: language === "fi" ? "Tulossa" : "Upcoming", state: "pending" };
    case "COMPLETED":
      return { label: language === "fi" ? "Päättynyt" : "Completed", state: "warning" };
  }
};

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
  EVENT_CITY_MISMATCH:
    language === "fi"
      ? "Yritys voi liittyä vain oman kaupunkinsa tapahtumiin."
      : "A business can only join events in its own city.",
  EVENT_JOIN_CLOSED:
    language === "fi"
      ? "Liittymisikkuna on jo sulkeutunut."
      : "Join window has already closed for this event.",
  BUSINESS_CITY_REQUIRED:
    language === "fi"
      ? "Yritykseltä puuttuu kaupunki. Lisää sijainti profiiliin ennen tapahtumaan liittymistä."
      : "The business city is missing. Add the location in the profile before joining events.",
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
    const isSuccess = joinStatus === "SUCCESS" || joinStatus === "ALREADY_JOINED";

    return {
      tone: isSuccess ? "ready" : "warning",
      title: isSuccess
        ? (language === "fi" ? "Liittyminen onnistui" : "Joined successfully")
        : (language === "fi" ? "Liittyminen epäonnistui" : "Could not join"),
      message: messages[joinStatus],
    };
  }

  if (typeof leaveStatus !== "undefined") {
    const messages = createLeaveResultMessages(language);
    const isSuccess = leaveStatus === "SUCCESS";

    return {
      tone: isSuccess ? "ready" : "warning",
      title: isSuccess
        ? (language === "fi" ? "Poistuminen onnistui" : "Left successfully")
        : (language === "fi" ? "Poistuminen epäonnistui" : "Could not leave"),
      message: messages[leaveStatus],
    };
  }

  return null;
};

const createEventsCopy = (language: "fi" | "en"): BusinessEventsCopy => ({
  activeDescription:
    language === "fi"
      ? "Tässä näkyvät pisteet, joissa skanneri kannattaa avata heti."
      : "These are the venues where the scanner should be opened right away.",
  availableDescription:
    language === "fi"
      ? "Uudet tapahtumat, joihin yritys voi vielä liittyä."
      : "New events the business can still join.",
  availableEmptyBody:
    language === "fi"
      ? "Tällä tunnuksella ei ole hallittavia liittymismahdollisuuksia juuri nyt."
      : "This account does not have manageable join opportunities right now.",
  availableTitle: language === "fi" ? "Liityttävissä" : "Available to join",
  businessEyebrow: language === "fi" ? "Yritys" : "Business",
  cityLabel: language === "fi" ? "Kaupunki" : "City",
  emptySearchBody:
    language === "fi"
      ? "Hakusanalla ei löytynyt liittyneitä tai avoimia tapahtumia."
      : "No joined or open events matched the current search.",
  endedAt: language === "fi" ? "Päättyi" : "Ended",
  eventMeta:
    language === "fi"
      ? "Liity, seuraa tilaa ja avaa oikea skanneri oikeaan pisteeseen."
      : "Join, track status, and open the right scanner at the right venue.",
  joinDeadline: language === "fi" ? "Liittyminen sulkeutuu" : "Join deadline",
  joinEvent: language === "fi" ? "Liity tapahtumaan" : "Join event",
  joinedNextDescription:
    language === "fi"
      ? "Tulevat tapahtumat, joihin yrityksesi on jo mukana."
      : "Upcoming events your business is already part of.",
  joinedNextEmptyBody:
    language === "fi"
      ? "Yrityksesi ei ole vielä mukana missään tulevassa tapahtumassa."
      : "Your business is not joined to a future event yet.",
  joinedNextTitle: language === "fi" ? "Tulossa" : "Upcoming",
  joiningEvent: language === "fi" ? "Liitytään..." : "Joining...",
  leaveEvent: language === "fi" ? "Poistu tapahtumasta" : "Leave event",
  leavingEvent: language === "fi" ? "Poistutaan..." : "Leaving...",
  loadingBody:
    language === "fi"
      ? "Ladataan liittyneet tapahtumat ja avoimet mahdollisuudet."
      : "Loading joined events and public opportunities for this account.",
  loadingTitle: language === "fi" ? "Avataan Approt" : "Opening events",
  openHistory: language === "fi" ? "Historia" : "History",
  openScanner: language === "fi" ? "Avaa skanneri" : "Open scanner",
  overlapBody:
    language === "fi"
      ? "Kun samaan aikaan on useita tapahtumia, valitse skannerissa aina oikea tapahtumapiste ennen leiman antamista."
      : "When multiple events overlap, always choose the correct event venue in the scanner before stamping.",
  overlapTitle: language === "fi" ? "Samanaikaisia tapahtumia" : "Overlapping events",
  pastDescription:
    language === "fi"
      ? "Päättyneet tapahtumat jäävät tänne myöhempää tarkistusta varten."
      : "Completed events stay here for later review.",
  pastJoinedEmptyBody:
    language === "fi"
      ? "Tällä yrityksellä ei ole vielä päättyneitä tapahtumia."
      : "This business does not have completed events yet.",
  pastJoinedTitle: language === "fi" ? "Menneet" : "Past",
  quickGuideBody:
    language === "fi"
      ? "Avaa ensin käynnissä olevat tapahtumat. Tulevat tapahtumat ovat erikseen, jotta niistä voi vielä poistua ennen live-vaihetta."
      : "Open live events first. Upcoming events stay separate so they can still be left before going live.",
  quickGuideTitle: language === "fi" ? "Miten tätä näkymää käytetään" : "How to use this view",
  requestFailedTitle: language === "fi" ? "Pyyntö epäonnistui" : "Request failed",
  resultsTitle: language === "fi" ? "Hakutulokset" : "Search results",
  screenMeta:
    language === "fi"
      ? "Selkeämpi Approt-näkymä liittymisiin, live-tilaan ja skanneriin."
      : "A clearer events view for joins, live status, and scanner access.",
  screenTitle: language === "fi" ? "Approt" : "Events",
  searchPlaceholder: language === "fi" ? "Hae tapahtumia tai kaupunkia" : "Search events or city",
  startsAt: language === "fi" ? "Alkaa" : "Starts",
  updateEyebrow: language === "fi" ? "Päivitys" : "Update",
  viewDetail: language === "fi" ? "Avaa tiedot" : "View details",
});

const createSectionCopy = (
  title: string,
  description: string,
  emptyBody: string
): EventSectionCopy => ({
  description,
  emptyBody,
  title,
});

export default function BusinessEventsScreen() {
  const router = useRouter();
  const styles = useThemeStyles(createStyles);
  const { session } = useSession();
  const { copy, language, localeTag, theme } = useUiPreferences();
  const userId = session?.user.id ?? null;
  const [searchQuery, setSearchQuery] = useState<string>("");
  const labels = useMemo(() => createEventsCopy(language), [language]);

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

  const homeOverviewQuery = useBusinessHomeOverviewQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });
  const manualRefresh = useManualRefresh(homeOverviewQuery.refetch);
  const joinMutation = useJoinBusinessEventMutation(userId ?? "");
  const leaveMutation = useLeaveBusinessEventMutation(userId ?? "");

  const activeJoinedEvents = useMemo(
    () => homeOverviewQuery.data?.joinedActiveEvents ?? [],
    [homeOverviewQuery.data?.joinedActiveEvents]
  );
  const upcomingJoinedEvents = useMemo(
    () => homeOverviewQuery.data?.joinedUpcomingEvents ?? [],
    [homeOverviewQuery.data?.joinedUpcomingEvents]
  );
  const completedJoinedEvents = useMemo(
    () => homeOverviewQuery.data?.joinedCompletedEvents ?? [],
    [homeOverviewQuery.data?.joinedCompletedEvents]
  );
  const cityOpportunities = useMemo(
    () => homeOverviewQuery.data?.cityOpportunities ?? [],
    [homeOverviewQuery.data?.cityOpportunities]
  );
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

  useTransientSuccessKey(
    feedback?.tone === "ready" ? feedback.message : null,
    () => {
      joinMutation.reset();
      leaveMutation.reset();
    },
    successNoticeDurationMs
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredActiveJoinedEvents = useMemo(
    () =>
      normalizedSearch === ""
        ? activeJoinedEvents
        : activeJoinedEvents.filter(
          (event) =>
            event.eventName.toLowerCase().includes(normalizedSearch) ||
            event.city.toLowerCase().includes(normalizedSearch)
        ),
    [activeJoinedEvents, normalizedSearch]
  );
  const filteredUpcomingJoinedEvents = useMemo(
    () =>
      normalizedSearch === ""
        ? upcomingJoinedEvents
        : upcomingJoinedEvents.filter(
          (event) =>
            event.eventName.toLowerCase().includes(normalizedSearch) ||
            event.city.toLowerCase().includes(normalizedSearch)
        ),
    [normalizedSearch, upcomingJoinedEvents]
  );
  const filteredCompletedJoinedEvents = useMemo(
    () =>
      normalizedSearch === ""
        ? completedJoinedEvents
        : completedJoinedEvents.filter(
          (event) =>
            event.eventName.toLowerCase().includes(normalizedSearch) ||
            event.city.toLowerCase().includes(normalizedSearch)
        ),
    [completedJoinedEvents, normalizedSearch]
  );
  const filteredCityOpportunities = useMemo(
    () =>
      normalizedSearch === ""
        ? cityOpportunities
        : cityOpportunities.filter(
          (event) =>
            event.eventName.toLowerCase().includes(normalizedSearch) ||
            event.city.toLowerCase().includes(normalizedSearch)
        ),
    [cityOpportunities, normalizedSearch]
  );
  const hasSearchResults =
    filteredActiveJoinedEvents.length > 0 ||
    filteredUpcomingJoinedEvents.length > 0 ||
    filteredCompletedJoinedEvents.length > 0 ||
    filteredCityOpportunities.length > 0;

  const activeSectionCopy = createSectionCopy(copy.business.scannerQueue, labels.activeDescription, copy.business.noActiveEvents);
  const upcomingSectionCopy = createSectionCopy(labels.joinedNextTitle, labels.joinedNextDescription, labels.joinedNextEmptyBody);
  const availableSectionCopy = createSectionCopy(labels.availableTitle, labels.availableDescription, labels.availableEmptyBody);
  const pastSectionCopy = createSectionCopy(labels.pastJoinedTitle, labels.pastDescription, labels.pastJoinedEmptyBody);

  const renderSectionHeader = (sectionCopy: EventSectionCopy, count: number, iconName: "zap" | "calendar" | "check-circle" | "history") => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderCopy}>
        <View style={styles.sectionHeaderTitleRow}>
          <AppIcon color={theme.colors.lime} name={iconName} size={14} />
          <Text style={styles.sectionTitle}>{sectionCopy.title}</Text>
          <Text style={styles.sectionCount}>{count}</Text>
        </View>
        <Text style={styles.sectionDescription}>{sectionCopy.description}</Text>
      </View>
    </View>
  );

  const renderCardActions = (actions: ReactNode[]): ReactNode => {
    if (actions.length === 0) {
      return null;
    }

    return <View style={styles.cardActions}>{actions}</View>;
  };

  const renderJoinedEventCard = (
    event: BusinessJoinedEventSummary,
    actions: ReactNode[]
  ) => {
    const badge = getJoinedEventBadge(event, language);
    const timelineText = event.timelineState === "ACTIVE"
      ? `${copy.business.live} · ${labels.endedAt} ${formatDateTime(formatter, event.endAt)}`
      : event.timelineState === "UPCOMING"
        ? `${labels.startsAt} ${formatDateTime(formatter, event.startAt)}`
        : `${labels.endedAt} ${formatDateTime(formatter, event.endAt)}`;

    return (
      <View key={event.eventVenueId} style={styles.eventCard}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/business/event-detail",
              params: { businessId: event.businessId, eventId: event.eventId },
            })
          }
          style={styles.cardPreviewButton}
        >
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
            <Text style={styles.metaText}>{event.city} · {event.businessName}</Text>
            <Text style={styles.cardTime}>{timelineText}</Text>
            {event.stampLabel ? <Text style={styles.stampText}>{event.stampLabel}</Text> : null}
          </View>
        </Pressable>

        {renderCardActions(actions)}
      </View>
    );
  };

  const renderOpportunityCard = (event: BusinessOpportunitySummary) => {
    const joinKey = `${event.businessId}:${event.eventId}`;
    const isPending = joinMutation.isPending && activeJoinKey === joinKey;

    return (
      <View key={joinKey} style={styles.eventCard}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/business/event-detail",
              params: { businessId: event.businessId, eventId: event.eventId },
            })
          }
          style={styles.cardPreviewButton}
        >
          <CoverImageSurface
            fallbackSource={getFallbackCoverSource("eventDiscovery")}
            imageStyle={styles.cardCoverImage}
            source={getEventCoverSource(event.coverImageUrl, `${event.eventId}:${event.eventName}`)}
            style={styles.cardCover}
          >
            <View style={styles.cardCoverOverlay} />
            <View style={styles.cardCoverContent}>
              <StatusBadge label={labels.availableTitle} state="pending" />
              <Text numberOfLines={2} style={styles.coverTitle}>{event.eventName}</Text>
            </View>
          </CoverImageSurface>

          <View style={styles.cardBody}>
            <Text style={styles.metaText}>{event.city} · {event.businessName}</Text>
            <Text style={styles.cardTime}>{labels.joinDeadline} {formatDateTime(formatter, event.joinDeadlineAt)}</Text>
            <Text style={styles.stampText}>{labels.startsAt} {formatDateTime(formatter, event.startAt)}</Text>
          </View>
        </Pressable>

        {renderCardActions([
          <Pressable
            key="open-detail"
            onPress={() =>
              router.push({
                pathname: "/business/event-detail",
                params: { businessId: event.businessId, eventId: event.eventId },
              })
            }
            style={[styles.secondaryButton, styles.actionFlex]}
          >
            <Text style={styles.secondaryButtonText}>{labels.viewDetail}</Text>
          </Pressable>,
          <Pressable
            key="join-event"
            disabled={userId === null || isPending}
            onPress={() => {
              if (userId === null) {
                return;
              }

              hapticImpact(ImpactStyle.Medium);
              void joinMutation.mutateAsync({
                eventId: event.eventId,
                businessId: event.businessId,
                staffUserId: userId,
              }).catch(() => undefined);
            }}
            style={[styles.primaryButton, styles.actionFlex, isPending ? styles.disabledButton : null]}
          >
            <Text style={styles.primaryButtonText}>{isPending ? labels.joiningEvent : labels.joinEvent}</Text>
          </Pressable>,
        ])}
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
        <View style={styles.topBarLeft}>
          <Text style={styles.topBarEyebrow}>{labels.businessEyebrow}</Text>
          <Text style={styles.screenTitle}>{labels.screenTitle}</Text>
        </View>
        <View style={styles.topBarActions}>
          <Pressable onPress={() => router.push("/business/scanner")} style={styles.topBarIconBtn}>
            <AppIcon color={theme.colors.textPrimary} name="scan" size={18} />
          </Pressable>
          <Pressable onPress={() => router.push("/business/history")} style={styles.topBarIconBtn}>
            <AppIcon color={theme.colors.textPrimary} name="history" size={18} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.screenMeta}>{labels.screenMeta}</Text>

      <View style={styles.searchBar}>
        <AppIcon color={theme.colors.textMuted} name="search" size={16} />
        <TextInput
          onChangeText={setSearchQuery}
          placeholder={labels.searchPlaceholder}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.searchInput}
          value={searchQuery}
        />
      </View>

      {homeOverviewQuery.isLoading ? (
        <InfoCard eyebrow={copy.common.loading} title={labels.loadingTitle}>
          <Text style={styles.bodyText}>{labels.loadingBody}</Text>
        </InfoCard>
      ) : null}

      {homeOverviewQuery.error ? (
        <InfoCard eyebrow={copy.common.error} title={labels.loadingTitle}>
          <Text style={styles.bodyText}>{createUserSafeErrorMessage(homeOverviewQuery.error, language, "business")}</Text>
          <Pressable onPress={() => void homeOverviewQuery.refetch()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{copy.common.retry}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {joinMutation.isError || leaveMutation.isError ? (
        <InfoCard eyebrow={copy.common.error} title={labels.requestFailedTitle}>
          <Text style={styles.bodyText}>
            {createBusinessEventRequestErrorBody(joinMutation.error ?? leaveMutation.error, language)}
          </Text>
        </InfoCard>
      ) : null}

      {feedback ? (
        <InfoCard eyebrow={labels.updateEyebrow} title={feedback.title}>
          <View style={styles.feedbackRow}>
            <StatusBadge
              label={feedback.tone === "ready" ? (language === "fi" ? "Valmis" : "Ready") : (language === "fi" ? "Huomio" : "Warning")}
              state={feedback.tone}
            />
            <Text style={styles.bodyText}>{feedback.message}</Text>
          </View>
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <View style={styles.summaryStrip}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{activeJoinedEvents.length}</Text>
            <Text style={styles.summaryLabel}>{copy.business.live}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{upcomingJoinedEvents.length}</Text>
            <Text style={styles.summaryLabel}>{labels.joinedNextTitle}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{cityOpportunities.length}</Text>
            <Text style={styles.summaryLabel}>{labels.availableTitle}</Text>
          </View>
        </View>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <InfoCard eyebrow={labels.resultsTitle} title={labels.quickGuideTitle} variant="subtle">
          <Text style={styles.bodyText}>{labels.quickGuideBody}</Text>
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error && overlappingEvents.length > 1 ? (
        <InfoCard
          eyebrow={language === "fi" ? "Huomio" : "Heads up"}
          title={labels.overlapTitle}
          variant="subtle"
        >
          <Text style={styles.bodyText}>{labels.overlapBody}</Text>
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error && normalizedSearch.length > 0 && !hasSearchResults ? (
        <EmptyStateCard body={labels.emptySearchBody} eyebrow={labels.resultsTitle} iconName="search" />
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <View style={styles.sectionBlock}>
          {renderSectionHeader(activeSectionCopy, filteredActiveJoinedEvents.length, "zap")}
          {filteredActiveJoinedEvents.length === 0 ? (
            <EmptyStateCard body={activeSectionCopy.emptyBody} iconName="zap" />
          ) : (
            <View style={styles.cardList}>
              {filteredActiveJoinedEvents.map((event) =>
                renderJoinedEventCard(event, [
                  <Pressable
                    key={`${event.eventVenueId}-history`}
                    onPress={() => router.push("/business/history")}
                    style={[styles.secondaryButton, styles.actionFlex]}
                  >
                    <Text style={styles.secondaryButtonText}>{labels.openHistory}</Text>
                  </Pressable>,
                  <Pressable
                    key={`${event.eventVenueId}-scanner`}
                    onPress={() =>
                      router.push({
                        pathname: "/business/scanner",
                        params: { eventVenueId: event.eventVenueId },
                      })
                    }
                    style={[styles.primaryButton, styles.actionFlex]}
                  >
                    <Text style={styles.primaryButtonText}>{labels.openScanner}</Text>
                  </Pressable>,
                ])
              )}
            </View>
          )}
        </View>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <View style={styles.sectionBlock}>
          {renderSectionHeader(upcomingSectionCopy, filteredUpcomingJoinedEvents.length, "calendar")}
          {filteredUpcomingJoinedEvents.length === 0 ? (
            <EmptyStateCard body={upcomingSectionCopy.emptyBody} iconName="calendar" />
          ) : (
            <View style={styles.cardList}>
              {filteredUpcomingJoinedEvents.map((event) => {
                const leaveKey = `${event.businessId}:${event.eventId}`;
                const isLeaving = leaveMutation.isPending && activeLeaveKey === leaveKey;
                const actions = event.staffRole === "SCANNER"
                  ? [
                      <Pressable
                        key={`${event.eventVenueId}-detail`}
                        onPress={() =>
                          router.push({
                            pathname: "/business/event-detail",
                            params: { businessId: event.businessId, eventId: event.eventId },
                          })
                        }
                        style={[styles.secondaryButton, styles.actionSingle]}
                      >
                        <Text style={styles.secondaryButtonText}>{labels.viewDetail}</Text>
                      </Pressable>,
                    ]
                  : [
                      <Pressable
                        key={`${event.eventVenueId}-detail`}
                        onPress={() =>
                          router.push({
                            pathname: "/business/event-detail",
                            params: { businessId: event.businessId, eventId: event.eventId },
                          })
                        }
                        style={[styles.secondaryButton, styles.actionFlex]}
                      >
                        <Text style={styles.secondaryButtonText}>{labels.viewDetail}</Text>
                      </Pressable>,
                      <Pressable
                        key={`${event.eventVenueId}-leave`}
                        disabled={userId === null || isLeaving}
                        onPress={() => {
                          if (userId === null) {
                            return;
                          }

                          hapticImpact(ImpactStyle.Medium);
                          void leaveMutation.mutateAsync({
                            eventId: event.eventId,
                            businessId: event.businessId,
                            staffUserId: userId,
                          }).catch(() => undefined);
                        }}
                        style={[styles.secondaryButtonDanger, styles.actionFlex, isLeaving ? styles.disabledButton : null]}
                      >
                        <Text style={styles.secondaryButtonDangerText}>{isLeaving ? labels.leavingEvent : labels.leaveEvent}</Text>
                      </Pressable>,
                    ];

                return renderJoinedEventCard(event, actions);
              })}
            </View>
          )}
        </View>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error && canManageEventMemberships ? (
        <View style={styles.sectionBlock}>
          {renderSectionHeader(availableSectionCopy, filteredCityOpportunities.length, "check-circle")}
          {filteredCityOpportunities.length === 0 ? (
            <EmptyStateCard body={availableSectionCopy.emptyBody} iconName="check-circle" />
          ) : (
            <View style={styles.cardList}>{filteredCityOpportunities.map((event) => renderOpportunityCard(event))}</View>
          )}
        </View>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <View style={styles.sectionBlock}>
          {renderSectionHeader(pastSectionCopy, filteredCompletedJoinedEvents.length, "history")}
          {filteredCompletedJoinedEvents.length === 0 ? (
            <EmptyStateCard body={pastSectionCopy.emptyBody} iconName="history" />
          ) : (
            <View style={styles.cardList}>
              {filteredCompletedJoinedEvents.map((event) =>
                renderJoinedEventCard(event, [
                  <Pressable
                    key={`${event.eventVenueId}-history`}
                    onPress={() => router.push("/business/history")}
                    style={[styles.secondaryButton, styles.actionSingle]}
                  >
                    <Text style={styles.secondaryButtonText}>{labels.openHistory}</Text>
                  </Pressable>,
                ])
              )}
            </View>
          )}
        </View>
      ) : null}
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
    actionSingle: {
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    cardActions: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 14,
      paddingBottom: 14,
    },
    cardBody: {
      gap: 6,
      padding: 14,
    },
    cardCover: {
      height: 156,
      overflow: "hidden",
    },
    cardCoverContent: {
      bottom: 14,
      gap: 10,
      left: 14,
      position: "absolute",
      right: 14,
    },
    cardCoverImage: {
      borderTopLeftRadius: theme.radius.card,
      borderTopRightRadius: theme.radius.card,
    },
    cardCoverOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.34)",
    },
    cardList: {
      gap: 12,
    },
    cardPreviewButton: {
      borderRadius: theme.radius.card,
      overflow: "hidden",
    },
    cardTime: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    coverTitle: {
      color: "#FFFFFF",
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    disabledButton: {
      opacity: 0.62,
    },
    eventCard: {
      ...interactiveSurfaceShadowStyle,
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      overflow: "hidden",
    },
    feedbackRow: {
      gap: 10,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    primaryButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    screenMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    searchBar: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    searchInput: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      padding: 0,
    },
    sectionBlock: {
      gap: 12,
    },
    sectionCount: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    sectionDescription: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    sectionHeader: {
      gap: 6,
    },
    sectionHeaderCopy: {
      gap: 4,
    },
    sectionHeaderTitleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    secondaryButtonDanger: {
      alignItems: "center",
      backgroundColor: theme.colors.warningSurface,
      borderColor: theme.colors.warningBorder,
      borderRadius: theme.radius.button,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    secondaryButtonDangerText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    stampText: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    summaryCard: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      flex: 1,
      gap: 4,
      minWidth: "30%",
      paddingHorizontal: 12,
      paddingVertical: 14,
    },
    summaryLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    summaryStrip: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    summaryValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    topBar: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    topBarActions: {
      flexDirection: "row",
      gap: 10,
    },
    topBarEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.5,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    topBarIconBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: 1,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    topBarLeft: {
      gap: 2,
    },
  });
