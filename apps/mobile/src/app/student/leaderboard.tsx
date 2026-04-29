import { useEffect, useMemo, useState } from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useIsFocused } from "@react-navigation/native";

import { AppScreen } from "@/components/app-screen";
import { AppIcon } from "@/components/app-icon";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { getEventCoverSource } from "@/features/events/event-visuals";
import { LeaderboardEntryCard } from "@/features/leaderboard/components/leaderboard-entry-card";
import { interactiveSurfaceShadowStyle, mobileTheme } from "@/features/foundation/theme";
import {
  hydrateRegisteredLeaderboardEvents,
  selectDefaultLeaderboardEvent,
  useEventLeaderboardQuery,
  useStudentLeaderboardOverviewQuery,
} from "@/features/leaderboard/student-leaderboard";
import { useStudentEventLeaderboardRealtime } from "@/features/realtime/student-realtime";
import { useSession } from "@/providers/session-provider";
import { useActiveAppState, useCurrentTime } from "@/features/qr/student-qr";

const dateTimeFormatter = new Intl.DateTimeFormat("en-FI", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const formatDateTime = (value: string): string => dateTimeFormatter.format(new Date(value));

const getFreshnessBadge = (refreshedAt: string | null): { label: string; state: "ready" | "pending" } =>
  refreshedAt === null
    ? { label: "refresh pending", state: "pending" }
    : { label: "refreshed", state: "ready" };

const getPodiumHeight = (rank: number): number => {
  if (rank === 1) return 166;
  if (rank === 2) return 134;
  return 118;
};

const getPodiumInitials = (value: string | null, rank: number): string => {
  const source = value?.trim() ?? `Student ${rank}`;
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return `${rank}`;
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

const createLeaderboardHeroLabel = (
  selectedEventName: string | null,
  top10Count: number,
  currentRank: number | null
): string => {
  if (selectedEventName === null) {
    return "Choose an event to see the live standings.";
  }

  if (top10Count === 0) {
    return `${selectedEventName} is ready, but no ranked leima streak is visible yet.`;
  }

  if (currentRank !== null) {
    return `${selectedEventName} top 10 is live. Your current place is #${currentRank}.`;
  }

  return `${selectedEventName} top 10 is live now.`;
};

export default function StudentLeaderboardScreen() {
  const isFocused = useIsFocused();
  const isAppActive = useActiveAppState();
  const { session } = useSession();
  const now = useCurrentTime(isFocused && isAppActive);
  const studentId = session?.user.id ?? null;
  const overviewQuery = useStudentLeaderboardOverviewQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null,
  });
  const overviewData = overviewQuery.data;
  const events = useMemo(
    () => hydrateRegisteredLeaderboardEvents(overviewData?.events ?? [], now),
    [now, overviewData]
  );
  const registeredEventCount = overviewData?.registeredEventCount ?? 0;
  const defaultEvent = useMemo(() => selectDefaultLeaderboardEvent(events), [events]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedEventId === null && defaultEvent !== null) {
      setSelectedEventId(defaultEvent.id);
      return;
    }

    if (selectedEventId !== null && !events.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(defaultEvent?.id ?? null);
    }
  }, [defaultEvent, events, selectedEventId]);

  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ?? defaultEvent ?? null;

  const leaderboardQuery = useEventLeaderboardQuery({
    eventId: selectedEvent?.id ?? "",
    studentId: studentId ?? "",
    isEnabled: selectedEvent !== null && studentId !== null,
  });

  useStudentEventLeaderboardRealtime({
    eventId: selectedEvent?.id ?? "",
    studentId: studentId ?? "",
    isEnabled: selectedEvent !== null && studentId !== null && isFocused && isAppActive,
  });

  const top10 = leaderboardQuery.data?.top10 ?? [];
  const currentUser = leaderboardQuery.data?.currentUser ?? null;
  const podiumEntries = top10.slice(0, 3);
  const standingsEntries = top10.slice(3);
  const leaderboardRefreshedAt = leaderboardQuery.data?.refreshedAt ?? null;
  const leaderboardVersion = leaderboardQuery.data?.version ?? null;
  const freshness = getFreshnessBadge(leaderboardRefreshedAt);
  const heroCoverSource = getEventCoverSource(null, selectedEvent?.id ?? "leaderboard-hero");
  const heroLabel = createLeaderboardHeroLabel(selectedEvent?.name ?? null, top10.length, currentUser?.rank ?? null);

  const overviewState = overviewQuery.error
    ? "error"
    : overviewQuery.isLoading
      ? "loading"
      : events.length === 0
        ? "empty"
        : "ready";
  const rankingState =
    selectedEvent === null
      ? "idle"
      : leaderboardQuery.error
        ? "error"
        : leaderboardQuery.isLoading
          ? "loading"
          : top10.length === 0
            ? "empty"
            : "ready";

  return (
    <AppScreen>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Leaderboard</Text>
        <Text style={styles.metaText}>Track the event top 10 and your current rank.</Text>
      </View>

      {overviewState !== "ready" ? (
        <InfoCard
          eyebrow={overviewState === "error" ? "Error" : overviewState === "loading" ? "Loading" : "Standby"}
          title={
            overviewState === "error"
              ? "Could not open leaderboard"
              : overviewState === "loading"
                ? "Opening leaderboard"
                : "No leaderboard event ready"
          }
        >
          {overviewState === "error" ? (
            <Text selectable style={styles.bodyText}>{overviewQuery.error?.message}</Text>
          ) : overviewState === "loading" ? (
            <Text selectable style={styles.bodyText}>
              Loading registered events and choosing the most relevant scope.
            </Text>
          ) : (
            <Text selectable style={styles.bodyText}>
              {registeredEventCount === 0
                ? "Join an event first. Once you are registered for a public event, its leaderboard appears here."
                : "You still have registrations, but none of those events expose a public leaderboard right now."}
            </Text>
          )}
          {overviewState === "error" ? (
            <Pressable onPress={() => void overviewQuery.refetch()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Retry</Text>
            </Pressable>
          ) : null}
        </InfoCard>
      ) : null}

      {events.length > 0 ? (
        <>
          <ImageBackground imageStyle={styles.heroImage} source={heroCoverSource} style={styles.heroBand}>
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.badges}>
                {selectedEvent ? (
                  <StatusBadge
                    label={selectedEvent.timelineState.toLowerCase()}
                    state={
                      selectedEvent.timelineState === "ACTIVE"
                        ? "ready"
                        : selectedEvent.timelineState === "UPCOMING"
                          ? "pending"
                          : "warning"
                    }
                  />
                ) : null}
                <StatusBadge label={freshness.label} state={freshness.state} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>Student standings</Text>
                <Text style={styles.heroTitle}>{selectedEvent?.name ?? "Leaderboard"}</Text>
                <Text style={styles.heroMeta}>{heroLabel}</Text>
              </View>

              {selectedEvent ? (
                <View style={styles.heroStats}>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatValue}>{selectedEvent.city}</Text>
                    <Text style={styles.heroStatLabel}>city</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStat}>
                    <Text numberOfLines={1} style={styles.heroStatValue}>
                      {formatDateTime(selectedEvent.startAt)}
                    </Text>
                    <Text style={styles.heroStatLabel}>starts</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </ImageBackground>

          <View style={styles.eventSelectorSection}>
            <View style={styles.eventSelectorHeader}>
              <Text style={styles.sectionKicker}>Choose event</Text>
              {leaderboardRefreshedAt !== null ? (
                <Text style={styles.eventSelectorMeta}>
                  Refreshed {formatDateTime(leaderboardRefreshedAt)}
                  {leaderboardVersion === null ? "" : ` · v${leaderboardVersion}`}
                </Text>
              ) : null}
            </View>

            <ScrollView
              contentContainerStyle={styles.eventSelector}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {events.map((event) => (
                <Pressable
                  key={event.id}
                  onPress={() => setSelectedEventId(event.id)}
                  style={[
                    styles.eventChip,
                    selectedEvent?.id === event.id ? styles.selectedEventChip : null,
                  ]}
                >
                  <Text style={styles.eventChipTitle}>{event.name}</Text>
                  <View style={styles.eventChipRow}>
                    <Text style={styles.eventChipMeta}>{event.timelineState.toLowerCase()}</Text>
                    <AppIcon color={selectedEvent?.id === event.id ? mobileTheme.colors.lime : mobileTheme.colors.textMuted} name="chevron-right" size={14} />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </>
      ) : null}

      {rankingState === "loading" || rankingState === "error" || rankingState === "empty" ? (
        <InfoCard
          eyebrow={rankingState === "error" ? "Error" : rankingState === "loading" ? "Loading" : "Standby"}
          title={
            rankingState === "error"
              ? "Could not load ranking"
              : rankingState === "loading"
                ? "Updating event ranking"
                : "No leaderboard entries yet"
          }
        >
          {rankingState === "error" ? (
            <Text selectable style={styles.bodyText}>{leaderboardQuery.error?.message}</Text>
          ) : rankingState === "loading" ? (
            <Text selectable style={styles.bodyText}>
              Loading Top 10 and your current position for {selectedEvent?.name}.
            </Text>
          ) : (
            <Text selectable style={styles.bodyText}>
              The event exists, but no valid stamp scores have been aggregated yet.
            </Text>
          )}
          {rankingState === "error" ? (
            <Pressable onPress={() => void leaderboardQuery.refetch()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Retry</Text>
            </Pressable>
          ) : null}
        </InfoCard>
      ) : null}

      {top10.length > 0 ? (
        <View style={styles.standingsStage}>
          {podiumEntries.length > 0 ? (
            <View style={styles.podiumSection}>
              <Text style={styles.sectionKicker}>Top three</Text>
              <View style={styles.podiumRow}>
                {podiumEntries
                  .slice()
                  .sort((left, right) => {
                    const visualOrder: Record<number, number> = { 2: 0, 1: 1, 3: 2 };
                    return (visualOrder[left.rank] ?? left.rank) - (visualOrder[right.rank] ?? right.rank);
                  })
                  .map((entry) => (
                    <View
                      key={`podium-${entry.studentId}-${entry.rank}`}
                      style={[
                        styles.podiumCard,
                        {
                          height: getPodiumHeight(entry.rank),
                        },
                        entry.rank === 1 ? styles.podiumCardFirst : null,
                        entry.studentId === studentId ? styles.podiumCardCurrent : null,
                      ]}
                    >
                      <View style={styles.podiumRankBubble}>
                        <Text style={styles.podiumRankText}>#{entry.rank}</Text>
                      </View>
                      <View style={styles.podiumAvatar}>
                        <Text style={styles.podiumAvatarText}>
                          {getPodiumInitials(entry.displayName, entry.rank)}
                        </Text>
                      </View>
                      <Text numberOfLines={1} style={styles.podiumName}>
                        {entry.displayName ?? `Student ${entry.rank}`}
                      </Text>
                      <Text style={styles.podiumScore}>{entry.stampCount}</Text>
                      <Text style={styles.podiumScoreLabel}>leima</Text>
                      {entry.studentId === studentId ? <StatusBadge label="you" state="ready" /> : null}
                    </View>
                  ))}
              </View>
            </View>
          ) : null}

          {standingsEntries.length > 0 ? (
            <View style={styles.listGroup}>
              <Text style={styles.sectionKicker}>Standings</Text>
              {standingsEntries.map((entry) => (
                <LeaderboardEntryCard
                  key={`${entry.studentId}-${entry.rank}`}
                  entry={entry}
                  isCurrentUser={entry.studentId === studentId}
                />
              ))}
            </View>
          ) : null}

          {podiumEntries.length > 0 && standingsEntries.length === 0 ? (
            <Text selectable style={styles.metaText}>
              More entries appear here once the event gets more valid leima scans.
            </Text>
          ) : null}

          {currentUser !== null && !top10.some((entry) => entry.studentId === currentUser.studentId) ? (
            <View style={styles.currentUserSection}>
              <Text style={styles.currentUserLabel}>Your position</Text>
              <LeaderboardEntryCard entry={currentUser} isCurrentUser />
            </View>
          ) : null}

          {currentUser === null && rankingState === "ready" ? (
            <Text selectable style={styles.metaText}>
              Your row appears after the first valid leima is refreshed into the leaderboard.
            </Text>
          ) : null}
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bodyText: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.typography.families.regular,
    fontSize: mobileTheme.typography.sizes.body,
    lineHeight: mobileTheme.typography.lineHeights.body,
  },
  currentUserLabel: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.eyebrow,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  currentUserSection: {
    gap: 10,
    marginTop: 12,
  },
  eventChipRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
  },
  eventChip: {
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderRadius: mobileTheme.radius.card,
    gap: 6,
    marginRight: 8,
    minWidth: 148,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...interactiveSurfaceShadowStyle,
  },
  eventChipMeta: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.eyebrow,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  eventChipTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.body,
  },
  eventSelector: {
    paddingRight: 4,
  },
  eventSelectorHeader: {
    gap: 4,
  },
  eventSelectorMeta: {
    color: mobileTheme.colors.textDim,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.caption,
    lineHeight: mobileTheme.typography.lineHeights.caption,
  },
  eventSelectorSection: {
    gap: 10,
  },
  heroBand: {
    marginHorizontal: -mobileTheme.spacing.screenHorizontal,
    marginTop: -mobileTheme.spacing.screenVertical,
    minHeight: 248,
    position: "relative",
  },
  heroContent: {
    flex: 1,
    gap: 16,
    justifyContent: "space-between",
    padding: 22,
  },
  heroCopy: {
    gap: 8,
    maxWidth: 300,
  },
  heroEyebrow: {
    color: mobileTheme.colors.lime,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.eyebrow,
    letterSpacing: 1.2,
    lineHeight: mobileTheme.typography.lineHeights.eyebrow,
    textTransform: "uppercase",
  },
  heroImage: {
    borderRadius: 0,
  },
  heroMeta: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.body,
    lineHeight: mobileTheme.typography.lineHeights.body,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.56)",
  },
  heroStat: {
    flex: 1,
    gap: 4,
  },
  heroStatDivider: {
    alignSelf: "stretch",
    backgroundColor: mobileTheme.colors.borderStrong,
    width: 1,
  },
  heroStats: {
    backgroundColor: "rgba(8, 9, 14, 0.56)",
    borderRadius: mobileTheme.radius.card,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  heroStatLabel: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.eyebrow,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroStatValue: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.body,
    lineHeight: mobileTheme.typography.lineHeights.body,
  },
  heroTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.extrabold,
    fontSize: mobileTheme.typography.sizes.titleLarge,
    letterSpacing: -0.8,
    lineHeight: mobileTheme.typography.lineHeights.titleLarge,
  },
  listGroup: {
    gap: 10,
  },
  metaText: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.regular,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    lineHeight: mobileTheme.typography.lineHeights.bodySmall,
  },
  podiumAvatar: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.36)",
    borderColor: mobileTheme.colors.limeBorder,
    borderRadius: 999,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  podiumAvatarText: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.body,
    lineHeight: mobileTheme.typography.lineHeights.body,
  },
  podiumCard: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderRadius: mobileTheme.radius.scene,
    borderWidth: 1,
    borderColor: mobileTheme.colors.borderDefault,
    flex: 1,
    gap: 8,
    justifyContent: "flex-end",
    maxWidth: 122,
    paddingHorizontal: 12,
    paddingVertical: 14,
    ...interactiveSurfaceShadowStyle,
  },
  podiumCardCurrent: {
    backgroundColor: mobileTheme.colors.limeSurface,
    borderColor: mobileTheme.colors.limeBorder,
  },
  podiumCardFirst: {
    backgroundColor: mobileTheme.colors.surfaceL3,
    borderColor: mobileTheme.colors.limeBorder,
  },
  podiumName: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    lineHeight: mobileTheme.typography.lineHeights.bodySmall,
    textAlign: "center",
  },
  podiumRankBubble: {
    backgroundColor: mobileTheme.colors.limeSurface,
    borderColor: mobileTheme.colors.limeBorder,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  podiumRankText: {
    color: mobileTheme.colors.lime,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.caption,
    lineHeight: mobileTheme.typography.lineHeights.caption,
  },
  podiumRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 10,
  },
  podiumScore: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.extrabold,
    fontSize: mobileTheme.typography.sizes.title,
    fontVariant: ["tabular-nums"],
    lineHeight: mobileTheme.typography.lineHeights.title,
  },
  podiumScoreLabel: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.caption,
    lineHeight: mobileTheme.typography.lineHeights.caption,
  },
  podiumSection: {
    gap: 12,
  },
  screenHeader: {
    gap: 8,
    marginBottom: 4,
  },
  screenTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.extrabold,
    fontSize: mobileTheme.typography.sizes.titleLarge,
    lineHeight: mobileTheme.typography.lineHeights.titleLarge,
    letterSpacing: -0.8,
  },
  sectionKicker: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.eyebrow,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  secondaryButton: {
    alignSelf: "flex-start",
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderColor: mobileTheme.colors.borderStrong,
    borderRadius: mobileTheme.radius.button,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...interactiveSurfaceShadowStyle,
  },
  secondaryButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.bodySmall,
  },
  selectedEventChip: {
    backgroundColor: mobileTheme.colors.limeSurface,
    borderColor: mobileTheme.colors.limeBorder,
    borderWidth: 1,
  },
  standingsStage: {
    backgroundColor: mobileTheme.colors.surfaceL1,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.scene,
    borderWidth: 1,
    gap: 16,
    padding: 18,
    ...interactiveSurfaceShadowStyle,
  },
});
