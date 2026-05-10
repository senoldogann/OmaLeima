import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import type { GlassPanelVariant } from "@/features/foundation/components/glass-panel";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles } from "@/features/preferences/ui-preferences-provider";

type EmptyStateCardProps = {
  body: string;
  iconName: AppIconName;
  action?: ReactNode;
  eyebrow?: string;
  title?: string;
  variant?: GlassPanelVariant;
};

export const EmptyStateCard = ({
  action,
  body,
  eyebrow,
  iconName,
  title,
}: EmptyStateCardProps) => {
  const styles = useThemeStyles(createStyles);

  return (
    <View style={styles.container}>
      <View style={styles.iconBadge}>
        <AppIcon color={styles.iconColor.color} name={iconName} size={26} />
      </View>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={styles.body}>{body}</Text>
      {action !== undefined ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    action: {
      alignSelf: "stretch",
      width: "100%",
    },
    body: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      textAlign: "center",
    },
    container: {
      alignItems: "center",
      gap: 12,
      justifyContent: "center",
      minHeight: 188,
      paddingHorizontal: 8,
      paddingVertical: 16,
    },
    eyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.2,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textAlign: "center",
      textTransform: "uppercase",
    },
    iconBadge: {
      alignItems: "center",
      borderRadius: 999,
      height: 64,
      justifyContent: "center",
      width: 64,
    },
    iconColor: {
      color: theme.colors.lime,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
      textAlign: "center",
    },
  });
