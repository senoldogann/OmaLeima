import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { useClubDashboardQuery } from "@/features/club/club-dashboard";
import type { ClubDashboardEventSummary, ClubDashboardTimelineState } from "@/features/club/types";
import { getEventCoverSourceWithFallback } from "@/features/events/event-visuals";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

type StatusFilter = "ALL" | ClubDashboardTimelineState;
type DateFilter = "ALL" | "TODAY" | "WEEK";

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

  if (dateFilter === "TODAY") {
    return (
      now.getFullYear() === startAt.getFullYear() &&
      now.getMonth() === startAt.getMonth() &&
      now.getDate() === startAt.getDate()
    );
  }

  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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
  const dashboardQuery = useClubDashboardQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });

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
      status: {
        CANCELLED: language === "fi" ? "Peruttu" : "Cancelled",
        COMPLETED: language === "fi" ? "Päättynyt" : "Completed",
        DRAFT: language === "fi" ? "Luonnos" : "Draft",
        LIVE: language === "fi" ? "Käynnissä" : "Live",
        UPCOMING: language === "fi" ? "Tulossa" : "Upcoming",
      } satisfies Record<ClubDashboardTimelineState, string>,
      subtitle:
        language === "fi"
          ? "Suodata tapahtumat ajan ja tilan mukaan ennen muokkausta tai tapahtumapäivää."
          : "Filter events by time and state before editing or event day.",
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

    return sourceEvents
      .filter((event) => statusFilter === "ALL" || event.timelineState === statusFilter)
      .filter((event) => isInsideDateFilter(event, dateFilter))
      .sort((leftEvent, rightEvent) => new Date(leftEvent.startAt).getTime() - new Date(rightEvent.startAt).getTime());
  }, [dashboardQuery.data?.events, dateFilter, statusFilter]);

  return (
    <AppScreen>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.push("/club/home")} style={styles.backButton}>
          <AppIcon color={theme.colors.textPrimary} name="chevron-left" size={18} />
        </Pressable>
        <View style={styles.topBarCopy}>
          <Text style={styles.screenTitle}>{labels.title}</Text>
          <Text style={styles.metaText}>{labels.subtitle}</Text>
        </View>
      </View>

      <InfoCard eyebrow="Club" title={labels.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
          {(["ALL", "LIVE", "UPCOMING", "DRAFT", "COMPLETED", "CANCELLED"] as StatusFilter[]).map((filter) => (
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
      </InfoCard>

      {dashboardQuery.error ? (
        <InfoCard eyebrow="Club" title={language === "fi" ? "Tapahtumat eivät latautuneet" : "Events did not load"}>
          <Text style={styles.bodyText}>{dashboardQuery.error.message}</Text>
        </InfoCard>
      ) : null}

      {!dashboardQuery.isLoading && !dashboardQuery.error && events.length === 0 ? (
        <InfoCard eyebrow="Club" title={labels.title}>
          <Text style={styles.bodyText}>{labels.empty}</Text>
        </InfoCard>
      ) : null}

      {events.map((event) => {
        const badge = getTimelineBadge(event.timelineState, labels.status);

        return (
          <CoverImageSurface
            key={event.eventId}
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
        );
      })}
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    backButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    eventBottom: {
      gap: 8,
    },
    eventCard: {
      borderRadius: theme.radius.scene,
      minHeight: 250,
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
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    topBar: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
    },
    topBarCopy: {
      flex: 1,
      gap: 6,
    },
  });
