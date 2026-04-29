import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { mobileTheme } from "@/features/foundation/theme";

export const AppScreen = ({ children }: PropsWithChildren) => (
  <SafeAreaView style={styles.safeArea}>
    <View style={styles.backgroundLayer}>
      <View style={styles.topHalo} />
      <View style={styles.rightHalo} />
      <View style={[styles.ambientPanel, styles.topPanel]} />
      <View style={[styles.ambientPanel, styles.middlePanel]} />
      <View style={[styles.ambientPanel, styles.bottomPanel]} />
      <View style={[styles.ambientPanel, styles.footerPanel]} />
      <View style={styles.glowLine} />
    </View>
    <ScrollView contentContainerStyle={styles.content} style={styles.scrollView}>
      {children}
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: mobileTheme.colors.screenBase,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    pointerEvents: "none",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    gap: mobileTheme.spacing.sectionGap,
    paddingHorizontal: mobileTheme.spacing.screenHorizontal,
    paddingTop: mobileTheme.spacing.screenVertical,
    paddingBottom: 144,
  },
  topHalo: {
    backgroundColor: mobileTheme.colors.chromeTintIndigo,
    borderRadius: 200,
    height: 280,
    left: -96,
    opacity: 0.6,
    position: "absolute",
    top: -96,
    width: 280,
  },
  rightHalo: {
    backgroundColor: mobileTheme.colors.chromeTintWarm,
    borderRadius: 180,
    height: 220,
    opacity: 0.38,
    position: "absolute",
    right: -82,
    top: 120,
    width: 220,
  },
  ambientPanel: {
    position: "absolute",
    borderRadius: 40,
  },
  topPanel: {
    backgroundColor: mobileTheme.colors.chromeTint,
    height: 184,
    left: -44,
    right: 74,
    top: 46,
    transform: [{ rotate: "-9deg" }],
  },
  middlePanel: {
    backgroundColor: mobileTheme.colors.chromeTintIndigo,
    height: 156,
    right: -16,
    top: 242,
    width: 244,
    transform: [{ rotate: "11deg" }],
  },
  bottomPanel: {
    backgroundColor: mobileTheme.colors.chromeTintRose,
    bottom: 152,
    height: 168,
    left: 10,
    width: 214,
    transform: [{ rotate: "-14deg" }],
  },
  footerPanel: {
    backgroundColor: mobileTheme.colors.chromeTintWarm,
    bottom: -26,
    height: 176,
    right: 24,
    width: 232,
    transform: [{ rotate: "16deg" }],
  },
  glowLine: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 999,
    height: 1,
    left: 28,
    position: "absolute",
    right: 28,
    top: 108,
  },
});
