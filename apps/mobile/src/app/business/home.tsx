import { useMemo } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { useBusinessHomeOverviewQuery } from "@/features/business/business-home";
import type { BusinessJoinedEventSummary } from "@/features/business/types";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
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
  const styles = useThemeStyles(createStyles);
  const { copy, language, localeTag, theme } = useUiPreferences();
  const { session } = useSession();
  const userId = session?.user.id ?? null;

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
          ? "Avaa skanneri ja pidä jono liikkeessä."
          : "Open the scanner and keep the line moving.",
      scannerStandbyBody:
        language === "fi"
          ? "Skanneri avautuu, kun liittymäsi tapahtuma on käynnissä."
          : "The scanner opens automatically once a joined event is live.",
      joinedEventsTitle: copy.business.joinedEvents,
      viewAllEvents: language === "fi" ? "Kaikki tapahtumat" : "View all events",
      signedInFallback: language === "fi" ? "yritystili" : "business account",
      liveEnds: language === "fi" ? "Päättyy" : "Ends",
      upcomingStarts: language === "fi" ? "Alkaa" : "Starts",
      completedEnded: language === "fi" ? "Päättyi" : "Ended",
      completedStatus: language === "fi" ? "Päättynyt" : "Completed",
    }),
    [copy.business.joinedEvents, language]
  );

  const homeOverviewQuery = useBusinessHomeOverviewQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });

  const activeJoinedEvents = homeOverviewQuery.data?.joinedActiveEvents ?? [];
  const joinedUpcomingEvents = homeOverviewQuery.data?.joinedUpcomingEvents ?? [];
  const joinedEvents = [...activeJoinedEvents, ...joinedUpcomingEvents];

  return (
    <AppScreen>
      <View style={styles.screenHeaderRow}>
        <View style={styles.screenHeaderCopy}>
          <Text style={styles.screenTitle}>{copy.common.business}</Text>
          <Text style={styles.metaText}>{copy.business.homeMeta}</Text>
        </View>
        <Pressable onPress={() => router.push("/business/profile")} style={styles.headerButton}>
          <AppIcon color={theme.colors.textPrimary} name="user" size={18} />
          <Text style={styles.headerButtonText}>{copy.business.profileButton}</Text>
        </Pressable>
      </View>

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <View style={styles.summaryStrip}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{copy.business.live}</Text>
            <Text style={styles.summaryValue}>{activeJoinedEvents.length}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{copy.business.upcoming}</Text>
            <Text style={styles.summaryValue}>{joinedUpcomingEvents.length}</Text>
          </View>
          <View style={styles.summaryCardWide}>
            <Text numberOfLines={1} style={styles.summaryEmail}>
              {session?.user.email ?? labels.signedInFallback}
            </Text>
            <Text style={styles.summaryLabel}>{copy.business.signedIn}</Text>
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
        <InfoCard
          eyebrow={copy.business.scanner}
          title={
            activeJoinedEvents.length > 0
              ? labels.scannerReadyTitle
              : labels.scannerStandbyTitle
          }
          variant="scene"
        >
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
                color={theme.colors.screenBase}
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
              <Text style={styles.secondaryButtonText}>{copy.business.scanHistory}</Text>
            </Pressable>
          </View>
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error && joinedEvents.length > 0 ? (
        <InfoCard eyebrow={copy.common.events} title={labels.joinedEventsTitle}>
          <View style={styles.eventList}>
            {joinedEvents.map((event) => {
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
                <View key={event.eventVenueId} style={styles.eventRow}>
                  <View style={styles.eventRowHeader}>
                    <Text style={styles.eventRowTitle}>{event.eventName}</Text>
                    <StatusBadge label={timelineBadge.label} state={timelineBadge.state} />
                  </View>
                  <Text style={styles.eventRowMeta}>
                    {event.businessName} · {event.city}
                  </Text>
                  <Text style={styles.eventRowMeta}>
                    {timelineLabel}{" "}
                    {formatDateTime(
                      formatter,
                      event.timelineState === "ACTIVE" ? event.endAt : event.startAt
                    )}
                  </Text>
                  {event.stampLabel ? (
                    <Text style={styles.eventRowStamp}>{event.stampLabel}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>

          <Pressable onPress={() => router.push("/business/events")} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{labels.viewAllEvents}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      <View style={styles.dangerZone}>
        <SignOutButton />
      </View>
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
    dangerZone: {
      marginTop: 4,
    },
    eventList: {
      gap: 8,
    },
    eventRow: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      gap: 6,
      padding: 14,
    },
    eventRowHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    eventRowMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    eventRowStamp: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      letterSpacing: 1,
      lineHeight: theme.typography.lineHeights.caption,
      textTransform: "uppercase",
    },
    eventRowTitle: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      marginRight: 8,
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
    headerButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
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
      borderWidth: 1,
      flex: 1,
      gap: 4,
      padding: 14,
    },
    summaryCardWide: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      flex: 1.3,
      gap: 4,
      padding: 14,
    },
    summaryEmail: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
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
    summaryValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
  });
