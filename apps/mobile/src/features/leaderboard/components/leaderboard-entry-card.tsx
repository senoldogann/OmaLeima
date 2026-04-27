import { StyleSheet, Text, View } from "react-native";

import { StatusBadge } from "@/components/status-badge";

import type { LeaderboardEntry } from "@/features/leaderboard/types";

type LeaderboardEntryCardProps = {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-FI", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const formatDateTime = (value: string | null): string =>
  value === null ? "No stamp yet" : dateTimeFormatter.format(new Date(value));

const getDisplayName = (entry: LeaderboardEntry): string => entry.displayName ?? `Student ${entry.rank}`;

export const LeaderboardEntryCard = ({ entry, isCurrentUser }: LeaderboardEntryCardProps) => (
  <View style={[styles.card, isCurrentUser ? styles.currentUserCard : null]}>
    <View style={styles.leftGroup}>
      <View style={[styles.rankBubble, isCurrentUser ? styles.currentUserRankBubble : null]}>
        <Text selectable style={styles.rankText}>
          #{entry.rank}
        </Text>
      </View>

      <View style={styles.copyGroup}>
        <View style={styles.nameRow}>
          <Text selectable style={styles.nameText}>
            {getDisplayName(entry)}
          </Text>
          {isCurrentUser ? <StatusBadge label="you" state="ready" /> : null}
        </View>
        <Text selectable style={styles.metaText}>
          Last valid leima {formatDateTime(entry.lastStampAt)}
        </Text>
      </View>
    </View>

    <View style={styles.scoreGroup}>
      <Text selectable style={styles.scoreText}>
        {entry.stampCount}
      </Text>
      <Text selectable style={styles.scoreLabel}>
        leima
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderColor: "#1E293B",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 12,
  },
  copyGroup: {
    flex: 1,
    gap: 4,
  },
  currentUserCard: {
    borderColor: "#1D4ED8",
    backgroundColor: "#0B1220",
  },
  currentUserRankBubble: {
    backgroundColor: "#1D4ED8",
  },
  leftGroup: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  metaText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 17,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  nameText: {
    color: "#F8FAFC",
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  rankBubble: {
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 999,
    justifyContent: "center",
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  rankText: {
    color: "#F8FAFC",
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  scoreGroup: {
    alignItems: "flex-end",
    minWidth: 52,
  },
  scoreLabel: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 16,
  },
  scoreText: {
    color: "#F8FAFC",
    fontSize: 18,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
});
