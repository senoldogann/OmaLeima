import { useRouter } from "expo-router";
import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { EventCard } from "@/features/events/components/event-card";
import { getEventCoverSource } from "@/features/events/event-visuals";
import { interactiveSurfaceShadowStyle, mobileTheme } from "@/features/foundation/theme";
import { useStudentEventsQuery } from "@/features/events/student-events";
import { useSession } from "@/providers/session-provider";

export default function StudentEventsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const studentId = session?.user.id ?? null;
  const eventsQuery = useStudentEventsQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null,
  });

  const activeEvents = eventsQuery.data?.activeEvents ?? [];
  const upcomingEvents = eventsQuery.data?.upcomingEvents ?? [];
  const hasEvents = activeEvents.length > 0 || upcomingEvents.length > 0;
  const heroCoverSource = getEventCoverSource(null, "event-discovery-hero");

  const openEventDetail = (eventId: string): void => {
    router.push({
      pathname: "/student/events/[eventId]",
      params: { eventId },
    });
  };

  return (
    <AppScreen>
      <ImageBackground imageStyle={styles.heroImage} source={heroCoverSource} style={styles.heroBand}>
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <View style={styles.heroCopyBlock}>
            <Text style={styles.heroEyebrow}>Student</Text>
            <Text style={styles.heroTitle}>Event discovery</Text>
            <Text style={styles.heroCopy}>
              Pick the next student night, check the route, and open the event before the first scan starts.
            </Text>
          </View>

          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMetaText}>{activeEvents.length} live now</Text>
            <View style={styles.heroMetaDot} />
            <Text style={styles.heroMetaText}>{upcomingEvents.length} coming up</Text>
          </View>
        </View>
      </ImageBackground>

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
    borderRadius: mobileTheme.radius.scene,
    minHeight: 248,
    overflow: "hidden",
    position: "relative",
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
    borderRadius: mobileTheme.radius.scene,
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
