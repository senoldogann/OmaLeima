import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { mobileTheme } from "@/features/foundation/theme";

// AppScreen: flat dark base, no glass, no halos, no blur.
// A single subtle dot-grid texture is simulated with evenly-spaced small dots.
export const AppScreen = ({ children }: PropsWithChildren) => (
  <SafeAreaView style={styles.safeArea}>
    {/* Dot grid overlay — purely decorative, non-interactive */}
    <View style={styles.dotGridLayer} pointerEvents="none">
      {/* Horizontal noise lines — very subtle */}
      <View style={[styles.noiseLine, { top: "18%" }]} />
      <View style={[styles.noiseLine, { top: "42%" }]} />
      <View style={[styles.noiseLine, { top: "67%" }]} />
      <View style={[styles.noiseLine, { top: "88%" }]} />
      {/* Vertical accent line — left edge */}
      <View style={styles.verticalAccentLine} />
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
  dotGridLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
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
  noiseLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.025)",
  },
  verticalAccentLine: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(200, 255, 71, 0.06)",
  },
});
