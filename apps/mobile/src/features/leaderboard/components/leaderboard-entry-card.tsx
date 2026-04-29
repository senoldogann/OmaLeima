import { StyleSheet, Text, View } from "react-native";

import { mobileTheme } from "@/features/foundation/theme";

import type { LeaderboardEntry } from "@/features/leaderboard/types";

type LeaderboardEntryCardProps = {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
};

const getDisplayName = (entry: LeaderboardEntry): string => entry.displayName ?? `Student ${entry.rank}`;
const getInitials = (value: string | null, rank: number): string => {
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

export const LeaderboardEntryCard = ({ entry, isCurrentUser }: LeaderboardEntryCardProps) => (
  <View style={[styles.card, isCurrentUser ? styles.currentUserCard : null]}>
    <View style={styles.leftGroup}>
      <View style={[styles.rankBubble, isCurrentUser ? styles.currentUserRankBubble : null]}>
        <Text selectable style={styles.rankText}>
          #{entry.rank}
        </Text>
      </View>

      <View style={[styles.avatarBubble, isCurrentUser ? styles.avatarBubbleCurrent : null]}>
        <Text selectable style={styles.avatarText}>
          {getInitials(entry.displayName, entry.rank)}
        </Text>
      </View>

      <View style={styles.copyGroup}>
        <Text selectable style={[styles.nameText, isCurrentUser ? styles.currentUserNameText : null]}>
          {getDisplayName(entry)}
        </Text>
      </View>
    </View>

    <View style={styles.scoreGroup}>
      <Text selectable style={[styles.scoreText, isCurrentUser ? styles.currentUserScoreText : null]}>
        {entry.stampCount}
      </Text>
      <Text selectable style={[styles.scoreLabel, isCurrentUser ? styles.currentUserScoreLabel : null]}>
        leima
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  avatarBubble: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceL4,
    borderColor: mobileTheme.colors.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarBubbleCurrent: {
    backgroundColor: mobileTheme.colors.limeSurface,
    borderColor: mobileTheme.colors.limeBorder,
  },
  avatarText: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    lineHeight: mobileTheme.typography.lineHeights.bodySmall,
  },
  copyGroup: {
    flex: 1,
    gap: 4,
  },
  currentUserCard: {
    backgroundColor: mobileTheme.colors.lime,
    borderColor: mobileTheme.colors.limeBorder,
  },
  currentUserNameText: {
    color: mobileTheme.colors.screenBase,
  },
  currentUserRankBubble: {
    backgroundColor: "rgba(8, 9, 14, 0.16)",
  },
  currentUserScoreLabel: {
    color: "rgba(8, 9, 14, 0.74)",
  },
  currentUserScoreText: {
    color: mobileTheme.colors.screenBase,
  },
  leftGroup: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  nameText: {
    color: mobileTheme.colors.textPrimary,
    flexShrink: 1,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.body,
    lineHeight: mobileTheme.typography.lineHeights.body,
  },
  rankBubble: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceL4,
    borderRadius: 999,
    justifyContent: "center",
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  rankText: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    fontVariant: ["tabular-nums"],
  },
  scoreGroup: {
    alignItems: "flex-end",
    minWidth: 58,
  },
  scoreLabel: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.caption,
    lineHeight: mobileTheme.typography.lineHeights.caption,
  },
  scoreText: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.subtitle,
    fontVariant: ["tabular-nums"],
  },
});
