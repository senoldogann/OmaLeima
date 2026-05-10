import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { GlassPanel, type GlassPanelVariant } from "@/features/foundation/components/glass-panel";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles } from "@/features/preferences/ui-preferences-provider";

type InfoCardProps = PropsWithChildren<{
  title: string;
  action?: ReactNode;
  eyebrow?: string;
  motionIndex?: number;
  variant?: GlassPanelVariant;
  showBorder?: boolean;
  /** API compat — ignored in STARK system */
  glowColor?: string;
}>;

export const InfoCard = ({
  action,
  children,
  title,
  eyebrow,
  motionIndex,
  variant = "card",
  showBorder,
}: InfoCardProps) => {
  const styles = useThemeStyles(createStyles);

  return (
    <GlassPanel
      contentStyle={styles.cardContent}
      motionIndex={motionIndex}
      variant={variant}
      showBorder={showBorder}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          {eyebrow ? (
            <Text style={styles.eyebrow}>{eyebrow}</Text>
          ) : null}
          <Text style={[styles.title, variant === "scene" ? styles.titleScene : null]}>{title}</Text>
        </View>
        {action !== undefined ? <View style={styles.headerAction}>{action}</View> : null}
      </View>
      <View style={styles.body}>{children}</View>
    </GlassPanel>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    cardContent: {
      gap: 16,
    },
    header: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    headerAction: {
      flexShrink: 0,
      paddingTop: 2,
    },
    headerCopy: {
      flex: 1,
      gap: 6,
      minWidth: 0,
    },
    eyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.2,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
      letterSpacing: -0.3,
    },
    titleScene: {
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
      letterSpacing: -0.5,
    },
    body: {
      gap: 14,
    },
  });
