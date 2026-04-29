import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useIsFocused } from "@react-navigation/native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
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
  const leaderboardRefreshedAt = leaderboardQuery.data?.refreshedAt ?? null;
  const leaderboardVersion = leaderboardQuery.data?.version ?? null;
  const freshness = getFreshnessBadge(leaderboardRefreshedAt);

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
        <InfoCard eyebrow="Event" title={selectedEvent?.name ?? "Select event"}>
          {selectedEvent ? (
            <View style={styles.selectedEventSummary}>
              <View style={styles.badges}>
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
                <StatusBadge label={freshness.label} state={freshness.state} />
              </View>
              <Text selectable style={styles.bodyText}>
                {selectedEvent.city} · Starts {formatDateTime(selectedEvent.startAt)}
              </Text>
              <Text selectable style={styles.metaText}>
                {leaderboardRefreshedAt === null
                  ? "Leaderboard has not refreshed yet."
                  : `Last refreshed ${formatDateTime(leaderboardRefreshedAt)}${leaderboardVersion === null ? "" : ` · v${leaderboardVersion}`}`}
              </Text>
            </View>
          ) : null}

          <View style={styles.eventSelector}>
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
                <Text style={styles.eventChipMeta}>{event.timelineState.toLowerCase()}</Text>
              </Pressable>
            ))}
          </View>
        </InfoCard>
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
        <InfoCard eyebrow="Top 10" title="Event ranking">
          <View style={styles.listGroup}>
            {top10.map((entry) => (
              <LeaderboardEntryCard
                key={`${entry.studentId}-${entry.rank}`}
                entry={entry}
                isCurrentUser={entry.studentId === studentId}
              />
            ))}
          </View>

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
        </InfoCard>
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
    fontSize: 14,
    lineHeight: 20,
  },
  currentUserLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  currentUserSection: {
    gap: 10,
    marginTop: 12,
  },
  eventChip: {
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderRadius: mobileTheme.radius.card,
    gap: 4,
    minWidth: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...interactiveSurfaceShadowStyle,
  },
  eventChipMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  eventChipTitle: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  eventSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  listGroup: {
    gap: 10,
  },
  metaText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  screenHeader: {
    gap: 6,
    marginBottom: 4,
  },
  screenTitle: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
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
    fontSize: 14,
    fontWeight: "700",
  },
  selectedEventChip: {
    backgroundColor: mobileTheme.colors.limeSurface,
  },
  selectedEventSummary: {
    gap: 8,
  },
});
