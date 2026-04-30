import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

import { GlassPanel, type GlassPanelVariant } from "@/features/foundation/components/glass-panel";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles } from "@/features/preferences/ui-preferences-provider";

type InfoCardProps = PropsWithChildren<{
  title: string;
  eyebrow?: string;
  motionIndex?: number;
  variant?: GlassPanelVariant;
  /** API compat — ignored in STARK system */
  glowColor?: string;
}>;

export const InfoCard = ({
  children,
  title,
  eyebrow,
  motionIndex,
  variant = "card",
}: InfoCardProps) => {
  const styles = useThemeStyles(createStyles);

  return (
    <GlassPanel
      contentStyle={styles.cardContent}
      motionIndex={motionIndex}
      variant={variant}
    >
      <View style={styles.header}>
        {eyebrow ? (
          <Text style={styles.eyebrow}>{eyebrow}</Text>
        ) : null}
        <Text style={[styles.title, variant === "scene" ? styles.titleScene : null]}>{title}</Text>
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
      gap: 6,
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
