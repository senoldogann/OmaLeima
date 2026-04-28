import { useEffect, useRef, type PropsWithChildren } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";

import { mobileTheme, surfaceShadowStyle } from "@/features/foundation/theme";

type GlassPanelProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  motionIndex?: number;
}>;

const isNativeGlassEnabled = isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

export const GlassPanel = ({ children, style, contentStyle, motionIndex }: GlassPanelProps) => {
  const translateY = useRef(new Animated.Value(14)).current;
  const scale = useRef(new Animated.Value(0.985)).current;

  useEffect(() => {
    const delayMs = typeof motionIndex === "number" ? Math.min(motionIndex * 45, 280) : 0;

    const animation = Animated.parallel([
      Animated.spring(translateY, {
        delay: delayMs,
        toValue: 0,
        damping: 18,
        stiffness: 180,
        mass: 0.95,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        delay: delayMs,
        toValue: 1,
        damping: 16,
        stiffness: 190,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [motionIndex, scale, translateY]);

  return (
    <Animated.View
      style={[
        styles.motionLayer,
        {
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <GlassView
        colorScheme="dark"
        glassEffectStyle={isNativeGlassEnabled ? "regular" : "none"}
        style={[styles.panel, style]}
        tintColor={mobileTheme.colors.chromeTint}
      >
        <View style={[styles.content, contentStyle]}>{children}</View>
      </GlassView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  motionLayer: {
    borderRadius: mobileTheme.radius.card,
    ...surfaceShadowStyle,
  },
  panel: {
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    borderColor: mobileTheme.colors.cardBorder,
    backgroundColor: mobileTheme.colors.cardBackground,
    overflow: "hidden",
  },
  content: {
    borderRadius: mobileTheme.radius.card,
    padding: 18,
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
});
