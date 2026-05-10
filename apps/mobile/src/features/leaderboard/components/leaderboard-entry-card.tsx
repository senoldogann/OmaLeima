import { StyleSheet, Text, View } from "react-native";

import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";

import type { LeaderboardEntry } from "@/features/leaderboard/types";

type LeaderboardEntryCardProps = {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
};

// İsimden kısaltma üretir (ör. "Mehmet Ali" → "MA")
const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return (words[0].charAt(0)).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

// İlk 3 sıra için altın/gümüş/bronz renkleri
const getMedalColors = (rank: number): { bg: string; border: string; text: string } | null => {
  if (rank === 1) return { bg: "rgba(255, 196, 0, 0.14)", border: "rgba(255, 196, 0, 0.30)", text: "#FFC400" };
  if (rank === 2) return { bg: "rgba(190, 200, 190, 0.12)", border: "rgba(190, 200, 190, 0.22)", text: "#BEC8BE" };
  if (rank === 3) return { bg: "rgba(205, 127, 50, 0.12)", border: "rgba(205, 127, 50, 0.24)", text: "#CD7F32" };
  return null;
};

const getDisplayName = (entry: LeaderboardEntry, language: "fi" | "en"): string =>
  entry.displayName ?? (language === "fi" ? `Opiskelija ${entry.rank}` : `Student ${entry.rank}`);

export const LeaderboardEntryCard = ({ entry, isCurrentUser }: LeaderboardEntryCardProps) => {
  const { language, theme } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const medal = getMedalColors(entry.rank);
  const displayName = getDisplayName(entry, language);
  const initials = getInitials(displayName);

  const rankBubbleStyle = medal
    ? { backgroundColor: medal.bg, borderColor: medal.border }
    : isCurrentUser
      ? { backgroundColor: theme.colors.limeSurface, borderColor: theme.colors.limeBorder }
      : { backgroundColor: theme.colors.surfaceL4, borderColor: theme.colors.borderStrong };

  const rankTextColor = medal
    ? medal.text
    : isCurrentUser
      ? theme.mode === "dark" ? theme.colors.lime : theme.colors.actionPrimaryText
      : theme.colors.textPrimary;

  const avatarBg = isCurrentUser
    ? theme.colors.limeSurface
    : medal
      ? medal.bg
      : theme.colors.surfaceL3;
  const avatarBorder = isCurrentUser
    ? theme.colors.limeBorder
    : medal
      ? medal.border
      : theme.colors.borderStrong;
  const avatarTextColor = isCurrentUser
    ? theme.mode === "dark" ? theme.colors.lime : theme.colors.actionPrimaryText
    : medal
      ? medal.text
      : theme.colors.textSecondary;

  return (
    <View style={[styles.card, isCurrentUser ? styles.currentUserCard : null]}>
      <View style={styles.leftGroup}>
        {/* Sıra numarası yuvarlak kabarcık */}
        <View style={[styles.rankBubble, rankBubbleStyle]}>
          <Text selectable style={[styles.rankText, { color: rankTextColor }]}>
            {entry.rank}
          </Text>
        </View>

        {/* Avatar: baş harfler */}
        <View style={[styles.avatarBubble, { backgroundColor: avatarBg, borderColor: avatarBorder }]}>
          <Text style={[styles.avatarInitials, { color: avatarTextColor }]}>{initials}</Text>
        </View>

        <View style={styles.copyGroup}>
          <Text selectable style={[styles.nameText, isCurrentUser ? styles.currentUserNameText : null]}>
            {displayName}
          </Text>
          <Text selectable style={[styles.stampLabel, isCurrentUser ? styles.currentUserStampLabel : null]}>
            {language === "fi" ? `Leimoja: ${entry.stampCount}` : `Stamps: ${entry.stampCount}`}
          </Text>
        </View>
      </View>

      {/* #1 için kron ikonu */}
      {entry.rank === 1 ? (
        <Text style={styles.crownEmoji}>👑</Text>
      ) : null}
    </View>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    avatarBubble: {
      alignItems: "center",
      borderRadius: 999,
      borderWidth: 1,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    avatarInitials: {
      fontFamily: theme.typography.families.bold,
      fontSize: 14,
      letterSpacing: 0.3,
      lineHeight: 18,
    },
    card: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    copyGroup: {
      flex: 1,
      gap: 2,
    },
    crownEmoji: {
      fontSize: 18,
      lineHeight: 22,
    },
    currentUserCard: {
      backgroundColor: theme.mode === "dark" ? "rgba(6, 8, 6, 0.54)" : theme.colors.surfaceL1,
      borderColor: theme.colors.limeBorder,
    },
    currentUserNameText: {
      color: theme.colors.textPrimary,
    },
    currentUserStampLabel: {
      color: theme.mode === "dark" ? theme.colors.lime : theme.colors.actionPrimaryText,
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
      borderRadius: 999,
      borderWidth: 1,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    rankText: {
      fontFamily: theme.typography.families.extrabold,
      fontSize: 13,
      fontVariant: ["tabular-nums"],
      lineHeight: 17,
    },
    stampLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
  });
