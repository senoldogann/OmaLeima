import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { MobileRoleSwitchCard } from "@/features/auth/components/mobile-role-switch-card";
import { useClubDashboardQuery } from "@/features/club/club-dashboard";
import { ClubEventPreviewModal } from "@/features/club/components/club-event-preview-modal";
import { sortClubEventsForOrganizer } from "@/features/club/event-ordering";
import type { ClubDashboardEventSummary, ClubDashboardTimelineState } from "@/features/club/types";
import { getEventCoverSourceWithFallback, prefetchEventCoverUrls } from "@/features/events/event-visuals";
import { findOverlappingEvents } from "@/features/events/event-overlaps";
import { hapticImpact, hapticNotification, ImpactStyle, NotificationType } from "@/features/foundation/safe-haptics";
import type { MobileTheme } from "@/features/foundation/theme";
import { useManualRefresh } from "@/features/foundation/use-manual-refresh";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/providers/session-provider";

type TimelineBadge = {
  label: string;
  state: "pending" | "ready" | "warning";
};

const formatDateTime = (formatter: Intl.DateTimeFormat, value: string): string =>
  formatter.format(new Date(value));

const getTimelineBadge = (
  timelineState: ClubDashboardTimelineState,
  labels: Record<ClubDashboardTimelineState, string>
): TimelineBadge => {
  switch (timelineState) {
    case "LIVE":
      return { label: labels.LIVE, state: "ready" };
    case "UPCOMING":
      return { label: labels.UPCOMING, state: "pending" };
    case "DRAFT":
      return { label: labels.DRAFT, state: "pending" };
    case "CANCELLED":
      return { label: labels.CANCELLED, state: "warning" };
    case "COMPLETED":
      return { label: labels.COMPLETED, state: "warning" };
  }
};

