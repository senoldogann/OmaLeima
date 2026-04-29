import { useEffect, useRef, type PropsWithChildren } from "react";
import { Animated, View, type StyleProp, type ViewStyle } from "react-native";

import { mobileTheme, surfaceShadowStyle } from "@/features/foundation/theme";

/**
 * StarkCard — replaces GlassPanel.
 * Flat, solid, opaque surfaces. No glass, no blur, no backdrop-filter.
 *
 * Variants:
 *  "scene"  — hero containers (lime accent border, L1 surface, tighter edge)
 *  "card"   — standard content card (L1 surface, default border)
 *  "subtle" — secondary / inner elements (L0 surface, muted border)
 */
export type GlassPanelVariant = "scene" | "card" | "subtle";

type GlassPanelProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  motionIndex?: number;
  variant?: GlassPanelVariant;
  /** Ignored — kept for API compat with old GlassPanel consumers */
  glowColor?: string;
}>;

type VariantConfig = {
  bg: string;
  borderColor: string;
  borderWidth: number;
  radius: number;
  topAccentColor: string | null;
  contentPadding: number;
  contentGap: number;
  shadow: ViewStyle;
};

const variantConfig: Record<GlassPanelVariant, VariantConfig> = {
  scene: {
    bg: mobileTheme.colors.surfaceL2,
    borderColor: mobileTheme.colors.limeBorder,
    borderWidth: 1,
    radius: mobileTheme.radius.scene,
    topAccentColor: mobileTheme.colors.lime,
    contentPadding: mobileTheme.spacing.scenePadding,
    contentGap: 16,
    shadow: surfaceShadowStyle,
  },
  card: {
    bg: mobileTheme.colors.surfaceL1,
    borderColor: mobileTheme.colors.borderDefault,
    borderWidth: 1,
    radius: mobileTheme.radius.card,
    topAccentColor: null,
    contentPadding: mobileTheme.spacing.cardPadding,
    contentGap: 14,
    shadow: surfaceShadowStyle,
  },
  subtle: {
    bg: mobileTheme.colors.screenBase,
    borderColor: mobileTheme.colors.borderSubtle,
    borderWidth: 1,
    radius: mobileTheme.radius.inner,
    topAccentColor: null,
    contentPadding: 16,
    contentGap: 12,
    shadow: {},
  },
};

export const GlassPanel = ({
  children,
  style,
  contentStyle,
  motionIndex,
  variant = "card",
}: GlassPanelProps) => {
  const translateY = useRef(new Animated.Value(12)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const cfg = variantConfig[variant];

  useEffect(() => {
    const delayMs = typeof motionIndex === "number" ? Math.min(motionIndex * 40, 240) : 0;

    const animation = Animated.parallel([
      Animated.spring(translateY, {
        delay: delayMs,
        toValue: 0,
        damping: 20,
        stiffness: 200,
        mass: 0.85,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        delay: delayMs,
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [motionIndex, translateY, opacity]);

  return (
    <Animated.View
      style={[
        {
          borderRadius: cfg.radius,
          transform: [{ translateY }],
          opacity,
          ...cfg.shadow,
        },
        style,
      ]}
    >
      <View
        style={{
          borderRadius: cfg.radius,
          borderWidth: cfg.borderWidth,
          borderColor: cfg.borderColor,
          backgroundColor: cfg.bg,
          overflow: "hidden",
        }}
      >
        {/* Top accent bar (scene only) */}
        {cfg.topAccentColor !== null ? (
          <View
            style={{
              backgroundColor: cfg.topAccentColor,
              height: 2,
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              zIndex: 1,
            }}
          />
        ) : null}

        <View
          style={[
            {
              padding: cfg.contentPadding,
              gap: cfg.contentGap,
            },
            contentStyle,
          ]}
        >
          {children}
        </View>
      </View>
    </Animated.View>
  );
};
