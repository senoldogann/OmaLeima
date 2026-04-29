import { useMemo } from "react";
import { useRouter } from "expo-router";
import { ImageBackground, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { EventCard } from "@/features/events/components/event-card";
import { getEventCoverSource } from "@/features/events/event-visuals";
import { AutoAdvancingRail } from "@/features/foundation/components/auto-advancing-rail";
import { interactiveSurfaceShadowStyle, mobileTheme } from "@/features/foundation/theme";
import { useStudentEventsQuery } from "@/features/events/student-events";
import { useSession } from "@/providers/session-provider";

type DiscoverySlide = {
  copy: string;
  eyebrow: string;
  key: string;
  meta: string;
  title: string;
};

export default function StudentEventsScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { session } = useSession();
  const studentId = session?.user.id ?? null;
  const eventsQuery = useStudentEventsQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null,
  });

  const activeEvents = eventsQuery.data?.activeEvents ?? [];
  const upcomingEvents = eventsQuery.data?.upcomingEvents ?? [];
  const hasEvents = activeEvents.length > 0 || upcomingEvents.length > 0;
  const heroWidth = windowWidth;
  const discoverySlides = useMemo<readonly DiscoverySlide[]>(
    () => [
      {
        copy: "Pick the next student night, save your route, and arrive with the QR already waiting.",
        eyebrow: "Student nights",
        key: "discovery-neon",
        meta: `${activeEvents.length} live now`,
        title: "Event discovery",
      },
      {
        copy: "Follow the city rhythm, jump between venues, and collect the night one leima at a time.",
        eyebrow: "Route energy",
        key: "discovery-route",
        meta: `${upcomingEvents.length} coming up`,
        title: "Plan the next round",
      },
      {
        copy: "Join early, keep the QR ready, and turn every venue stop into a visible streak.",
        eyebrow: "Before the first scan",
        key: "discovery-streak",
        meta: `${activeEvents.length + upcomingEvents.length} nights visible`,
        title: "Catch the next unlock",
      },
    ],
    [activeEvents.length, upcomingEvents.length]
  );

  const openEventDetail = (eventId: string): void => {
    router.push({
      pathname: "/student/events/[eventId]",
      params: { eventId },
    });
  };

  return (
    <AppScreen>
      <AutoAdvancingRail
        contentContainerStyle={styles.heroRailContent}
        intervalMs={3000}
        itemGap={0}
        items={discoverySlides}
        itemWidth={heroWidth}
        keyExtractor={(slide: DiscoverySlide) => slide.key}
        railStyle={styles.heroRail}
        renderItem={(slide: DiscoverySlide) => (
          <ImageBackground
            imageStyle={styles.heroImage}
            source={getEventCoverSource(null, slide.key)}
            style={styles.heroBand}
          >
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.heroCopyBlock}>
                <Text style={styles.heroEyebrow}>{slide.eyebrow}</Text>
                <Text style={styles.heroTitle}>{slide.title}</Text>
                <Text style={styles.heroCopy}>{slide.copy}</Text>
              </View>

              <View style={styles.heroMetaRow}>
                <Text style={styles.heroMetaText}>{slide.meta}</Text>
                <View style={styles.heroMetaDot} />
                <View style={styles.heroMetaHint}>
                  <Text style={styles.heroMetaText}>Auto</Text>
                  <AppIcon color={mobileTheme.colors.lime} name="chevron-right" size={14} />
                </View>
              </View>
            </View>
          </ImageBackground>
        )}
        showsIndicators={false}
      />

      {eventsQuery.error ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageEyebrow}>Error</Text>
          <Text style={styles.messageTitle}>Could not load events</Text>
          <Text style={styles.bodyText}>{eventsQuery.error.message}</Text>
          <Pressable onPress={() => void eventsQuery.refetch()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {!eventsQuery.isLoading && !eventsQuery.error && !hasEvents ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageEyebrow}>Empty</Text>
          <Text style={styles.messageTitle}>No active or upcoming events</Text>
          <Text style={styles.bodyText}>
            Nothing is visible for this student yet. When organizers publish the next appro, it will appear here.
          </Text>
        </View>
      ) : null}

      {activeEvents.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live now</Text>
          {activeEvents.map((event, index) => (
            <EventCard
              event={event}
              key={event.id}
              motionIndex={index + 1}
              onPress={() => openEventDetail(event.id)}
            />
          ))}
        </View>
      ) : null}

      {upcomingEvents.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coming up</Text>
          {upcomingEvents.map((event, index) => (
            <EventCard
              event={event}
              key={event.id}
              motionIndex={activeEvents.length + index + 1}
              onPress={() => openEventDetail(event.id)}
            />
          ))}
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  heroBand: {
    minHeight: 248,
    position: "relative",
    width: "100%",
    ...interactiveSurfaceShadowStyle,
  },
  heroCopy: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.body,
    lineHeight: mobileTheme.typography.lineHeights.body,
    maxWidth: 270,
  },
  heroCopyBlock: {
    gap: 8,
  },
  heroContent: {
    flex: 1,
    justifyContent: "space-between",
    padding: 22,
  },
  heroEyebrow: {
    color: mobileTheme.colors.lime,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.eyebrow,
    letterSpacing: 1.2,
    lineHeight: mobileTheme.typography.lineHeights.eyebrow,
    textTransform: "uppercase",
  },
  heroImage: {
    borderRadius: 0,
  },
  heroMetaHint: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  heroMetaDot: {
    backgroundColor: mobileTheme.colors.limeBorder,
    borderRadius: 999,
    height: 4,
    width: 4,
  },
  heroMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  heroMetaText: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    lineHeight: mobileTheme.typography.lineHeights.bodySmall,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.58)",
  },
  heroRail: {
    marginHorizontal: -mobileTheme.spacing.screenHorizontal,
    marginTop: -mobileTheme.spacing.screenVertical,
  },
  heroRailContent: {
    paddingRight: 0,
  },
  heroTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.extrabold,
    fontSize: mobileTheme.typography.sizes.title,
    letterSpacing: -0.5,
    lineHeight: mobileTheme.typography.lineHeights.title,
  },
  messageCard: {
    backgroundColor: mobileTheme.colors.surfaceL1,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    gap: 12,
    padding: 18,
    ...interactiveSurfaceShadowStyle,
  },
  messageEyebrow: {
    color: mobileTheme.colors.lime,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.eyebrow,
    letterSpacing: 1.2,
    lineHeight: mobileTheme.typography.lineHeights.eyebrow,
    textTransform: "uppercase",
  },
  messageTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.subtitle,
    lineHeight: mobileTheme.typography.lineHeights.subtitle,
  },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: mobileTheme.colors.cyan,
    borderColor: mobileTheme.colors.cyanBorder,
    borderRadius: mobileTheme.radius.button,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...interactiveSurfaceShadowStyle,
  },
  retryButtonText: {
    color: mobileTheme.colors.screenBase,
    fontSize: 14,
    fontWeight: "800",
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
});
