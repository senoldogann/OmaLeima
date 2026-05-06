import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { AnnouncementFeedSection } from "@/features/announcements/announcement-feed-section";
import { MobileRoleSwitchCard } from "@/features/auth/components/mobile-role-switch-card";
import { useBusinessHomeOverviewQuery } from "@/features/business/business-home";
import type { BusinessJoinedEventSummary } from "@/features/business/types";
import { getEventCoverSource, getFallbackCoverSource } from "@/features/events/event-visuals";
import { AutoAdvancingRail } from "@/features/foundation/components/auto-advancing-rail";
import { hapticImpact, hapticNotification, ImpactStyle, NotificationType } from "@/features/foundation/safe-haptics";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/providers/session-provider";

const formatDateTime = (formatter: Intl.DateTimeFormat, value: string): string =>
  formatter.format(new Date(value));

const getTimelineBadge = (
  event: BusinessJoinedEventSummary,
  liveLabel: string,
  upcomingLabel: string,
  completedLabel: string
): { label: string; state: "ready" | "pending" | "warning" } => {
  switch (event.timelineState) {
    case "ACTIVE":
      return { label: liveLabel, state: "ready" };
    case "UPCOMING":
      return { label: upcomingLabel, state: "pending" };
    case "COMPLETED":
      return { label: completedLabel, state: "warning" };
  }
};

