import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
import { useSession } from "@/providers/session-provider";
import { useCurrentTime } from "@/features/qr/student-qr";

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
  const { session } = useSession();
  const now = useCurrentTime(true);
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

  const top10 = leaderboardQuery.data?.top10 ?? [];
  const currentUser = leaderboardQuery.data?.currentUser ?? null;
  const leaderboardRefreshedAt = leaderboardQuery.data?.refreshedAt ?? null;
  const leaderboardVersion = leaderboardQuery.data?.version ?? null;
  const freshness = getFreshnessBadge(leaderboardQuery.data?.refreshedAt ?? null);

  return (
    <AppScreen>
      <InfoCard eyebrow="Student" title="Leaderboard">
        <Text selectable style={styles.bodyText}>
          Compare your progress against the rest of the event. This screen shows the selected event’s Top 10 plus your own position even when you are lower in the ranking.
        </Text>
      </InfoCard>

      {overviewQuery.isLoading ? (
        <InfoCard eyebrow="Loading" title="Opening leaderboard">
          <Text selectable style={styles.bodyText}>
            Loading registered events and finding the most relevant leaderboard scope for this student.
          </Text>
        </InfoCard>
      ) : null}

      {overviewQuery.error ? (
        <InfoCard eyebrow="Error" title="Could not load leaderboard events">
          <Text selectable style={styles.bodyText}>{overviewQuery.error.message}</Text>
          <Pressable onPress={() => void overviewQuery.refetch()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!overviewQuery.isLoading && !overviewQuery.error && events.length === 0 ? (
        <InfoCard eyebrow="Standby" title="No leaderboard event ready">
          <Text selectable style={styles.bodyText}>
            {registeredEventCount === 0
              ? "Join an event first. Once you are registered for a public event, its leaderboard will appear here."
              : "You still have registrations, but none of those events currently expose a public leaderboard view."}
          </Text>
        </InfoCard>
      ) : null}

      {events.length > 0 ? (
        <InfoCard eyebrow="Scope" title="Selected event">
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

          {selectedEvent ? (
            <View style={styles.selectedEventSummary}>
              <View style={styles.badges}>
                <StatusBadge label={selectedEvent.timelineState.toLowerCase()} state={selectedEvent.timelineState === "ACTIVE" ? "ready" : selectedEvent.timelineState === "UPCOMING" ? "pending" : "warning"} />
                <StatusBadge label={freshness.label} state={freshness.state} />
              </View>
              <Text selectable style={styles.bodyText}>
                {selectedEvent.city} · Starts {formatDateTime(selectedEvent.startAt)}
              </Text>
              <Text selectable style={styles.metaText}>
                {leaderboardRefreshedAt === null
                  ? "Leaderboard has not been refreshed yet for this event."
                  : `Last refreshed ${formatDateTime(leaderboardRefreshedAt)}${leaderboardVersion === null ? "" : ` · v${leaderboardVersion}`}`}
              </Text>
            </View>
          ) : null}
        </InfoCard>
      ) : null}

      {selectedEvent !== null && leaderboardQuery.isLoading ? (
        <InfoCard eyebrow="Loading" title="Updating event ranking">
          <Text selectable style={styles.bodyText}>
            Loading Top 10 and current-user rank for {selectedEvent.name}.
          </Text>
        </InfoCard>
      ) : null}

      {selectedEvent !== null && leaderboardQuery.error ? (
        <InfoCard eyebrow="Error" title="Could not load event ranking">
          <Text selectable style={styles.bodyText}>{leaderboardQuery.error.message}</Text>
          <Pressable onPress={() => void leaderboardQuery.refetch()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {selectedEvent !== null && !leaderboardQuery.isLoading && !leaderboardQuery.error && top10.length === 0 ? (
        <InfoCard eyebrow="Standby" title="No leaderboard entries yet">
          <Text selectable style={styles.bodyText}>
            The event exists, but no valid stamp scores have been aggregated yet. Once the first scans are refreshed into the leaderboard, rankings will appear here.
          </Text>
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
        </InfoCard>
      ) : null}

      {currentUser ? (
        <InfoCard eyebrow="You" title="Your current position">
          <LeaderboardEntryCard entry={currentUser} isCurrentUser />
        </InfoCard>
      ) : selectedEvent !== null && top10.length > 0 && !leaderboardQuery.isLoading && !leaderboardQuery.error ? (
        <InfoCard eyebrow="You" title="Your current position">
          <Text selectable style={styles.bodyText}>
            You are registered for this event, but you do not have a ranked score yet. Your row will appear after the first valid leima is refreshed into the leaderboard.
          </Text>
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
  eventChip: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
    minWidth: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...interactiveSurfaceShadowStyle,
  },
  eventChipMeta: {
    color: mobileTheme.colors.accentBlue,
    fontSize: 12,
    fontWeight: "600",
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
  secondaryButton: {
    alignSelf: "flex-start",
    backgroundColor: mobileTheme.colors.actionNeutral,
    borderColor: mobileTheme.colors.actionNeutralBorder,
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
    borderColor: "rgba(94, 181, 255, 0.4)",
    backgroundColor: "rgba(94, 181, 255, 0.1)",
  },
  selectedEventSummary: {
    gap: 8,
  },
});
