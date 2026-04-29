import { StyleSheet, Text, View } from "react-native";

import { interactiveSurfaceShadowStyle, mobileTheme } from "@/features/foundation/theme";
import type { AppReadinessState } from "@/types/app";

type StatusBadgeProps = {
  label: string;
  state: AppReadinessState;
};

const getBadgeColors = (state: AppReadinessState): { backgroundColor: string; textColor: string } => {
  switch (state) {
    case "ready":
      return { backgroundColor: "rgba(126, 241, 194, 0.16)", textColor: mobileTheme.colors.accentMint };
    case "loading":
      return { backgroundColor: "rgba(138, 215, 255, 0.18)", textColor: mobileTheme.colors.accentBlue };
    case "pending":
      return { backgroundColor: "rgba(246, 210, 139, 0.18)", textColor: mobileTheme.colors.accentGold };
    case "warning":
      return { backgroundColor: "rgba(255, 177, 168, 0.16)", textColor: mobileTheme.colors.accentRose };
    case "error":
      return { backgroundColor: "rgba(255, 141, 141, 0.18)", textColor: "#FFC5C1" };
  }
};

export const StatusBadge = ({ label, state }: StatusBadgeProps) => {
  const colors = getBadgeColors(state);

  return (
    <View style={[styles.badge, { backgroundColor: colors.backgroundColor }]}>
      <View style={[styles.dot, { backgroundColor: colors.textColor }]} />
      <Text style={[styles.label, { color: colors.textColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: mobileTheme.colors.cardBorderStrong,
    borderWidth: 1,
    borderRadius: 999,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    ...interactiveSurfaceShadowStyle,
  },
  dot: {
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
