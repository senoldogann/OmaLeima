import { StyleSheet, Text, View } from "react-native";

import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import type { AppReadinessState } from "@/types/app";

type FoundationStatusItem = {
  label: string;
  value: string;
  state: AppReadinessState;
};

type FoundationStatusCardProps = {
  title: string;
  eyebrow: string;
  items: FoundationStatusItem[];
};

export const FoundationStatusCard = ({
  title,
  eyebrow,
  items,
}: FoundationStatusCardProps) => (
  <InfoCard eyebrow={eyebrow} title={title}>
    {items.map((item) => (
      <View key={item.label} style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value}</Text>
        </View>
        <StatusBadge label={item.state} state={item.state} />
      </View>
    ))}
  </InfoCard>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    alignItems: "center",
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  label: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "600",
  },
  value: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
  },
});
