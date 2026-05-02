import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { useClubDashboardQuery } from "@/features/club/club-dashboard";
import type { ClubDashboardEventSummary, ClubDashboardTimelineState } from "@/features/club/types";
import { getEventCoverSourceWithFallback, prefetchEventCoverUrls } from "@/features/events/event-visuals";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/providers/session-provider";

type TimelineBadge = {
  label: string;
  state: "pending" | "ready" | "warning";
};

const formatDateTime = (formatter: Intl.DateTimeFormat, value: string): string =>
  formatter.format(new Date(value));

const pickFocusEvent = (events: ClubDashboardEventSummary[]): ClubDashboardEventSummary | null => {
  const liveEvent = events.find((event) => event.timelineState === "LIVE");

  if (typeof liveEvent !== "undefined") {
    return liveEvent;
  }

  const upcomingEvent = events.find((event) => event.timelineState === "UPCOMING");

  if (typeof upcomingEvent !== "undefined") {
    return upcomingEvent;
  }

  return events[0] ?? null;
};

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
  const { language, localeTag, theme } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const dashboardQuery = useClubDashboardQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });

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
      clubsTitle: language === "fi" ? "Klubit" : "Clubs",
      eventsTitle: language === "fi" ? "Seuraavat tapahtumat" : "Next events",
      live: language === "fi" ? "Käynnissä" : "Live",
      upcoming: language === "fi" ? "Tulossa" : "Upcoming",
      participants: language === "fi" ? "Osallistujat" : "Participants",
      venues: language === "fi" ? "Rastit" : "Venues",
      stamps: language === "fi" ? "Leimat" : "Stamps",
      rewards: language === "fi" ? "Palkinnot" : "Rewards",
      claims: language === "fi" ? "Luovutettu" : "Claimed",
      minimum: language === "fi" ? "Minimi" : "Minimum",
      starts: language === "fi" ? "Alkaa" : "Starts",
      ends: language === "fi" ? "Päättyy" : "Ends",
      status: {
        CANCELLED: language === "fi" ? "Peruttu" : "Cancelled",
        COMPLETED: language === "fi" ? "Päättynyt" : "Completed",
        DRAFT: language === "fi" ? "Luonnos" : "Draft",
        LIVE: language === "fi" ? "Live" : "Live",
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

  const events = dashboardQuery.data?.events ?? [];
  const focusEvent = pickFocusEvent(events);

  useEffect(() => {
    if (dashboardQuery.data) {
      void prefetchEventCoverUrls(dashboardQuery.data.events.map((event) => event.coverImageUrl));
    }
  }, [dashboardQuery.data]);

  const handleSignOutPress = async (): Promise<void> => {
    setIsSigningOut(true);
    setSignOutError(null);

    const { error } = await supabase.auth.signOut();

    if (error !== null) {
      setSignOutError(error.message);
      setIsSigningOut(false);
      return;
    }

    setIsSigningOut(false);
  };

  return (
    <AppScreen>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.screenTitle}>{labels.title}</Text>
          <Text style={styles.metaText}>{labels.subtitle}</Text>
        </View>
        <Pressable
          disabled={isSigningOut}
          onPress={() => void handleSignOutPress()}
          style={[styles.iconButton, isSigningOut ? styles.disabledButton : null]}
        >
          {isSigningOut ? (
            <ActivityIndicator color={theme.colors.textPrimary} size="small" />
          ) : (
            <AppIcon color={theme.colors.textPrimary} name="logout" size={18} />
          )}
        </Pressable>
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
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{dashboardQuery.data.summary.liveEventCount}</Text>
              <Text style={styles.summaryLabel}>{labels.live}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{dashboardQuery.data.summary.registeredParticipantCount}</Text>
              <Text style={styles.summaryLabel}>{labels.participants}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{dashboardQuery.data.summary.joinedVenueCount}</Text>
              <Text style={styles.summaryLabel}>{labels.venues}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{dashboardQuery.data.summary.validStampCount}</Text>
              <Text style={styles.summaryLabel}>{labels.stamps}</Text>
            </View>
          </View>

          {focusEvent !== null ? (
            <CoverImageSurface
              source={getEventCoverSourceWithFallback(focusEvent.coverImageUrl, "clubControl")}
              style={styles.heroCard}
            >
              <View style={styles.heroOverlay} />
              <View style={styles.heroContent}>
                <View style={styles.heroTopRow}>
                  <Text style={styles.heroEyebrow}>{labels.focusEyebrow}</Text>
                  <StatusBadge
                    label={getTimelineBadge(focusEvent.timelineState, labels.status).label}
                    state={getTimelineBadge(focusEvent.timelineState, labels.status).state}
                  />
                </View>
                <View style={styles.heroBottom}>
                  <Text numberOfLines={2} style={styles.heroTitle}>
                    {focusEvent.name}
                  </Text>
                  <Text style={styles.heroMeta}>
                    {focusEvent.clubName} · {focusEvent.city}
                  </Text>
                  <View style={styles.metricRow}>
                    <View style={styles.metricPill}>
                      <Text style={styles.metricValue}>{focusEvent.registeredParticipantCount}</Text>
                      <Text style={styles.metricLabel}>{labels.participants}</Text>
                    </View>
                    <View style={styles.metricPill}>
                      <Text style={styles.metricValue}>{focusEvent.joinedVenueCount}</Text>
                      <Text style={styles.metricLabel}>{labels.venues}</Text>
                    </View>
                    <View style={styles.metricPill}>
                      <Text style={styles.metricValue}>{focusEvent.minimumStampsRequired}</Text>
                      <Text style={styles.metricLabel}>{labels.minimum}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </CoverImageSurface>
          ) : (
            <InfoCard eyebrow={labels.focusEyebrow} title={labels.focusEmptyTitle}>
              <Text style={styles.bodyText}>{labels.focusEmptyBody}</Text>
            </InfoCard>
          )}

          <InfoCard eyebrow="Club" title={labels.clubsTitle}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.clubRail}
            >
              {dashboardQuery.data.memberships.map((membership) => (
                <View key={membership.clubId} style={styles.clubChip}>
                  <Text numberOfLines={1} style={styles.clubName}>
                    {membership.clubName}
                  </Text>
                  <Text numberOfLines={1} style={styles.clubMeta}>
                    {membership.city ?? membership.universityName ?? membership.membershipRole}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </InfoCard>

          <InfoCard eyebrow={labels.upcoming} title={labels.eventsTitle}>
            <View style={styles.eventList}>
              {events.map((event) => {
                const badge = getTimelineBadge(event.timelineState, labels.status);
                const timeLabel = event.timelineState === "LIVE" ? labels.ends : labels.starts;

                return (
                  <View key={event.eventId} style={styles.eventRow}>
                    <View style={styles.eventHeaderRow}>
                      <View style={styles.eventTitleGroup}>
                        <Text numberOfLines={1} style={styles.eventTitle}>
                          {event.name}
                        </Text>
                        <Text numberOfLines={1} style={styles.eventMeta}>
                          {timeLabel} {formatDateTime(formatter, event.timelineState === "LIVE" ? event.endAt : event.startAt)}
                        </Text>
                      </View>
                      <StatusBadge label={badge.label} state={badge.state} />
                    </View>
                    <View style={styles.eventMetricRow}>
                      <Text style={styles.eventMetricText}>{event.registeredParticipantCount} {labels.participants}</Text>
                      <Text style={styles.eventMetricText}>{event.joinedVenueCount} {labels.venues}</Text>
                      <Text style={styles.eventMetricText}>{event.claimedRewardCount}/{event.rewardTierCount} {labels.claims}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </InfoCard>
        </>
      ) : null}
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
    eventList: {
      gap: 10,
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
    eventRow: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 10,
      padding: 14,
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
      minHeight: 300,
      overflow: "hidden",
      position: "relative",
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
      gap: 8,
    },
    metricValue: {
      color: "#FFFFFF",
      fontFamily: theme.typography.families.extrabold,
      fontSize: 20,
      lineHeight: 24,
    },
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
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
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
  });
