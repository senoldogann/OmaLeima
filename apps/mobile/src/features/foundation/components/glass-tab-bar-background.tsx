import { StyleSheet, View } from "react-native";

import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";

import { mobileTheme, surfaceShadowStyle } from "@/features/foundation/theme";

const isNativeGlassEnabled = isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

export const GlassTabBarBackground = () => (
  <View style={styles.shadowLayer}>
    <GlassView
      colorScheme="dark"
      glassEffectStyle={
        isNativeGlassEnabled
          ? {
              style: "regular",
              animate: true,
              animationDuration: 0.35,
            }
          : "none"
      }
      isInteractive
      style={styles.surface}
      tintColor={mobileTheme.colors.chromeTint}
    >
      <View style={styles.innerGlow} />
    </GlassView>
  </View>
);

const styles = StyleSheet.create({
  shadowLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: mobileTheme.radius.tabBar,
    ...surfaceShadowStyle,
  },
  surface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: mobileTheme.colors.cardBackgroundStrong,
    borderColor: mobileTheme.colors.cardBorder,
    borderRadius: mobileTheme.radius.tabBar,
    borderWidth: 1,
    overflow: "hidden",
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
});
