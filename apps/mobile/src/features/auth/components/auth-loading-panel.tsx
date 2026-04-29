import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { mobileTheme } from "@/features/foundation/theme";

type AuthLoadingPanelProps = {
  message: string;
  title: string;
};

export const AuthLoadingPanel = ({ message, title }: AuthLoadingPanelProps) => (
  <View style={styles.panel}>
    <ActivityIndicator color={mobileTheme.colors.lime} size="small" />
    <View style={styles.copyStack}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  copyStack: {
    flex: 1,
    gap: 2,
  },
  message: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    lineHeight: mobileTheme.typography.lineHeights.bodySmall,
  },
  panel: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.inner,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  title: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.body,
    lineHeight: mobileTheme.typography.lineHeights.body,
  },
});
