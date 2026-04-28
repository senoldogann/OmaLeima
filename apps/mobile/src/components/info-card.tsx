import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

import { GlassPanel } from "@/features/foundation/components/glass-panel";
import { mobileTheme } from "@/features/foundation/theme";

type InfoCardProps = PropsWithChildren<{
  title: string;
  eyebrow?: string;
  motionIndex?: number;
}>;

export const InfoCard = ({ children, title, eyebrow, motionIndex }: InfoCardProps) => (
  <GlassPanel contentStyle={styles.cardContent} motionIndex={motionIndex}>
    <View style={styles.header}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
    </View>
    <View style={styles.body}>{children}</View>
  </GlassPanel>
);

const styles = StyleSheet.create({
  cardContent: {
    gap: 14,
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    alignSelf: "flex-start",
    color: mobileTheme.colors.accentBlue,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    paddingBottom: 2,
    textTransform: "uppercase",
  },
  title: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 21,
    fontWeight: "700",
    lineHeight: 26,
  },
  body: {
    gap: 12,
  },
});
