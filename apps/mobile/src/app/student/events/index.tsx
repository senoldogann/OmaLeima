import { useRouter } from "expo-router";
import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
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
      <InfoCard eyebrow="Student" motionIndex={0} title="Event discovery">
        <ImageBackground imageStyle={styles.heroImage} source={heroCoverSource} style={styles.heroBand}>
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroCopy}>
              Pick the next student night, check the route, and open the event before the first scan starts.
            </Text>
            <View style={styles.heroMetaRow}>
              <Text style={styles.heroMetaText}>{activeEvents.length} live now</Text>
              <View style={styles.heroMetaDot} />
              <Text style={styles.heroMetaText}>{upcomingEvents.length} coming up</Text>
            </View>
          </View>
        </ImageBackground>
      </InfoCard>

      {eventsQuery.error ? (
        <InfoCard eyebrow="Error" motionIndex={2} title="Could not load events">
          <Text style={styles.bodyText}>{eventsQuery.error.message}</Text>
          <Pressable onPress={() => void eventsQuery.refetch()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!eventsQuery.isLoading && !eventsQuery.error && !hasEvents ? (
        <InfoCard eyebrow="Empty" motionIndex={3} title="No active or upcoming events">
          <Text style={styles.bodyText}>
            Nothing is visible for this student yet. When organizers publish the next appro, it will appear here.
          </Text>
        </InfoCard>
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
    minHeight: 172,
    overflow: "hidden",
    position: "relative",
  },
  heroCopy: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.subtitle,
    lineHeight: mobileTheme.typography.lineHeights.subtitle,
  },
  heroContent: {
    flex: 1,
    justifyContent: "space-between",
    padding: 18,
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
  retryButton: {
    alignSelf: "flex-start",
    borderRadius: mobileTheme.radius.button,
    backgroundColor: mobileTheme.colors.cyan,
    borderColor: mobileTheme.colors.cyanBorder,
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
