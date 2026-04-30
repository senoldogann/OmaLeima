import { StyleSheet, Text, View } from "react-native";

import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";

import type { LeaderboardEntry } from "@/features/leaderboard/types";

type LeaderboardEntryCardProps = {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
};

const getDisplayName = (entry: LeaderboardEntry, language: "fi" | "en"): string =>
  entry.displayName ?? (language === "fi" ? `Opiskelija ${entry.rank}` : `Student ${entry.rank}`);

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

export const LeaderboardEntryCard = ({ entry, isCurrentUser }: LeaderboardEntryCardProps) => {
  const { language } = useUiPreferences();
  const styles = useThemeStyles(createStyles);

  return (
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
            {getDisplayName(entry, language)}
          </Text>
        </View>
      </View>

      <View style={styles.scoreGroup}>
        <Text selectable style={[styles.scoreText, isCurrentUser ? styles.currentUserScoreText : null]}>
          {entry.stampCount}
        </Text>
        <Text selectable style={[styles.scoreLabel, isCurrentUser ? styles.currentUserScoreLabel : null]}>
          {language === "fi" ? "leimaa" : "leima"}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    avatarBubble: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL4,
      borderColor: theme.colors.borderStrong,
      borderRadius: 999,
      borderWidth: 1,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    avatarBubbleCurrent: {
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
    },
    avatarText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    card: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    copyGroup: {
      flex: 1,
      gap: 4,
    },
    currentUserCard: {
      backgroundColor: theme.colors.lime,
      borderColor: theme.colors.limeBorder,
    },
    currentUserNameText: {
      color: theme.colors.screenBase,
    },
    currentUserRankBubble: {
      backgroundColor: "rgba(8, 9, 14, 0.16)",
    },
    currentUserScoreLabel: {
      color: "rgba(8, 9, 14, 0.74)",
    },
    currentUserScoreText: {
      color: theme.colors.screenBase,
    },
    leftGroup: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: 12,
    },
    nameText: {
      color: theme.colors.textPrimary,
      flexShrink: 1,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    rankBubble: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL4,
      borderRadius: 999,
      justifyContent: "center",
      minWidth: 44,
      paddingHorizontal: 10,
      paddingVertical: 9,
    },
    rankText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      fontVariant: ["tabular-nums"],
    },
    scoreGroup: {
      alignItems: "flex-end",
      minWidth: 58,
    },
    scoreLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    scoreText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.subtitle,
      fontVariant: ["tabular-nums"],
    },
  });