export default function BusinessHomeScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const styles = useThemeStyles(createStyles);
  const { copy, language, localeTag, theme } = useUiPreferences();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const [isConfirmingSignOut, setIsConfirmingSignOut] = useState<boolean>(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

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
      loadingTitle: language === "fi" ? "Haetaan yleiskuvaa" : "Fetching overview",
      loadingBody:
        language === "fi"
          ? "Ladataan yritysprofiili ja käynnissä olevat tapahtumat."
          : "Loading business profile and active events.",
      errorTitle: language === "fi" ? "Yleiskuva ei avautunut" : "Overview unavailable",
      scannerReadyTitle: language === "fi" ? "Skanneri valmiina" : "Scanner ready",
      scannerStandbyTitle: language === "fi" ? "Ei käynnissä olevia tapahtumia" : "No active events",
      scannerReadyBody:
        language === "fi"
          ? "Avaa skanneri, kun liittymäsi tapahtuma on käynnissä."
          : "Open the scanner while your joined event is live.",
      scannerStandbyBody:
        language === "fi"
          ? "Skanneri on valmiina, kun liittymäsi tapahtuma käynnistyy."
          : "The scanner will be ready once a joined event goes live.",
      joinedEventsTitle: copy.business.joinedEvents,
      viewAllEvents: language === "fi" ? "Kaikki tapahtumat" : "View all events",
      signedInFallback: language === "fi" ? "yritystili" : "business account",
      liveEnds: language === "fi" ? "Päättyy" : "Ends",
      upcomingStarts: language === "fi" ? "Alkaa" : "Starts",
      completedEnded: language === "fi" ? "Päättyi" : "Ended",
      completedStatus: language === "fi" ? "Päättynyt" : "Completed",
      past: language === "fi" ? "Menneet" : "Past",
      historyShort: language === "fi" ? "Historia" : "History",
    }),
    [copy.business.joinedEvents, language]
  );

  const homeOverviewQuery = useBusinessHomeOverviewQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });

  const activeJoinedEvents = homeOverviewQuery.data?.joinedActiveEvents ?? [];
  const joinedUpcomingEvents = homeOverviewQuery.data?.joinedUpcomingEvents ?? [];
  const joinedCompletedEvents = homeOverviewQuery.data?.joinedCompletedEvents ?? [];
  const joinedEvents = [...activeJoinedEvents, ...joinedUpcomingEvents, ...joinedCompletedEvents.slice(0, 2)];
  const eventRailWidth = Math.min(340, Math.max(260, windowWidth - 96));
  const eventRailContentStyle = [
    styles.eventRailContent,
    joinedEvents.length === 1 ? styles.eventRailContentSingle : null,
  ];

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

  return (
    <AppScreen>
      <View style={styles.screenHeaderRow}>
        <View style={styles.screenHeaderCopy}>
          <Text style={styles.screenEyebrow}>{language === "fi" ? "Yritys" : "Business"}</Text>
          <Text style={styles.screenTitle}>{homeOverviewQuery.data?.memberships[0]?.businessName ?? copy.common.business}</Text>
          <Text style={styles.metaText}>{copy.business.homeMeta}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push("/business/profile")} style={styles.headerButton}>
            <AppIcon color={theme.colors.textPrimary} name="user" size={18} />
            <Text style={styles.headerButtonText}>{copy.business.profileButton}</Text>
          </Pressable>
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
      </View>
      {signOutError !== null ? <Text style={styles.errorText}>{signOutError}</Text> : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <View style={styles.summaryStrip}>
          <View style={styles.summaryCard}>
            <AppIcon color={theme.colors.lime} name="scan" size={18} />
            <Text style={styles.summaryLabel}>{copy.business.live}</Text>
            <Text style={styles.summaryValue}>{activeJoinedEvents.length}</Text>
          </View>
          <View style={styles.summaryCard}>
            <AppIcon color={theme.colors.textMuted} name="calendar" size={18} />
            <Text style={styles.summaryLabel}>{copy.business.upcoming}</Text>
            <Text style={styles.summaryValue}>{joinedUpcomingEvents.length}</Text>
          </View>
          <View style={styles.summaryCard}>
            <AppIcon color={theme.colors.textMuted} name="history" size={18} />
            <Text style={styles.summaryLabel}>{labels.past}</Text>
            <Text style={styles.summaryValue}>{joinedCompletedEvents.length}</Text>
          </View>
        </View>
      ) : null}

      {homeOverviewQuery.isLoading ? (
        <InfoCard eyebrow={copy.common.loading} title={labels.loadingTitle}>
          <Text style={styles.bodyText}>{labels.loadingBody}</Text>
        </InfoCard>
      ) : null}

      {homeOverviewQuery.error ? (
        <InfoCard eyebrow={copy.common.error} title={labels.errorTitle}>
          <Text style={styles.bodyText}>{homeOverviewQuery.error.message}</Text>
          <Pressable onPress={() => void homeOverviewQuery.refetch()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{copy.common.retry}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <MobileRoleSwitchCard currentArea="business" />
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <View style={[styles.scannerCard, activeJoinedEvents.length > 0 ? styles.scannerCardReady : null]}>
          <View style={styles.scannerCardHeader}>
            {activeJoinedEvents.length > 0 ? (
              <View style={styles.scannerEyebrowRow}>
                <View style={styles.liveDot} />
                <Text style={styles.scannerEyebrow}>{copy.business.scanner}</Text>
              </View>
            ) : (
              <Text style={styles.scannerEyebrow}>{copy.business.scanner}</Text>
            )}
            <Text style={styles.scannerTitle}>
              {activeJoinedEvents.length > 0
                ? labels.scannerReadyTitle
                : labels.scannerStandbyTitle}
            </Text>
          </View>
          <Text style={styles.bodyText}>
            {activeJoinedEvents.length > 0
              ? labels.scannerReadyBody
              : labels.scannerStandbyBody}
          </Text>

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.primaryButton, styles.actionFlex]}
              onPress={() =>
                router.push(
                  activeJoinedEvents.length > 0 ? "/business/scanner" : "/business/events"
                )
              }
            >
              <AppIcon
                color={theme.colors.actionPrimaryText}
                name={activeJoinedEvents.length > 0 ? "scan" : "calendar"}
                size={18}
              />
              <Text style={styles.primaryButtonText}>
                {activeJoinedEvents.length > 0 ? copy.business.openScanner : copy.business.manageEvents}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/business/history")}
              style={[styles.secondaryButton, styles.actionFlex]}
            >
              <AppIcon color={theme.colors.textPrimary} name="history" size={17} />
              <Text adjustsFontSizeToFit numberOfLines={1} style={styles.secondaryButtonText}>
                {labels.historyShort}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error && joinedEvents.length > 0 ? (
        <View style={styles.eventsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>{copy.common.events}</Text>
            <Text style={styles.sectionTitle}>{labels.joinedEventsTitle}</Text>
          </View>
          <AutoAdvancingRail
            contentContainerStyle={eventRailContentStyle}
            intervalMs={3500}
            itemGap={12}
            items={joinedEvents}
            itemWidth={eventRailWidth}
            keyExtractor={(event: BusinessJoinedEventSummary) => event.eventVenueId}
            railStyle={styles.eventRail}
            renderItem={(event: BusinessJoinedEventSummary) => {
              const timelineBadge = getTimelineBadge(
                event,
                copy.business.live,
                copy.business.upcoming,
                labels.completedStatus
              );
              const timelineLabel =
                event.timelineState === "ACTIVE"
                  ? labels.liveEnds
                  : event.timelineState === "UPCOMING"
                    ? labels.upcomingStarts
                    : labels.completedEnded;

              return (
                <Pressable
                  onPress={() => router.push("/business/events")}
                  style={({ pressed }) => [
                    styles.eventVisualCard,
                    pressed ? styles.eventVisualCardPressed : null,
                  ]}
                >
                  <CoverImageSurface
                    fallbackSource={getFallbackCoverSource("eventDiscovery")}
                    imageStyle={styles.eventVisualImage}
                    source={getEventCoverSource(event.coverImageUrl, `${event.eventId}:${event.eventName}`)}
                    style={styles.eventVisualHero}
                  >
                    <View style={styles.eventVisualOverlay} />
                    <View style={styles.eventVisualContent}>
                      <View style={styles.eventVisualHeader}>
                        <StatusBadge label={timelineBadge.label} state={timelineBadge.state} />
                      </View>
                      <View style={styles.eventVisualCopy}>
                        <Text numberOfLines={2} style={styles.eventVisualTitle}>
                          {event.eventName}
                        </Text>
                        <Text numberOfLines={1} style={styles.eventVisualMeta}>
                          {event.businessName} · {event.city}
                        </Text>
                        <Text numberOfLines={1} style={styles.eventVisualMeta}>
                          {timelineLabel}{" "}
                          {formatDateTime(
                            formatter,
                            event.timelineState === "ACTIVE" ? event.endAt : event.startAt
                          )}
                        </Text>
                      </View>
                    </View>
                  </CoverImageSurface>
                  {event.stampLabel ? (
                    <Text numberOfLines={1} style={styles.eventVisualStamp}>
                      {event.stampLabel}
                    </Text>
                  ) : (
                    <View style={styles.eventVisualStampSpacer} />
                  )}
                </Pressable>
              );
            }}
            showsIndicators={false}
          />

          <Pressable onPress={() => router.push("/business/events")} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{labels.viewAllEvents}</Text>
          </Pressable>
        </View>
      ) : null}

      <AnnouncementFeedSection
        compact={true}
        detailPathname="/business/announcement-detail"
        maxItems={5}
        onViewAllPress={() => router.push("/business/updates")}
        presentation="rail"
        returnToPathname="/business/home"
        title={language === "fi" ? "Yrityksen tiedotteet" : "Business updates"}
        userId={userId}
        viewAllLabel={language === "fi" ? "Avaa tiedotevirta" : "Open update feed"}
      />

    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    actionFlex: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: 8,
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
    disabledButton: {
      opacity: 0.62,
    },
    errorText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    eventRail: {
      marginHorizontal: -2,
    },
    eventRailContent: {
      paddingHorizontal: 2,
    },
    eventRailContentSingle: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 0,
    },
    eventVisualCard: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 10,
      height: 278,
      overflow: "hidden",
      padding: 10,
    },
    eventVisualCardPressed: {
      transform: [{ translateY: 1.5 }, { scale: 0.992 }],
    },
    eventVisualContent: {
      flex: 1,
      justifyContent: "space-between",
      padding: 14,
    },
    eventVisualCopy: {
      gap: 4,
    },
    eventVisualHeader: {
      alignItems: "flex-end",
    },
    eventVisualHero: {
      borderRadius: theme.radius.inner,
      height: 214,
      overflow: "hidden",
      position: "relative",
    },
    eventVisualImage: {
      borderRadius: theme.radius.inner,
    },
    eventVisualMeta: {
      color: "rgba(248, 250, 245, 0.78)",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    eventVisualOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.54)",
    },
    eventVisualStamp: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.caption,
      letterSpacing: 1,
      lineHeight: theme.typography.lineHeights.caption,
      textTransform: "uppercase",
    },
    eventVisualStampSpacer: {
      minHeight: theme.typography.lineHeights.caption,
    },
    eventVisualTitle: {
      color: "#F8FAF5",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
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
      minHeight: 48,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    primaryButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      textAlign: "center",
    },
    headerButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      minHeight: 42,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    headerActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    headerButtonText: {
      color: theme.colors.textPrimary,
      flexShrink: 1,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
      textAlign: "center",
    },
    iconButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    iconButtonDanger: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.danger,
      borderRadius: 999,
      borderWidth: 1,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    signOutConfirmRow: {
      flexDirection: "row",
      gap: 8,
    },
    screenHeaderCopy: {
      flex: 1,
      gap: 6,
    },
    screenHeaderRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      marginBottom: 4,
    },
    screenHeader: {
      gap: 6,
      marginBottom: 4,
    },
    screenEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.titleLarge,
      letterSpacing: -0.8,
      lineHeight: theme.typography.lineHeights.titleLarge,
    },
    scannerCard: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      gap: 14,
      padding: 18,
    },
    scannerCardReady: {
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
    },
    scannerCardHeader: {
      gap: 4,
    },
    scannerEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    scannerTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      letterSpacing: -0.3,
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
      borderWidth: 1,
      flex: 1,
      gap: 4,
      padding: 14,
    },
    summaryLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textTransform: "uppercase",
    },
    summaryStrip: {
      flexDirection: "row",
      gap: 10,
    },
    scannerEyebrowRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    liveDot: {
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      height: 7,
      width: 7,
    },
    summaryValue: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
  });
