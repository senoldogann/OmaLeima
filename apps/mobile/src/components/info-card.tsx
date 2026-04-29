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
    gap: 16,
  },
  header: {
    gap: 10,
  },
  eyebrow: {
    alignSelf: "flex-start",
    color: mobileTheme.colors.accentBlue,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.9,
    paddingBottom: 2,
    backgroundColor: "rgba(144, 215, 255, 0.12)",
    borderColor: "rgba(144, 215, 255, 0.24)",
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
    textTransform: "uppercase",
  },
  title: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  body: {
    gap: 14,
  },
});
