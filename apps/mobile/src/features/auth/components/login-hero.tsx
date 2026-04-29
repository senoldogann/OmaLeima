import { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { AppIcon } from "@/components/app-icon";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { getFallbackCoverSourceByIndex } from "@/features/events/event-visuals";
import { AutoAdvancingRail } from "@/features/foundation/components/auto-advancing-rail";
import { mobileTheme } from "@/features/foundation/theme";

type OnboardingSlide = {
  body: string;
  eyebrow: string;
  key: string;
  title: string;
};

export const LoginHero = () => {
  const { width } = useWindowDimensions();
  const slideWidth = Math.max(width - mobileTheme.spacing.screenHorizontal * 2, 280);
  const slides = useMemo<readonly OnboardingSlide[]>(
    () => [
      {
        body: "Find the next student night, jump into the route, and keep the QR ready before you arrive.",
        eyebrow: "For students",
        key: "student-night",
        title: "One app for the whole appro",
      },
      {
        body: "Each venue scans once, locks the result, and keeps the line moving without paper stamp cards.",
        eyebrow: "For venues",
        key: "venue-flow",
        title: "Live scanning without the scramble",
      },
      {
        body: "Clubs keep the event readable while students collect leimas and rewards across the city.",
        eyebrow: "For organizers",
        key: "club-view",
        title: "A cleaner night from start to reward",
      },
    ],
    []
  );

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <Text style={styles.kicker}>OmaLeima</Text>
        <Text style={styles.brandHint}>Student nights, live QR, venue stamps.</Text>
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
            source={getFallbackCoverSourceByIndex(index)}
            style={styles.slide}
          >
            <View style={styles.slideOverlay} />
            <View style={styles.slideContent}>
              <Text style={styles.slideEyebrow}>{slide.eyebrow}</Text>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.body}</Text>
              <View style={styles.slideFooter}>
                <Text style={styles.slideFooterText}>Swipe or wait</Text>
                <AppIcon color={mobileTheme.colors.lime} name="chevron-right" size={14} />
              </View>
            </View>
          </CoverImageSurface>
        )}
        showsIndicators={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  brandHint: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    lineHeight: mobileTheme.typography.lineHeights.bodySmall,
  },
  brandRow: {
    gap: 4,
  },
  container: {
    gap: 14,
  },
  kicker: {
    color: mobileTheme.colors.lime,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.eyebrow,
    letterSpacing: 1.2,
    lineHeight: mobileTheme.typography.lineHeights.eyebrow,
    textTransform: "uppercase",
  },
  rail: {
    minHeight: 218,
  },
  railContent: {
    paddingRight: 8,
  },
  slide: {
    borderRadius: mobileTheme.radius.scene,
    minHeight: 218,
    overflow: "hidden",
  },
  slideContent: {
    flex: 1,
    justifyContent: "space-between",
    padding: 20,
  },
  slideEyebrow: {
    color: mobileTheme.colors.lime,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.eyebrow,
    letterSpacing: 1.2,
    lineHeight: mobileTheme.typography.lineHeights.eyebrow,
    textTransform: "uppercase",
  },
  slideFooter: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(0, 0, 0, 0.28)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  slideFooterText: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.caption,
    lineHeight: mobileTheme.typography.lineHeights.caption,
  },
  slideImage: {
    borderRadius: mobileTheme.radius.scene,
  },
  slideOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.54)",
  },
  subtitle: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.body,
    lineHeight: mobileTheme.typography.lineHeights.body,
    maxWidth: 280,
  },
  title: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.extrabold,
    fontSize: 28,
    letterSpacing: -0.7,
    lineHeight: 34,
  },
});
