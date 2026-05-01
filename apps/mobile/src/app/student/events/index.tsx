import { useEffect, useMemo } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { EventCard } from "@/features/events/components/event-card";
import {
  getOffsetFallbackCoverSourceByIndex,
  prefetchEventCoverUrls,
} from "@/features/events/event-visuals";
import { AutoAdvancingRail } from "@/features/foundation/components/auto-advancing-rail";
import type { MobileTheme } from "@/features/foundation/theme";
import { useStudentEventsQuery } from "@/features/events/student-events";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
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
  const { copy, language } = useUiPreferences();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const studentId = session?.user.id ?? null;
  const eventsQuery = useStudentEventsQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null,
  });

  const activeEvents = useMemo(
    () => eventsQuery.data?.activeEvents ?? [],
    [eventsQuery.data?.activeEvents]
  );
  const upcomingEvents = useMemo(
    () => eventsQuery.data?.upcomingEvents ?? [],
    [eventsQuery.data?.upcomingEvents]
  );
  const coverImageUrls = useMemo(
    () => [...activeEvents, ...upcomingEvents].map((event) => event.coverImageUrl),
    [activeEvents, upcomingEvents]
  );
  const hasEvents = activeEvents.length > 0 || upcomingEvents.length > 0;
  const heroWidth = windowWidth;

  const discoverySlides = useMemo<readonly DiscoverySlide[]>(
    () => [
      {
        copy: copy.student.discoverySlides[0].body,
        eyebrow: copy.student.discoveryEyebrow,
        key: copy.student.discoverySlides[0].key,
        meta: language === "fi" ? `${activeEvents.length} käynnissä` : `${activeEvents.length} live now`,
        title: copy.student.discoverySlides[0].title,
      },
      {
        copy: copy.student.discoverySlides[1].body,
        eyebrow: copy.student.discoveryEyebrow,
        key: copy.student.discoverySlides[1].key,
        meta: language === "fi" ? `${upcomingEvents.length} tulossa` : `${upcomingEvents.length} coming up`,
        title: copy.student.discoverySlides[1].title,
      },
      {
        copy: copy.student.discoverySlides[2].body,
        eyebrow: copy.student.discoveryEyebrow,
        key: copy.student.discoverySlides[2].key,
        meta:
          language === "fi"
            ? `${activeEvents.length + upcomingEvents.length} iltaa näkyvissä`
            : `${activeEvents.length + upcomingEvents.length} nights visible`,
        title: copy.student.discoverySlides[2].title,
      },
    ],
    [activeEvents.length, copy.student.discoveryEyebrow, copy.student.discoverySlides, language, upcomingEvents.length]
  );

  const openEventDetail = (eventId: string): void => {
    router.push({
      pathname: "/student/events/[eventId]",
      params: { eventId },
    });
  };

  useEffect(() => {
    void prefetchEventCoverUrls(coverImageUrls);
  }, [coverImageUrls]);

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
        renderItem={(slide: DiscoverySlide, index: number) => (
          <CoverImageSurface
            imageStyle={styles.heroImage}
            source={getOffsetFallbackCoverSourceByIndex(index, 1)}
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
                  <Text style={styles.heroMetaText}>{language === "fi" ? "Auto" : "Auto"}</Text>
                  <AppIcon color={theme.colors.lime} name="chevron-right" size={14} />
                </View>
              </View>
            </View>
          </CoverImageSurface>
        )}
        showsIndicators={false}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{copy.student.eventsTitle}</Text>
        <Text style={styles.headerMeta}>{copy.student.eventsMeta}</Text>
      </View>

      {eventsQuery.error ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageEyebrow}>{copy.common.error}</Text>
          <Text style={styles.messageTitle}>
            {language === "fi" ? "Tapahtumia ei voitu ladata" : "Could not load events"}
          </Text>
          <Text style={styles.bodyText}>{eventsQuery.error.message}</Text>
          <Pressable onPress={() => void eventsQuery.refetch()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>{copy.common.retry}</Text>
          </Pressable>
        </View>
      ) : null}

      {!eventsQuery.isLoading && !eventsQuery.error && !hasEvents ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageEyebrow}>{copy.common.standby}</Text>
          <Text style={styles.messageTitle}>
            {language === "fi" ? "Ei aktiivisia tai tulevia tapahtumia" : "No active or upcoming events"}
          </Text>
          <Text style={styles.bodyText}>
            {language === "fi"
              ? "Kun järjestäjät julkaisevat seuraavan tapahtuman, se ilmestyy tänne."
              : "When organizers publish the next event, it will appear here."}
          </Text>
        </View>
      ) : null}

      {activeEvents.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{language === "fi" ? "Käynnissä nyt" : "Live now"}</Text>
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
          <Text style={styles.sectionTitle}>{language === "fi" ? "Tulossa" : "Coming up"}</Text>
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

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    header: {
      gap: 6,
    },
    headerMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      maxWidth: 320,
    },
    headerTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    heroBand: {
      minHeight: 248,
      position: "relative",
      width: "100%",
    },
    heroCopy: {
      color: "rgba(248, 250, 245, 0.86)",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
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
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.2,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    heroImage: {
      borderRadius: 0,
    },
    heroMetaDot: {
      backgroundColor: theme.colors.limeBorder,
      borderRadius: 999,
      height: 4,
      width: 4,
    },
    heroMetaHint: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
    },
    heroMetaRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    heroMetaText: {
      color: "rgba(248, 250, 245, 0.8)",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.mode === "dark" ? "rgba(0, 0, 0, 0.58)" : "rgba(7, 10, 7, 0.52)",
    },
    heroRail: {
      marginHorizontal: -theme.spacing.screenHorizontal,
      marginTop: -theme.spacing.screenVertical,
    },
    heroRailContent: {
      paddingRight: 0,
    },
    heroTitle: {
      color: "#F8FAF5",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      letterSpacing: -0.5,
      lineHeight: theme.typography.lineHeights.title,
    },
    messageCard: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 18,
    },
    messageEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.2,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    messageTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    retryButton: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    retryButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
    },
    section: {
      gap: theme.spacing.sectionGap,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
  });
