import { useMemo } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { getOffsetFallbackCoverSourceByIndex } from "@/features/events/event-visuals";
import { AutoAdvancingRail } from "@/features/foundation/components/auto-advancing-rail";
import type { MobileTheme } from "@/features/foundation/theme";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";

type OnboardingSlide = {
  body: string;
  eyebrow: string;
  key: string;
  title: string;
};

export const LoginHero = () => {
  const { width } = useWindowDimensions();
  const theme = useAppTheme();
  const { copy } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const slideWidth = Math.max(width - theme.spacing.screenHorizontal * 2, 280);
  const slides = useMemo<readonly OnboardingSlide[]>(() => copy.auth.onboardingSlides, [copy.auth.onboardingSlides]);

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <Text style={styles.kicker}>OmaLeima</Text>
        <Text style={styles.brandHint}>{copy.auth.brandHint}</Text>
      </View>

      <AutoAdvancingRail
        contentContainerStyle={styles.railContent}
        intervalMs={3200}
        itemGap={12}
        itemWidth={slideWidth}
        items={slides}
        keyExtractor={(slide: OnboardingSlide) => slide.key}
        railStyle={styles.rail}
        renderItem={(slide: OnboardingSlide, index: number) => (
          <CoverImageSurface
            imageStyle={styles.slideImage}
            source={getOffsetFallbackCoverSourceByIndex(index, 5)}
            style={styles.slide}
          >
            <View style={styles.slideOverlay} />
            <View style={styles.slideContent}>
              <Text style={styles.slideEyebrow}>{slide.eyebrow}</Text>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.body}</Text>
              <View style={styles.slideFooter}>
                <Text style={styles.slideFooterText}>{copy.auth.swipeOrWait}</Text>
                <AppIcon color={theme.colors.lime} name="chevron-right" size={14} />
              </View>
            </View>
          </CoverImageSurface>
        )}
        showsIndicators={false}
      />
    </View>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    brandHint: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    brandRow: {
      gap: 4,
    },
    container: {
      gap: 14,
    },
    kicker: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.2,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    rail: {
      minHeight: 218,
    },
    railContent: {
      paddingRight: 8,
    },
    slide: {
      borderRadius: theme.radius.scene,
      minHeight: 218,
      overflow: "hidden",
    },
    slideContent: {
      flex: 1,
      justifyContent: "space-between",
      padding: 20,
    },
    slideEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.2,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    slideFooter: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: theme.mode === "dark" ? "rgba(0, 0, 0, 0.28)" : "rgba(7, 10, 7, 0.34)",
      borderRadius: 999,
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    slideFooterText: {
      color: "rgba(248, 250, 245, 0.84)",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    slideImage: {
      borderRadius: theme.radius.scene,
    },
    slideOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.mode === "dark" ? "rgba(0, 0, 0, 0.54)" : "rgba(7, 10, 7, 0.52)",
    },
    subtitle: {
      color: "rgba(248, 250, 245, 0.84)",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      maxWidth: 280,
    },
    title: {
      color: "#F8FAF5",
      fontFamily: theme.typography.families.extrabold,
      fontSize: 28,
      letterSpacing: -0.7,
      lineHeight: 34,
    },
  });
