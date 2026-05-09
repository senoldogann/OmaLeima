import { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { createBusinessEventRequestErrorBody } from "@/features/business/business-event-errors";
import { useJoinBusinessEventMutation, useLeaveBusinessEventMutation } from "@/features/business/business-events";
import { useBusinessHomeOverviewQuery } from "@/features/business/business-home";
import type {
  BusinessJoinEventStatus,
  BusinessJoinedEventSummary,
  BusinessLeaveEventStatus,
  BusinessOpportunitySummary,
} from "@/features/business/types";
import { getEventCoverSource, getFallbackCoverSource } from "@/features/events/event-visuals";
import { hapticImpact, ImpactStyle } from "@/features/foundation/safe-haptics";
import type { MobileTheme } from "@/features/foundation/theme";
import { useManualRefresh } from "@/features/foundation/use-manual-refresh";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

type BusinessEventDetailRouteParams = {
  businessId?: string;
  eventId?: string;
};

type JoinedDetail = {
  event: BusinessJoinedEventSummary;
  kind: "joined";
};

type OpportunityDetail = {
  event: BusinessOpportunitySummary;
  kind: "opportunity";
};

type BusinessEventDetail = JoinedDetail | OpportunityDetail;

const formatDateTime = (formatter: Intl.DateTimeFormat, value: string): string =>
  formatter.format(new Date(value));

const readParam = (value: string | string[] | undefined): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const getDetailEvent = (detail: BusinessEventDetail): BusinessJoinedEventSummary | BusinessOpportunitySummary =>
  detail.event;

const getTimelineBadge = (
  detail: BusinessEventDetail,
  language: "fi" | "en"
): { label: string; state: "pending" | "ready" | "warning" } => {
  if (detail.kind === "opportunity") {
    return { label: language === "fi" ? "Liityttävissä" : "Joinable", state: "pending" };
  }

  switch (detail.event.timelineState) {
    case "ACTIVE":
      return { label: language === "fi" ? "Käynnissä" : "Live", state: "ready" };
    case "UPCOMING":
      return { label: language === "fi" ? "Tulossa" : "Upcoming", state: "pending" };
    case "COMPLETED":
      return { label: language === "fi" ? "Päättynyt" : "Completed", state: "warning" };
  }
};

const createJoinMessage = (status: BusinessJoinEventStatus, language: "fi" | "en"): string => {
  const messages: Record<BusinessJoinEventStatus, string> = {
    SUCCESS: language === "fi" ? "Yritys liitettiin tapahtumaan." : "Business joined the event.",
    ALREADY_JOINED: language === "fi" ? "Yritys on jo mukana tapahtumassa." : "Business is already joined.",
    EVENT_NOT_FOUND: language === "fi" ? "Tapahtumaa ei löytynyt." : "Event was not found.",
    EVENT_NOT_AVAILABLE: language === "fi" ? "Tapahtumaan ei voi liittyä juuri nyt." : "Event is not available right now.",
    EVENT_CITY_MISMATCH: language === "fi" ? "Yritys voi liittyä vain oman kaupungin tapahtumiin." : "Business can only join events in its city.",
    EVENT_JOIN_CLOSED: language === "fi" ? "Liittymisikkuna on sulkeutunut." : "Join window has closed.",
    BUSINESS_CITY_REQUIRED: language === "fi" ? "Yrityksen kaupunki puuttuu profiilista." : "Business city is missing from the profile.",
    BUSINESS_NOT_ACTIVE: language === "fi" ? "Yritys ei ole aktiivinen." : "Business is not active.",
    BUSINESS_STAFF_NOT_ALLOWED: language === "fi" ? "Tällä tunnuksella ei voi liittyä tapahtumaan." : "This account cannot join this event.",
    PROFILE_NOT_ACTIVE: language === "fi" ? "Profiili ei ole aktiivinen." : "Profile is not active.",
    PROFILE_NOT_FOUND: language === "fi" ? "Profiilia ei löytynyt." : "Profile was not found.",
    VENUE_REMOVED: language === "fi" ? "Tämä piste on poistettu tapahtumasta." : "This venue was removed from the event.",
    AUTH_REQUIRED: language === "fi" ? "Kirjaudu sisään uudelleen." : "Sign in again.",
    ACTOR_NOT_ALLOWED: language === "fi" ? "Tilillä ei ole oikeutta tähän." : "The account is not allowed to do this.",
  };

  return messages[status];
};

const createLeaveMessage = (status: BusinessLeaveEventStatus, language: "fi" | "en"): string => {
  const messages: Record<BusinessLeaveEventStatus, string> = {
    SUCCESS: language === "fi" ? "Yritys poistui tapahtumasta." : "Business left the event.",
    EVENT_NOT_FOUND: language === "fi" ? "Tapahtumaa ei löytynyt." : "Event was not found.",
    EVENT_LEAVE_CLOSED: language === "fi" ? "Poistuminen ei ole enää mahdollista." : "Leaving is no longer available.",
    BUSINESS_NOT_ACTIVE: language === "fi" ? "Yritys ei ole aktiivinen." : "Business is not active.",
    BUSINESS_STAFF_NOT_ALLOWED: language === "fi" ? "Tällä tunnuksella ei voi poistua tapahtumasta." : "This account cannot leave this event.",
    VENUE_NOT_FOUND: language === "fi" ? "Yrityksen tapahtumapistettä ei löytynyt." : "Business event venue was not found.",
    VENUE_NOT_JOINED: language === "fi" ? "Yritys ei ole mukana tapahtumassa." : "Business is not joined to this event.",
    VENUE_ALREADY_LEFT: language === "fi" ? "Yritys on jo poistunut tapahtumasta." : "Business already left this event.",
    VENUE_REMOVED: language === "fi" ? "Tämä piste on poistettu tapahtumasta." : "This venue was removed from the event.",
    PROFILE_NOT_FOUND: language === "fi" ? "Profiilia ei löytynyt." : "Profile was not found.",
    PROFILE_NOT_ACTIVE: language === "fi" ? "Profiili ei ole aktiivinen." : "Profile is not active.",
    AUTH_REQUIRED: language === "fi" ? "Kirjaudu sisään uudelleen." : "Sign in again.",
    ACTOR_NOT_ALLOWED: language === "fi" ? "Tilillä ei ole oikeutta tähän." : "The account is not allowed to do this.",
  };

  return messages[status];
};

export default function BusinessEventDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<BusinessEventDetailRouteParams>();
  const styles = useThemeStyles(createStyles);
  const { session } = useSession();
  const { copy, language, localeTag, theme } = useUiPreferences();
  const userId = session?.user.id ?? null;
  const eventId = readParam(params.eventId);
  const businessId = readParam(params.businessId);
  const [notice, setNotice] = useState<string | null>(null);

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
  const overviewQuery = useBusinessHomeOverviewQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });
  const manualRefresh = useManualRefresh(overviewQuery.refetch);
  const joinMutation = useJoinBusinessEventMutation(userId ?? "");
  const leaveMutation = useLeaveBusinessEventMutation(userId ?? "");

  const detail = useMemo<BusinessEventDetail | null>(() => {
    if (eventId === null || businessId === null || typeof overviewQuery.data === "undefined") {
      return null;
    }

    const joinedEvent = [
      ...overviewQuery.data.joinedActiveEvents,
      ...overviewQuery.data.joinedUpcomingEvents,
      ...overviewQuery.data.joinedCompletedEvents,
    ].find((event) => event.eventId === eventId && event.businessId === businessId);

    if (typeof joinedEvent !== "undefined") {
      return { event: joinedEvent, kind: "joined" };
    }

    const opportunity = overviewQuery.data.cityOpportunities.find(
      (event) => event.eventId === eventId && event.businessId === businessId
    );

    return typeof opportunity === "undefined" ? null : { event: opportunity, kind: "opportunity" };
  }, [businessId, eventId, overviewQuery.data]);

  const event = detail === null ? null : getDetailEvent(detail);
  const joinedEvent = detail?.kind === "joined" ? detail.event : null;
  const timelineBadge = detail === null ? null : getTimelineBadge(detail, language);
  const coverSource = event === null ? undefined : getEventCoverSource(event.coverImageUrl, `${event.eventId}:${event.eventName}`);
  const isJoined = detail?.kind === "joined";
  const canOpenScanner = detail?.kind === "joined" && detail.event.timelineState === "ACTIVE";
  const canLeave = detail?.kind === "joined" && detail.event.timelineState === "UPCOMING" && detail.event.staffRole !== "SCANNER";
  const canJoin = detail?.kind === "opportunity";

  const handleBackPress = (): void => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/business/events");
  };

  const handleJoinPress = async (): Promise<void> => {
    if (userId === null || detail?.kind !== "opportunity") {
      return;
    }

    setNotice(null);
    hapticImpact(ImpactStyle.Medium);
    try {
      const result = await joinMutation.mutateAsync({
        businessId: detail.event.businessId,
        eventId: detail.event.eventId,
        staffUserId: userId,
      });
      setNotice(createJoinMessage(result.status, language));
    } catch {
      setNotice(null);
    }
  };

  const handleLeavePress = async (): Promise<void> => {
    if (userId === null || detail?.kind !== "joined") {
      return;
    }

    setNotice(null);
    hapticImpact(ImpactStyle.Medium);
    try {
      const result = await leaveMutation.mutateAsync({
        businessId: detail.event.businessId,
        eventId: detail.event.eventId,
        staffUserId: userId,
      });
      setNotice(createLeaveMessage(result.status, language));
    } catch {
      setNotice(null);
    }
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
      <Pressable onPress={handleBackPress} style={styles.backButton}>
        <AppIcon color={theme.colors.textPrimary} name="chevron-left" size={16} />
        <Text style={styles.backButtonText}>{copy.common.back}</Text>
      </Pressable>

      {eventId === null || businessId === null ? (
        <InfoCard eyebrow={copy.common.error} title={language === "fi" ? "Tapahtuman tiedot puuttuvat" : "Event detail is missing"}>
          <Text style={styles.bodyText}>
            {language === "fi" ? "Reitiltä puuttuu tapahtuman tai yrityksen tunnus." : "The route is missing the event or business id."}
          </Text>
        </InfoCard>
      ) : null}

      {overviewQuery.isLoading ? (
        <InfoCard eyebrow={copy.common.loading} title={language === "fi" ? "Avataan tapahtumaa" : "Opening event"}>
          <Text style={styles.bodyText}>
            {language === "fi" ? "Ladataan tapahtuman ja yrityspisteen tiedot." : "Loading event and venue details."}
          </Text>
        </InfoCard>
      ) : null}

      {overviewQuery.error ? (
        <InfoCard eyebrow={copy.common.error} title={language === "fi" ? "Tapahtumaa ei voitu ladata" : "Could not load event"}>
          <Text style={styles.bodyText}>
            {language === "fi"
              ? "Tapahtuman tietoja ei voitu ladata juuri nyt. Yrita hetken paasta uudelleen."
              : "Event details could not be loaded right now. Please try again in a moment."}
          </Text>
          <Pressable onPress={() => void overviewQuery.refetch()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{copy.common.retry}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!overviewQuery.isLoading && !overviewQuery.error && eventId !== null && businessId !== null && detail === null ? (
        <InfoCard eyebrow={copy.common.error} title={language === "fi" ? "Tapahtumaa ei löytynyt" : "Event was not found"}>
          <Text style={styles.bodyText}>
            {language === "fi"
              ? "Tämä tapahtuma ei ole enää näkyvissä tälle yritystilille."
              : "This event is no longer visible for this business account."}
          </Text>
        </InfoCard>
      ) : null}

      {event !== null && timelineBadge !== null ? (
        <>
          <CoverImageSurface
            fallbackSource={getFallbackCoverSource("eventDiscovery")}
            imageStyle={styles.heroImage}
            source={coverSource}
            style={styles.hero}
          >
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.badgeRow}>
                <StatusBadge label={timelineBadge.label} state={timelineBadge.state} />
                <StatusBadge
                  label={isJoined ? (language === "fi" ? "Liittynyt" : "Joined") : (language === "fi" ? "Avoin" : "Open")}
                  state={isJoined ? "ready" : "pending"}
                />
              </View>
              <Text style={styles.heroCity}>{event.city}</Text>
              <Text style={styles.heroTitle}>{event.eventName}</Text>
            </View>
          </CoverImageSurface>

          <View style={styles.metaGrid}>
            <View style={styles.metaCard}>
              <AppIcon color={theme.colors.lime} name="calendar" size={15} />
              <Text style={styles.metaLabel}>{language === "fi" ? "Alkaa" : "Starts"}</Text>
              <Text style={styles.metaValue}>{formatDateTime(formatter, event.startAt)}</Text>
            </View>
            <View style={styles.metaCard}>
              <AppIcon color={theme.colors.lime} name="clock" size={15} />
              <Text style={styles.metaLabel}>{language === "fi" ? "Päättyy" : "Ends"}</Text>
              <Text style={styles.metaValue}>{formatDateTime(formatter, event.endAt)}</Text>
            </View>
          </View>

          <InfoCard eyebrow={language === "fi" ? "Kuvaus" : "Description"} title={event.eventName}>
            <Text style={styles.bodyText}>
              {event.description !== null && event.description.trim().length > 0
                ? event.description.trim()
                : language === "fi"
                  ? "Tälle tapahtumalle ei ole vielä lisätty kuvausta."
                  : "No description has been added for this event yet."}
            </Text>
          </InfoCard>

          <InfoCard eyebrow={language === "fi" ? "Yrityspiste" : "Business venue"} title={event.businessName}>
            <View style={styles.detailStack}>
              <Text style={styles.bodyText}>{event.city}</Text>
              {joinedEvent !== null ? (
                <>
                  <Text style={styles.bodyText}>
                    {language === "fi" ? "Leima" : "Stamp"}: {joinedEvent.stampLabel ?? (language === "fi" ? "Oletusleima" : "Default stamp")}
                  </Text>
                  <Text style={styles.bodyText}>
                    {language === "fi" ? "Järjestys" : "Order"}: {joinedEvent.venueOrder ?? "-"}
                  </Text>
                  <Text style={styles.bodyText}>{joinedEvent.businessAddress}</Text>
                  {joinedEvent.businessOpeningHours !== null ? (
                    <Text style={styles.bodyText}>{joinedEvent.businessOpeningHours}</Text>
                  ) : null}
                  {joinedEvent.businessAnnouncement !== null ? (
                    <Text style={styles.bodyText}>{joinedEvent.businessAnnouncement}</Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.bodyText}>
                  {language === "fi"
                    ? "Liittymisen jälkeen tapahtumapiste näkyy skannerissa ja historiassa."
                    : "After joining, the event venue appears in scanner and history views."}
                </Text>
              )}
            </View>
          </InfoCard>

          {notice !== null ? (
            <InfoCard eyebrow={language === "fi" ? "Päivitys" : "Update"} title={language === "fi" ? "Valmis" : "Done"}>
              <Text style={styles.bodyText}>{notice}</Text>
            </InfoCard>
          ) : null}

          {joinMutation.error ?? leaveMutation.error ? (
            <InfoCard eyebrow={copy.common.error} title={language === "fi" ? "Pyyntö epäonnistui" : "Request failed"}>
              <Text selectable style={styles.bodyText}>
                {createBusinessEventRequestErrorBody(joinMutation.error ?? leaveMutation.error, language)}
              </Text>
            </InfoCard>
          ) : null}

          <View style={styles.actionStack}>
            {canOpenScanner ? (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/business/scanner",
                    params: { eventVenueId: detail.event.eventVenueId },
                  })
                }
                style={styles.primaryButton}
              >
                <AppIcon color={theme.colors.actionPrimaryText} name="scan" size={18} />
                <Text style={styles.primaryButtonText}>{copy.business.openScanner}</Text>
              </Pressable>
            ) : null}
            {isJoined ? (
              <Pressable onPress={() => router.push("/business/history")} style={styles.secondaryButton}>
                <AppIcon color={theme.colors.textPrimary} name="history" size={17} />
                <Text style={styles.secondaryButtonText}>{copy.business.history}</Text>
              </Pressable>
            ) : null}
            {canJoin ? (
              <Pressable
                disabled={userId === null || joinMutation.isPending}
                onPress={() => void handleJoinPress()}
                style={[styles.primaryButton, joinMutation.isPending ? styles.disabledButton : null]}
              >
                <Text style={styles.primaryButtonText}>
                  {joinMutation.isPending
                    ? language === "fi" ? "Liitytään..." : "Joining..."
                    : language === "fi" ? "Liity tapahtumaan" : "Join event"}
                </Text>
              </Pressable>
            ) : null}
            {canLeave ? (
              <Pressable
                disabled={userId === null || leaveMutation.isPending}
                onPress={() => void handleLeavePress()}
                style={[styles.secondaryButton, leaveMutation.isPending ? styles.disabledButton : null]}
              >
                <Text style={styles.secondaryButtonText}>
                  {leaveMutation.isPending
                    ? language === "fi" ? "Poistutaan..." : "Leaving..."
                    : language === "fi" ? "Poistu tapahtumasta" : "Leave event"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    actionStack: {
      gap: 10,
      paddingBottom: 12,
    },
    backButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flexDirection: "row",
      gap: 6,
      minHeight: 42,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    backButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    badgeRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    detailStack: {
      gap: 8,
    },
    disabledButton: {
      opacity: 0.7,
    },
    hero: {
      borderRadius: theme.radius.card,
      height: 310,
      overflow: "hidden",
    },
    heroCity: {
      color: "rgba(255,255,255,0.82)",
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    heroContent: {
      bottom: 18,
      gap: 10,
      left: 18,
      position: "absolute",
      right: 18,
    },
    heroImage: {
      borderRadius: theme.radius.card,
    },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    heroTitle: {
      color: "#FFFFFF",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    metaCard: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flex: 1,
      gap: 6,
      padding: 14,
    },
    metaGrid: {
      flexDirection: "row",
      gap: 10,
    },
    metaLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textTransform: "uppercase",
    },
    metaValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      minHeight: 48,
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
    secondaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      flexShrink: 1,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      textAlign: "center",
    },
  });
