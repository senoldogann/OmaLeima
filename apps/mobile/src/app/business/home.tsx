import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { AnnouncementFeedSection } from "@/features/announcements/announcement-feed-section";
import { MobileRoleSwitchCard } from "@/features/auth/components/mobile-role-switch-card";
import {
  markBusinessOnboardingSeenAsync,
  readBusinessOnboardingSeenAsync,
} from "@/features/business/business-onboarding";
import { BusinessOnboardingModal } from "@/features/business/components/business-onboarding-modal";
import { useBusinessHomeOverviewQuery } from "@/features/business/business-home";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

const formatDateTime = (formatter: Intl.DateTimeFormat, value: string): string =>
  formatter.format(new Date(value));

export default function BusinessHomeScreen() {
  const router = useRouter();
  const styles = useThemeStyles(createStyles);
  const { copy, language, localeTag, theme } = useUiPreferences();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [isBusinessOnboardingVisible, setIsBusinessOnboardingVisible] = useState<boolean>(false);

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

  useEffect(() => {
    if (userId === null) {
      setIsBusinessOnboardingVisible(false);
      return;
    }

    let isMounted = true;

    readBusinessOnboardingSeenAsync(userId)
      .then((hasSeenOnboarding) => {
        if (!isMounted || hasSeenOnboarding) {
          return;
        }

        setIsBusinessOnboardingVisible(true);
      })
      .catch((error: unknown) => {
        console.warn("Failed to read business onboarding state.", { error, userId });
        if (isMounted) {
          setIsBusinessOnboardingVisible(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const activeJoinedEvents = homeOverviewQuery.data?.joinedActiveEvents ?? [];
  const joinedUpcomingEvents = homeOverviewQuery.data?.joinedUpcomingEvents ?? [];
  const joinedCompletedEvents = homeOverviewQuery.data?.joinedCompletedEvents ?? [];
  const joinedEvents = [...activeJoinedEvents, ...joinedUpcomingEvents, ...joinedCompletedEvents.slice(0, 2)];

  const handleBusinessOnboardingDismissAsync = async (): Promise<void> => {
    setIsBusinessOnboardingVisible(false);

    if (userId === null) {
      return;
    }

    try {
      await markBusinessOnboardingSeenAsync(userId);
    } catch (error: unknown) {
      console.warn("Failed to save business onboarding state.", { error, userId });
    }
  };

  return (
    <AppScreen>
      {/* App header bar */}
      <View style={styles.businessHeader}>
        <View style={styles.businessBrand}>
          <AppIcon color={theme.colors.lime} name="zap" size={18} />
          <Text style={styles.businessBrandTitle}>OmaLeima</Text>
        </View>
        <Pressable
          onPress={() => router.push("/business/profile" as never)}
          style={styles.headerIconBtn}
        >
          <AppIcon color={theme.colors.textPrimary} name="user" size={18} />
        </Pressable>
      </View>

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
            <View style={styles.sectionHeaderRow}>
              <AppIcon color={theme.colors.lime} name="calendar" size={14} />
              <Text style={styles.sectionTitle}>{labels.joinedEventsTitle}</Text>
            </View>
            <Text style={styles.sectionCount}>{joinedEvents.length}</Text>
          </View>
          {joinedEvents.map((event) => {
            const isActive = event.timelineState === "ACTIVE";
            const isUpcoming = event.timelineState === "UPCOMING";
            const accentColor = isActive
              ? theme.colors.lime
              : isUpcoming
                ? theme.colors.warning
                : theme.colors.textMuted;
            const statusLabel = isActive
              ? copy.business.live
              : isUpcoming
                ? copy.business.upcoming
                : labels.completedStatus;
            const timeLabel = isActive
              ? `${labels.liveEnds} ${formatDateTime(formatter, event.endAt)}`
              : isUpcoming
                ? `${labels.upcomingStarts} ${formatDateTime(formatter, event.startAt)}`
                : `${labels.completedEnded} ${formatDateTime(formatter, event.endAt)}`;

            return (
              <Pressable
                key={event.eventVenueId}
                onPress={() => router.push("/business/events")}
                style={[styles.eventCard, isActive ? styles.eventCardActive : null]}
              >
                <View style={[styles.eventCardAccent, { backgroundColor: accentColor }]} />
                <View style={styles.eventCardInner}>
                  <View style={styles.eventCardTop}>
                    {isActive ? (
                      <View style={styles.eventLiveRow}>
                        <View style={[styles.eventLiveDot, { backgroundColor: accentColor }]} />
                        <Text style={[styles.eventStatusLabel, { color: accentColor }]}>{statusLabel}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.eventStatusLabel, { color: accentColor }]}>{statusLabel}</Text>
                    )}
                    <AppIcon color={theme.colors.textMuted} name="chevron-right" size={14} />
                  </View>
                  <Text numberOfLines={1} style={styles.eventCardTitle}>{event.eventName}</Text>
                  <Text numberOfLines={1} style={styles.eventCardMeta}>{timeLabel}</Text>
                </View>
              </Pressable>
            );
          })}
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

      <BusinessOnboardingModal
        isVisible={isBusinessOnboardingVisible}
        onDismiss={() => void handleBusinessOnboardingDismissAsync()}
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
    eventCard: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      flexDirection: "row",
      overflow: "hidden",
    },
    eventCardActive: {
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
    },
    eventCardAccent: {
      width: 4,
    },
    eventCardInner: {
      flex: 1,
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    eventCardTop: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    eventCardTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    eventCardMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    eventLiveRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 5,
    },
    eventLiveDot: {
      borderRadius: 999,
      height: 6,
      width: 6,
    },
    eventStatusLabel: {
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 0.8,
      textTransform: "uppercase",
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
    businessBrand: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    businessBrandTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: 20,
      letterSpacing: -0.5,
      lineHeight: 26,
    },
    businessHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    headerIconBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      height: 42,
      justifyContent: "center",
      width: 42,
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
    sectionCount: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    sectionHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    sectionHeaderRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
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
