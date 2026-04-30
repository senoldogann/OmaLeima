import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import type { MobileTheme } from "@/features/foundation/theme";
import { useAppTheme, useThemeStyles } from "@/features/preferences/ui-preferences-provider";

type AuthLoadingPanelProps = {
  message: string;
  title: string;
};

export const AuthLoadingPanel = ({ message, title }: AuthLoadingPanelProps) => {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  return (
    <View style={styles.panel}>
      <ActivityIndicator color={theme.colors.lime} size="small" />
      <View style={styles.copyStack}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    copyStack: {
      flex: 1,
      gap: 2,
    },
    message: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    panel: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
  });
