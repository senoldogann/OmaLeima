import { StyleSheet, Text, View } from "react-native";

import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles } from "@/features/preferences/ui-preferences-provider";
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
}: FoundationStatusCardProps) => {
  const styles = useThemeStyles(createStyles);

  return (
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
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    row: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
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
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    value: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
  });
