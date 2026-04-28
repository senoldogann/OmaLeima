import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { mobileTheme } from "@/features/foundation/theme";

export const AppScreen = ({ children }: PropsWithChildren) => (
  <SafeAreaView style={styles.safeArea}>
    <View pointerEvents="none" style={styles.backgroundLayer}>
      <View style={[styles.ambientPanel, styles.topPanel]} />
      <View style={[styles.ambientPanel, styles.middlePanel]} />
      <View style={[styles.ambientPanel, styles.bottomPanel]} />
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
  },
  scrollView: {
    flex: 1,
  },
  content: {
    gap: 18,
    paddingHorizontal: mobileTheme.spacing.screenHorizontal,
    paddingTop: mobileTheme.spacing.screenVertical,
    paddingBottom: 144,
  },
  ambientPanel: {
    position: "absolute",
    borderRadius: 32,
  },
  topPanel: {
    backgroundColor: mobileTheme.colors.chromeTint,
    height: 188,
    left: -36,
    right: 88,
    top: 28,
    transform: [{ rotate: "-8deg" }],
  },
  middlePanel: {
    backgroundColor: mobileTheme.colors.chromeTintWarm,
    height: 152,
    right: -24,
    top: 248,
    width: 236,
    transform: [{ rotate: "12deg" }],
  },
  bottomPanel: {
    backgroundColor: mobileTheme.colors.chromeTintRose,
    bottom: 132,
    height: 164,
    left: 16,
    width: 208,
    transform: [{ rotate: "-14deg" }],
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
