import { StyleSheet, Text, View } from "react-native";

import type { AppReadinessState } from "@/types/app";

type StatusBadgeProps = {
  label: string;
  state: AppReadinessState;
};

const getBadgeColors = (state: AppReadinessState): { backgroundColor: string; textColor: string } => {
  switch (state) {
    case "ready":
      return { backgroundColor: "#052E16", textColor: "#86EFAC" };
    case "loading":
      return { backgroundColor: "#172554", textColor: "#93C5FD" };
    case "pending":
      return { backgroundColor: "#3F2C08", textColor: "#FDE68A" };
    case "warning":
      return { backgroundColor: "#431407", textColor: "#FDBA74" };
    case "error":
      return { backgroundColor: "#450A0A", textColor: "#FCA5A5" };
  }
};

export const StatusBadge = ({ label, state }: StatusBadgeProps) => {
  const colors = getBadgeColors(state);

  return (
    <View style={[styles.badge, { backgroundColor: colors.backgroundColor }]}>
      <Text style={[styles.label, { color: colors.textColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
});
