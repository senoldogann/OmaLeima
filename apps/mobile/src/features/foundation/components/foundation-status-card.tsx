import { StyleSheet, Text, View } from "react-native";

import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { mobileTheme } from "@/features/foundation/theme";
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
    alignItems: "center",
    backgroundColor: mobileTheme.colors.cardBackgroundSoft,
    borderColor: mobileTheme.colors.cardBorder,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  copy: {
    flex: 1,
    gap: 5,
  },
  label: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  value: {
    color: mobileTheme.colors.textSoft,
    fontSize: 13,
    lineHeight: 19,
  },
});
