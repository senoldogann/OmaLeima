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
      return { bg: mobileTheme.colors.cyanSurface, text: mobileTheme.colors.cyan, dot: mobileTheme.colors.cyan };
    case "pending":
      return { bg: mobileTheme.colors.amberSurface, text: mobileTheme.colors.amber, dot: mobileTheme.colors.amber };
    case "warning":
      return { bg: mobileTheme.colors.pinkSurface, text: mobileTheme.colors.pink, dot: mobileTheme.colors.pink };
    case "error":
      return { bg: mobileTheme.colors.dangerSurface, text: mobileTheme.colors.danger, dot: mobileTheme.colors.danger };
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
    borderRadius: 4,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
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
