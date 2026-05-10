import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { EmptyStateCard } from "@/components/empty-state-card";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { useClubDashboardQuery } from "@/features/club/club-dashboard";
import { ClubEventPreviewModal } from "@/features/club/components/club-event-preview-modal";
import { sortClubEventsForOrganizer } from "@/features/club/event-ordering";
import type { ClubDashboardEventSummary, ClubDashboardTimelineState } from "@/features/club/types";
import { getEventCoverSourceWithFallback } from "@/features/events/event-visuals";
import { findOverlappingEvents } from "@/features/events/event-overlaps";
import type { MobileTheme } from "@/features/foundation/theme";
import { createUserSafeErrorMessage } from "@/features/foundation/user-safe-error";
import { useManualRefresh } from "@/features/foundation/use-manual-refresh";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

type UpcomingTimelineState = Exclude<ClubDashboardTimelineState, "CANCELLED" | "COMPLETED">;
type StatusFilter = "ALL" | UpcomingTimelineState | "COMPLETED";
type DateFilter = "ALL" | "TODAY" | "WEEK";
const statusFilters = ["ALL", "LIVE", "UPCOMING", "DRAFT", "COMPLETED"] as const satisfies readonly StatusFilter[];

const formatDateTime = (formatter: Intl.DateTimeFormat, value: string): string =>
  formatter.format(new Date(value));

