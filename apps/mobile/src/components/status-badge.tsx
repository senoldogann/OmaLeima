import { StyleSheet, Text, View } from "react-native";

import type { MobileTheme } from "@/features/foundation/theme";
import { useAppTheme, useThemeStyles } from "@/features/preferences/ui-preferences-provider";
import type { AppReadinessState } from "@/types/app";

type StatusBadgeProps = {
  label: string;
  state: AppReadinessState;
};

type BadgeStyle = {
  bg: string;
  text: string;
  dot: string;
};

const getBadgeStyle = (theme: MobileTheme, state: AppReadinessState): BadgeStyle => {
  switch (state) {
    case "ready":
      return { bg: theme.colors.successSurface, text: theme.colors.success, dot: theme.colors.success };
    case "loading":
      return { bg: theme.colors.surfaceL3, text: theme.colors.textSecondary, dot: theme.colors.textSecondary };
    case "pending":
      return { bg: theme.colors.surfaceL3, text: theme.colors.textMuted, dot: theme.colors.textMuted };
    case "warning":
      return { bg: theme.colors.surfaceL3, text: theme.colors.textSecondary, dot: theme.colors.textSecondary };
    case "error":
      return { bg: theme.colors.surfaceL3, text: theme.colors.textPrimary, dot: theme.colors.textPrimary };
  }
};

export const StatusBadge = ({ label, state }: StatusBadgeProps) => {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const style = getBadgeStyle(theme, state);

  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <View style={[styles.dot, { backgroundColor: style.dot }]} />
      <Text style={[styles.label, { color: style.text }]}>{label}</Text>
    </View>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    badge: {
      alignItems: "center",
      alignSelf: "flex-start",
      borderRadius: 999,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    dot: {
      borderRadius: 999,
      height: 5,
      width: 5,
    },
    label: {
      fontFamily: theme.typography.families.semibold,
      fontSize: 11,
      letterSpacing: 0.3,
      textTransform: "uppercase",
    },
  });
