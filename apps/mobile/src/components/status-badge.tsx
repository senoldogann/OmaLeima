import { StyleSheet, Text, View } from "react-native";

import { mobileTheme } from "@/features/foundation/theme";
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

const getBadgeStyle = (state: AppReadinessState): BadgeStyle => {
  switch (state) {
    case "ready":
      return { bg: mobileTheme.colors.successSurface, text: mobileTheme.colors.success, dot: mobileTheme.colors.success };
    case "loading":
      return { bg: mobileTheme.colors.surfaceL3, text: mobileTheme.colors.textSecondary, dot: mobileTheme.colors.textSecondary };
    case "pending":
      return { bg: mobileTheme.colors.surfaceL3, text: mobileTheme.colors.textMuted, dot: mobileTheme.colors.textMuted };
    case "warning":
      return { bg: mobileTheme.colors.surfaceL3, text: mobileTheme.colors.textSecondary, dot: mobileTheme.colors.textSecondary };
    case "error":
      return { bg: mobileTheme.colors.surfaceL3, text: mobileTheme.colors.textPrimary, dot: mobileTheme.colors.textPrimary };
  }
};

export const StatusBadge = ({ label, state }: StatusBadgeProps) => {
  const style = getBadgeStyle(state);

  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <View style={[styles.dot, { backgroundColor: style.dot }]} />
      <Text style={[styles.label, { color: style.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
});