const getTimelineBadge = (
  timelineState: ClubDashboardTimelineState,
  labels: Record<ClubDashboardTimelineState, string>
): { label: string; state: "pending" | "ready" | "warning" } => {
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

const isInsideDateFilter = (event: ClubDashboardEventSummary, dateFilter: DateFilter): boolean => {
  if (dateFilter === "ALL") {
    return true;
  }

  const now = new Date();
  const startAt = new Date(event.startAt);
  const endAt = new Date(event.endAt);

  if (dateFilter === "TODAY") {
    const compareValue = event.timelineState === "COMPLETED" ? endAt : startAt;

    return (
      now.getFullYear() === compareValue.getFullYear() &&
      now.getMonth() === compareValue.getMonth() &&
      now.getDate() === compareValue.getDate()
    );
  }

  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (event.timelineState === "COMPLETED") {
    return endAt >= weekStart && endAt <= now;
  }

  return startAt >= now && startAt <= weekEnd;
};

export default function ClubUpcomingScreen() {
  const router = useRouter();
  const { language, localeTag, theme } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [dateFilter, setDateFilter] = useState<DateFilter>("ALL");
  const [previewEvent, setPreviewEvent] = useState<ClubDashboardEventSummary | null>(null);
  const dashboardQuery = useClubDashboardQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });
  const manualRefresh = useManualRefresh(dashboardQuery.refetch);

  const labels = useMemo(
    () => ({
      all: language === "fi" ? "Kaikki" : "All",
      dateFilters: {
        ALL: language === "fi" ? "Kaikki ajat" : "All dates",
        TODAY: language === "fi" ? "Tänään" : "Today",
        WEEK: language === "fi" ? "7 päivää" : "7 days",
      } satisfies Record<DateFilter, string>,
      empty:
        language === "fi"
          ? "Näillä suodattimilla ei löytynyt tapahtumia."
          : "No events matched these filters.",
      filters: language === "fi" ? "Suodattimet" : "Filters",
      metrics: {
        claims: language === "fi" ? "luovutettu" : "claimed",
        participants: language === "fi" ? "osallistujaa" : "participants",
        venues: language === "fi" ? "rastia" : "venues",
      },
      rewardHandoff: language === "fi" ? "Palkintojen luovutus" : "Reward handoff",
      rewardHandoffBody:
        language === "fi"
          ? "Avaa luovutusjono, kun osallistuja näyttää valmiin palkinnon."
          : "Open the handoff queue when a participant shows a ready reward.",
      openRewardHandoff: language === "fi" ? "Avaa luovutusjono" : "Open handoff queue",
      status: {
        CANCELLED: language === "fi" ? "Peruttu" : "Cancelled",
        COMPLETED: language === "fi" ? "Päättynyt" : "Completed",
        DRAFT: language === "fi" ? "Luonnos" : "Draft",
        LIVE: language === "fi" ? "Käynnissä" : "Live",
        UPCOMING: language === "fi" ? "Tulossa" : "Upcoming",
      } satisfies Record<ClubDashboardTimelineState, string>,
      subtitle:
        language === "fi"
          ? "Rajaa tapahtumat nopeasti ennen muokkausta."
          : "Filter events before editing.",
      title: language === "fi" ? "Tulossa" : "Upcoming",
    }),
    [language]
  );

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        weekday: "short",
      }),
    [localeTag]
  );

  const events = useMemo(() => {
    const sourceEvents = dashboardQuery.data?.events ?? [];
    const filteredEvents = sourceEvents
      .filter((event) => event.timelineState !== "CANCELLED")
      .filter((event) => statusFilter === "COMPLETED" || event.timelineState !== "COMPLETED")
      .filter((event) => statusFilter === "ALL" || event.timelineState === statusFilter)
      .filter((event) => isInsideDateFilter(event, dateFilter));

    return sortClubEventsForOrganizer(filteredEvents);
  }, [dashboardQuery.data?.events, dateFilter, statusFilter]);
  const overlappingEvents = useMemo(
    () =>
      findOverlappingEvents(
        events.map((event) => ({
          endAt: event.endAt,
          id: event.eventId,
          name: event.name,
          startAt: event.startAt,
        }))
      ),
    [events]
  );

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
      <View style={styles.topBar}>
        <View style={styles.topBarCopy}>
          <Text style={styles.topBarEyebrow}>{language === "fi" ? "Klubi" : "Club"}</Text>
          <Text style={styles.screenTitle}>{labels.title}</Text>
          <Text style={styles.metaText}>{labels.subtitle}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
        {statusFilters.map((filter) => (
          <Pressable
            key={filter}
            onPress={() => setStatusFilter(filter)}
            style={[styles.filterChip, statusFilter === filter ? styles.filterChipActive : null]}
          >
            <Text style={styles.filterChipText}>{filter === "ALL" ? labels.all : labels.status[filter]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
        {(["ALL", "TODAY", "WEEK"] as DateFilter[]).map((filter) => (
          <Pressable
            key={filter}
            onPress={() => setDateFilter(filter)}
            style={[styles.filterChip, dateFilter === filter ? styles.filterChipActive : null]}
          >
            <Text style={styles.filterChipText}>{labels.dateFilters[filter]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {dashboardQuery.error ? (
        <InfoCard eyebrow="Club" title={language === "fi" ? "Tapahtumat eivät latautuneet" : "Events did not load"}>
          <Text style={styles.bodyText}>{createUserSafeErrorMessage(dashboardQuery.error, language, "clubDashboard")}</Text>
        </InfoCard>
      ) : null}

      {!dashboardQuery.isLoading && !dashboardQuery.error && events.length === 0 ? (
        <EmptyStateCard body={labels.empty} eyebrow="Club" iconName="calendar" title={labels.title} />
      ) : null}

      {!dashboardQuery.isLoading && !dashboardQuery.error && overlappingEvents.length > 1 ? (
        <InfoCard
          eyebrow={language === "fi" ? "Huomio" : "Heads up"}
          title={language === "fi" ? "Samanaikaisia tapahtumia" : "Overlapping events"}
          variant="subtle"
        >
          <Text style={styles.overlappingNoticeText}>
            {language === "fi"
              ? "Useampi näkyvä tapahtuma osuu samaan aikaan. Tarkista viestit ja rastit, jotta osallistujat avaavat oikean QR:n."
              : "Multiple visible events overlap. Check messaging and venues so participants open the correct QR."}
          </Text>
        </InfoCard>
      ) : null}

      {!dashboardQuery.isLoading &&
      !dashboardQuery.error &&
      dashboardQuery.data !== undefined &&
      (dashboardQuery.data.summary.rewardTierCount > 0 || dashboardQuery.data.summary.claimedRewardCount > 0) ? (
        <InfoCard eyebrow={labels.metrics.claims} title={labels.rewardHandoff} variant="subtle">
          <Text style={styles.bodyText}>{labels.rewardHandoffBody}</Text>
          <Pressable onPress={() => router.push("/club/claims")} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{labels.openRewardHandoff}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {events.map((event) => {
        const badge = getTimelineBadge(event.timelineState, labels.status);

        return (
          <Pressable
            key={event.eventId}
            onPress={() => setPreviewEvent(event)}
          >
            <CoverImageSurface
              source={getEventCoverSourceWithFallback(event.coverImageUrl, "clubControl")}
              style={styles.eventCard}
            >
              <View style={styles.eventOverlay} />
              <View style={styles.eventContent}>
                <View style={styles.eventTopRow}>
                  <StatusBadge label={badge.label} state={badge.state} />
                  <Text style={styles.eventDate}>{formatDateTime(formatter, event.startAt)}</Text>
                </View>
                <View style={styles.eventBottom}>
                  <Text numberOfLines={2} style={styles.eventTitle}>{event.name}</Text>
                  <Text style={styles.eventMeta}>{event.clubName} · {event.city}</Text>
                  <View style={styles.eventMetricRow}>
                    <Text style={styles.eventMetricText}>{event.registeredParticipantCount} {labels.metrics.participants}</Text>
                    <Text style={styles.eventMetricText}>{event.joinedVenueCount} {labels.metrics.venues}</Text>
                    <Text style={styles.eventMetricText}>{event.claimedRewardCount}/{event.rewardTierCount} {labels.metrics.claims}</Text>
                  </View>
                </View>
              </View>
            </CoverImageSurface>
          </Pressable>
        );
      })}
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
    overlappingNoticeText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    eventBottom: {
      gap: 8,
    },
    eventCard: {
      borderRadius: theme.radius.scene,
      height: 258,
      overflow: "hidden",
      position: "relative",
    },
    eventContent: {
      flex: 1,
      justifyContent: "space-between",
      padding: 18,
    },
    eventDate: {
      color: "rgba(255,255,255,0.86)",
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    eventMeta: {
      color: "rgba(255,255,255,0.76)",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    eventMetricRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    eventMetricText: {
      color: "rgba(255,255,255,0.84)",
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    eventOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.52)",
    },
    eventTitle: {
      color: "#FFFFFF",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    eventTopRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    filterChip: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      paddingHorizontal: 13,
      paddingVertical: 9,
    },
    filterChipActive: {
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
    },
    filterChipText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    filterRail: {
      gap: 8,
      paddingRight: 4,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    secondaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: theme.mode === "light" ? 1 : 0,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
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
    topBar: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
    },
    topBarCopy: {
      flex: 1,
      gap: 4,
    },
  });
