import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

import { GlassPanel, type GlassPanelVariant } from "@/features/foundation/components/glass-panel";
import { mobileTheme } from "@/features/foundation/theme";

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
}: InfoCardProps) => (
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

const styles = StyleSheet.create({
  cardContent: {
    gap: 16,
  },
  header: {
    gap: 6,
  },
  eyebrow: {
    color: mobileTheme.colors.lime,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  titleScene: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  body: {
    gap: 14,
  },
});