export default function ClubHomeScreen() {
  const router = useRouter();
  const { language, localeTag, theme } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const [isConfirmingSignOut, setIsConfirmingSignOut] = useState<boolean>(false);
  const [previewEvent, setPreviewEvent] = useState<ClubDashboardEventSummary | null>(null);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const dashboardQuery = useClubDashboardQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });
  const manualRefresh = useManualRefresh(dashboardQuery.refetch);

  const labels = useMemo(
    () => ({
      title: language === "fi" ? "Klubin päivä" : "Club day",
      subtitle:
        language === "fi"
          ? "Seuraa tapahtumaa, rasteja ja palkintoja yhdestä näkymästä."
          : "Track events, checkpoints, and rewards from one view.",
      loadingTitle: language === "fi" ? "Haetaan klubin tilanne" : "Loading club status",
      loadingBody:
        language === "fi"
          ? "Ladataan tapahtumat, osallistujat ja leimat."
          : "Loading events, participants, and stamps.",
      errorTitle: language === "fi" ? "Klubinäkymä ei auennut" : "Club dashboard unavailable",
      emptyTitle: language === "fi" ? "Ei aktiivista klubia" : "No active club",
      emptyBody:
        language === "fi"
          ? "Tällä tilillä ei ole aktiivista klubijäsenyyttä. Tarkista kutsu tai käytä web-paneelia."
          : "This account has no active club membership. Check the invite or use the web panel.",
      focusEyebrow: language === "fi" ? "Tapahtumapäivä" : "Event day",
      focusEmptyTitle: language === "fi" ? "Ei tapahtumia vielä" : "No events yet",
      focusEmptyBody:
        language === "fi"
          ? "Kun klubi luo tapahtuman, näet sen tilanteen täällä."
          : "Once the club creates an event, its status appears here.",
      eventsTitle: language === "fi" ? "Seuraavat tapahtumat" : "Next events",
      eventsEmptyBody:
        language === "fi"
          ? "Ei tulevia tai käynnissä olevia tapahtumia. Päättyneet näkyvät erillisissä historiakonteksteissa."
          : "No upcoming or live events. Completed events stay in dedicated history contexts.",
      openUpcoming: language === "fi" ? "Avaa Tulossa" : "Open Upcoming",
      live: language === "fi" ? "Käynnissä" : "Live",
      upcoming: language === "fi" ? "Tulossa" : "Upcoming",
      participants: language === "fi" ? "Osallistujat" : "Participants",
      venues: language === "fi" ? "Rastit" : "Venues",
      stamps: language === "fi" ? "Leimat" : "Stamps",
      rewards: language === "fi" ? "Palkinnot" : "Rewards",
      claims: language === "fi" ? "Luovutettu" : "Claimed",
      rewardHandoff: language === "fi" ? "Palkintojen luovutus" : "Reward handoff",
      rewardHandoffBody:
        language === "fi"
          ? "Kun opiskelija näyttää valmiin palkinnon, vahvista luovutus mobiilissa heti paikan päällä."
          : "When a student shows a ready reward, confirm the handoff on mobile at the desk.",
      openRewardHandoff: language === "fi" ? "Avaa luovutusjono" : "Open handoff queue",
      minimum: language === "fi" ? "Minimi" : "Minimum",
      starts: language === "fi" ? "Alkaa" : "Starts",
      ends: language === "fi" ? "Päättyy" : "Ends",
      status: {
        CANCELLED: language === "fi" ? "Peruttu" : "Cancelled",
        COMPLETED: language === "fi" ? "Päättynyt" : "Completed",
        DRAFT: language === "fi" ? "Luonnos" : "Draft",
        LIVE: language === "fi" ? "Käynnissä" : "Live",
        UPCOMING: language === "fi" ? "Tulossa" : "Upcoming",
      } satisfies Record<ClubDashboardTimelineState, string>,
    }),
    [language]
  );

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

  const events = useMemo(
    () => sortClubEventsForOrganizer(dashboardQuery.data?.events ?? []),
    [dashboardQuery.data?.events]
  );
  const nextEvents = useMemo(
    () => events.filter((event) => event.timelineState !== "COMPLETED" && event.timelineState !== "CANCELLED"),
    [events]
  );
  const liveEvents = useMemo(
    () => sortClubEventsForOrganizer(events.filter((event) => event.timelineState === "LIVE")),
    [events]
  );
  const overlappingEvents = useMemo(
    () =>
      findOverlappingEvents(
        nextEvents.map((event) => ({
          endAt: event.endAt,
          id: event.eventId,
          name: event.name,
          startAt: event.startAt,
        }))
      ),
    [nextEvents]
  );
  const upcomingCount = useMemo(
    () => nextEvents.filter((event) => event.timelineState === "UPCOMING").length,
    [nextEvents]
  );
  const livePulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (liveEvents.length === 0) {
      livePulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulseAnim, { toValue: 0.2, duration: 600, useNativeDriver: false }),
        Animated.timing(livePulseAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [liveEvents.length, livePulseAnim]);
  useEffect(() => {
    if (dashboardQuery.data) {
      void prefetchEventCoverUrls(dashboardQuery.data.events.map((event) => event.coverImageUrl));
    }
  }, [dashboardQuery.data]);

  const handleSignOutConfirmPress = (): void => {
    hapticImpact(ImpactStyle.Light);
    setIsConfirmingSignOut(true);
    setSignOutError(null);
  };

  const handleSignOutCancelPress = (): void => {
    hapticImpact(ImpactStyle.Light);
    setIsConfirmingSignOut(false);
    setSignOutError(null);
  };

  const handleSignOutPress = async (): Promise<void> => {
    hapticNotification(NotificationType.Warning);
    setIsSigningOut(true);
    setSignOutError(null);

    const { error } = await supabase.auth.signOut();

    if (error !== null) {
      setSignOutError(error.message);
      setIsSigningOut(false);
      setIsConfirmingSignOut(false);
      return;
    }

    setIsSigningOut(false);
  };

  const handleEditPreviewEventPress = (eventId: string): void => {
    setPreviewEvent(null);
    router.push({
      pathname: "/club/events",
      params: { eventId },
    });
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
      <View style={styles.headerRow}>
        <View style={styles.clubHeader}>
          <View style={styles.clubBrand}>
            <AppIcon color={theme.colors.lime} name="star" size={18} />
            <Text style={styles.clubBrandTitle}>OmaLeima</Text>
          </View>
          <Text style={styles.clubBrandSub}>
            {language === "fi" ? "Järjestäjänäkymä" : "Organizer view"}
          </Text>
        </View>
        {isConfirmingSignOut ? (
          <View style={styles.signOutConfirmRow}>
            <Pressable
              accessibilityHint={language === "fi" ? "Kirjautuu ulos tililtä" : "Signs out of the account"}
              accessibilityLabel={language === "fi" ? "Kyllä, kirjaudu ulos" : "Yes, sign out"}
              disabled={isSigningOut}
              onPress={() => void handleSignOutPress()}
              style={[styles.iconButtonDanger, isSigningOut ? styles.disabledButton : null]}
            >
              {isSigningOut ? (
                <ActivityIndicator color={theme.colors.danger} size="small" />
              ) : (
                <AppIcon color={theme.colors.danger} name="logout" size={17} />
              )}
            </Pressable>
            <Pressable
              accessibilityLabel={language === "fi" ? "Peruuta" : "Cancel"}
              disabled={isSigningOut}
              onPress={handleSignOutCancelPress}
              style={[styles.iconButton, isSigningOut ? styles.disabledButton : null]}
            >
              <AppIcon color={theme.colors.textPrimary} name="x" size={17} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityHint={language === "fi" ? "Pyytää kirjautumisesta ulos vahvistuksen" : "Asks for sign-out confirmation"}
            accessibilityLabel={language === "fi" ? "Kirjaudu ulos" : "Sign out"}
            onPress={handleSignOutConfirmPress}
            style={styles.iconButton}
          >
            <AppIcon color={theme.colors.textPrimary} name="logout" size={18} />
          </Pressable>
        )}
      </View>

      {signOutError !== null ? <Text style={styles.errorText}>{signOutError}</Text> : null}

      {dashboardQuery.isLoading ? (
        <InfoCard eyebrow="Club" title={labels.loadingTitle}>
          <Text style={styles.bodyText}>{labels.loadingBody}</Text>
        </InfoCard>
      ) : null}

      {dashboardQuery.error ? (
        <InfoCard eyebrow="Club" title={labels.errorTitle}>
          <Text style={styles.bodyText}>{dashboardQuery.error.message}</Text>
          <Pressable onPress={() => void dashboardQuery.refetch()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{language === "fi" ? "Yritä uudelleen" : "Retry"}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!dashboardQuery.isLoading && !dashboardQuery.error && dashboardQuery.data?.memberships.length === 0 ? (
        <InfoCard eyebrow="Club" title={labels.emptyTitle}>
          <Text style={styles.bodyText}>{labels.emptyBody}</Text>
        </InfoCard>
      ) : null}

      {!dashboardQuery.isLoading && !dashboardQuery.error && dashboardQuery.data ? (
        <>
          <MobileRoleSwitchCard currentArea="club" />

          <View style={styles.statsRow}>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{dashboardQuery.data.summary.liveEventCount}</Text>
              <Text style={styles.statLabel}>{language === "fi" ? "Käynnissä" : "Live"}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{upcomingCount}</Text>
              <Text style={styles.statLabel}>{language === "fi" ? "Tulossa" : "Upcoming"}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{dashboardQuery.data.summary.registeredParticipantCount}</Text>
              <Text style={styles.statLabel}>{language === "fi" ? "Osallistujat" : "Participants"}</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.actionChipsRow} horizontal showsHorizontalScrollIndicator={false}>
            <Pressable onPress={() => router.push("/club/events")} style={styles.actionChip}>
              <AppIcon color={theme.colors.textPrimary} name="calendar" size={15} />
              <Text style={styles.actionChipText}>{language === "fi" ? "Luo tapahtuma" : "Create event"}</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/club/announcements")} style={styles.actionChip}>
              <AppIcon color={theme.colors.textPrimary} name="bell" size={15} />
              <Text style={styles.actionChipText}>{language === "fi" ? "Tiedotteet" : "Announcements"}</Text>
            </Pressable>
            {dashboardQuery.data.summary.rewardTierCount > 0 ? (
              <Pressable onPress={() => router.push("/club/claims")} style={styles.actionChip}>
                <AppIcon color={theme.colors.textPrimary} name="check" size={15} />
                <Text style={styles.actionChipText}>{language === "fi" ? "Palkintojen luovutus" : "Reward handoff"}</Text>
              </Pressable>
            ) : null}
          </ScrollView>

          {dashboardQuery.data.summary.rewardTierCount > 0 || dashboardQuery.data.summary.claimedRewardCount > 0 ? (
            <InfoCard eyebrow={labels.rewards} title={labels.rewardHandoff} variant="subtle">
              <Text style={styles.bodyText}>{labels.rewardHandoffBody}</Text>
              <Pressable onPress={() => router.push("/club/claims")} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>{labels.openRewardHandoff}</Text>
              </Pressable>
            </InfoCard>
          ) : null}

          {overlappingEvents.length > 1 ? (
            <InfoCard
              eyebrow={language === "fi" ? "Huomio" : "Heads up"}
              title={language === "fi" ? "Samanaikaisia tapahtumia" : "Overlapping events"}
              variant="subtle"
            >
              <Text style={styles.bodyText}>
                {language === "fi"
                  ? "Jos klubilla on useita tapahtumia samaan aikaan, tarkista rastit ja viestintä ennen julkaisua. QR-skannaus on tapahtumakohtainen."
                  : "If your club has overlapping events, verify venues and messaging before publishing. QR scanning remains event-specific."}
              </Text>
            </InfoCard>
          ) : null}

          {liveEvents.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveRail}>
              {liveEvents.map((event) => (
                <Pressable
                  key={event.eventId}
                  onPress={() => setPreviewEvent(event)}
                  style={styles.livePressable}
                >
                  <CoverImageSurface
                    source={getEventCoverSourceWithFallback(event.coverImageUrl, "clubControl")}
                    style={styles.heroCard}
                  >
                    <View style={styles.heroOverlay} />
                    <View style={styles.heroContent}>
                      <View style={styles.heroTopRow}>
                        <Text style={styles.heroEyebrow}>{labels.focusEyebrow}</Text>
                        <StatusBadge
                          label={getTimelineBadge(event.timelineState, labels.status).label}
                          state={getTimelineBadge(event.timelineState, labels.status).state}
                        />
                      </View>
                      <View style={styles.heroBottom}>
                        <Text numberOfLines={2} style={styles.heroTitle}>
                          {event.name}
                        </Text>
                        <Text style={styles.heroMeta}>
                          {event.clubName} · {event.city}
                        </Text>
                        <View style={styles.metricRow}>
                          <View style={styles.metricPill}>
                            <Text style={styles.metricValue}>{event.registeredParticipantCount}</Text>
                            <Text style={styles.metricLabel}>{labels.participants}</Text>
                          </View>
                          <View style={styles.metricPill}>
                            <Text style={styles.metricValue}>{event.joinedVenueCount}</Text>
                            <Text style={styles.metricLabel}>{labels.venues}</Text>
                          </View>
                          <View style={styles.metricPill}>
                            <Text style={styles.metricValue}>{event.minimumStampsRequired}</Text>
                            <Text style={styles.metricLabel}>{labels.minimum}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </CoverImageSurface>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <InfoCard eyebrow={labels.focusEyebrow} title={labels.focusEmptyTitle}>
              <Text style={styles.bodyText}>{labels.focusEmptyBody}</Text>
            </InfoCard>
          )}

          <View style={styles.eventsSection}>
            <View style={styles.sectionIconHeader}>
              <AppIcon color={theme.colors.lime} name="calendar" size={16} />
              <Text style={styles.sectionTitle}>{labels.eventsTitle}</Text>
              {nextEvents.length > 0 ? <Text style={styles.sectionCount}>{nextEvents.length}</Text> : null}
            </View>
            <View style={styles.sectionHeaderAction}>
              <Text style={styles.bodyText}>
                {language === "fi"
                  ? "Selaa julkaistuja, luonnoksia ja käynnissä olevia tapahtumia ajan mukaan."
                  : "Browse published, draft, and live events by time."}
              </Text>
              <Pressable onPress={() => router.push("/club/upcoming")} style={styles.textButton}>
                <Text style={styles.textButtonText}>{labels.openUpcoming}</Text>
                <AppIcon color={theme.colors.lime} name="chevron-right" size={16} />
              </Pressable>
            </View>
            {nextEvents.length === 0 ? (
              <Text style={styles.bodyText}>{labels.eventsEmptyBody}</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventRail}>
                {nextEvents.map((event) => {
                  const badge = getTimelineBadge(event.timelineState, labels.status);
                  const timeLabel = event.timelineState === "LIVE" ? labels.ends : labels.starts;

                  return (
                    <Pressable
                      key={event.eventId}
                      onPress={() => setPreviewEvent(event)}
                    >
                      <CoverImageSurface
                        source={getEventCoverSourceWithFallback(event.coverImageUrl, "clubControl")}
                        style={styles.eventCard}
                      >
                        <View style={styles.eventCardOverlay} />
                        <View style={styles.eventCardContent}>
                          <View style={styles.eventHeaderRow}>
                            <Text numberOfLines={1} style={styles.eventCardTitle}>
                              {event.name}
                            </Text>
                            <View style={styles.eventStatusRow}>
                              {badge.state === "ready" ? (
                                <Animated.View style={[styles.statusDot, styles.statusDotReady, { opacity: livePulseAnim }]} />
                              ) : (
                                <View style={[styles.statusDot, badge.state === "warning" ? styles.statusDotWarning : styles.statusDotPending]} />
                              )}
                              <Text style={styles.statusDotLabel}>{badge.label}</Text>
                            </View>
                          </View>
                          <Text numberOfLines={1} style={styles.eventCardMeta}>
                            {timeLabel} {formatDateTime(formatter, event.timelineState === "LIVE" ? event.endAt : event.startAt)}
                          </Text>
                          <View style={styles.eventMetricRow}>
                            <Text style={styles.eventMetricText}>{event.registeredParticipantCount} {labels.participants}</Text>
                            <Text style={styles.eventMetricText}>{event.joinedVenueCount} {labels.venues}</Text>
                            <Text style={styles.eventMetricText}>{event.claimedRewardCount}/{event.rewardTierCount} {labels.claims}</Text>
                          </View>
                        </View>
                      </CoverImageSurface>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </>
      ) : null}
      <ClubEventPreviewModal
        event={previewEvent}
        formatter={formatter}
        language={language}
        onClose={() => setPreviewEvent(null)}
        onEditPress={handleEditPreviewEventPress}
      />
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    clubChip: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 18,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 4,
      minWidth: 150,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    clubMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    clubName: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    clubRail: {
      gap: 10,
      paddingRight: 4,
    },
    clubHeaderMeta: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textTransform: "uppercase",
    },
    disabledButton: {
      opacity: 0.62,
    },
    errorText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    eventHeaderRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between",
    },
    eventCard: {
      borderRadius: theme.radius.scene,
      height: 232,
      overflow: "hidden",
      position: "relative",
      width: 282,
    },
    eventCardContent: {
      flex: 1,
      gap: 10,
      justifyContent: "flex-end",
      padding: 16,
    },
    eventCardMeta: {
      color: "rgba(255,255,255,0.78)",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    eventCardOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    eventCardTitle: {
      color: "#FFFFFF",
      flex: 1,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    eventMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    eventMetricRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    eventMetricText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    eventRail: {
      gap: 10,
      paddingRight: 4,
    },
    eventTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    eventTitleGroup: {
      flex: 1,
      gap: 4,
    },
    headerCopy: {
      flex: 1,
      gap: 6,
    },
    headerRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    heroBottom: {
      gap: 10,
    },
    heroCard: {
      borderRadius: 30,
      height: 314,
      overflow: "hidden",
      position: "relative",
      width: 312,
    },
    heroContent: {
      flex: 1,
      justifyContent: "space-between",
      padding: 22,
    },
    heroEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.2,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    heroMeta: {
      color: "rgba(255,255,255,0.78)",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.48)",
    },
    heroTitle: {
      color: "#FFFFFF",
      fontFamily: theme.typography.families.extrabold,
      fontSize: 30,
      lineHeight: 34,
    },
    heroTopRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    iconButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    iconButtonDanger: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.danger,
      borderRadius: 999,
      borderWidth: 1,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    signOutConfirmRow: {
      flexDirection: "row",
      gap: 8,
    },
    livePressable: {
      borderRadius: 30,
    },
    liveRail: {
      gap: 12,
      paddingRight: 4,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    metricLabel: {
      color: "rgba(255,255,255,0.72)",
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    metricPill: {
      backgroundColor: "rgba(255,255,255,0.14)",
      borderRadius: 18,
      gap: 2,
      minWidth: 86,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    metricRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    metricValue: {
      color: "#FFFFFF",
      fontFamily: theme.typography.families.extrabold,
      fontSize: 20,
      lineHeight: 24,
    },
    eventsSection: {
      gap: 14,
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
    sectionHeaderAction: {
      gap: 12,
    },
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.titleLarge,
      letterSpacing: -0.8,
      lineHeight: theme.typography.lineHeights.titleLarge,
    },
    headerEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: theme.radius.button,
      minHeight: 46,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      textAlign: "center",
    },
    summaryCard: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flex: 1,
      gap: 4,
      minWidth: "47%",
      padding: 14,
    },
    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    summaryLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textTransform: "uppercase",
    },
    summaryValue: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    actionChipsRow: {
      flexDirection: "row",
      gap: 8,
      paddingRight: 4,
    },
    actionChip: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    actionChipText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    textButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      flexDirection: "row",
      gap: 6,
      minHeight: 34,
    },
    textButtonText: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    clubHeader: {
      gap: 4,
    },
    clubBrand: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    clubBrandTitle: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.extrabold,
      fontSize: 22,
      letterSpacing: -0.5,
      lineHeight: 28,
    },
    clubBrandSub: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
      marginLeft: 26,
    },
    statsRow: {
      flexDirection: "row",
      gap: 10,
    },
    statTile: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      flex: 1,
      gap: 2,
      paddingVertical: 14,
    },
    statValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: 26,
      lineHeight: 30,
    },
    statLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textAlign: "center",
    },
    sectionIconHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    sectionCount: {
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: 10,
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    statusDot: {
      borderRadius: 4,
      height: 8,
      width: 8,
    },
    statusDotReady: {
      backgroundColor: theme.colors.lime,
    },
    statusDotWarning: {
      backgroundColor: theme.colors.danger,
    },
    statusDotPending: {
      backgroundColor: theme.colors.textMuted,
    },
    eventStatusRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 5,
    },
    statusDotLabel: {
      color: "rgba(255,255,255,0.85)",
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
  });
