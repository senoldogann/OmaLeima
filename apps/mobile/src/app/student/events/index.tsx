import { useRouter, type RelativePathString } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { EventCard } from "@/features/events/components/event-card";
import { FoundationStatusCard } from "@/features/foundation/components/foundation-status-card";
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

  const openEventDetail = (eventId: string): void => {
    router.push(`./${eventId}` as RelativePathString);
  };

  return (
    <AppScreen>
      <InfoCard eyebrow="Student" motionIndex={0} title="Event discovery">
        <Text style={styles.bodyText}>
          Browse live appro nights, check what is opening next, and jump into the event detail before the first scan even starts.
        </Text>
      </InfoCard>

      <FoundationStatusCard
        eyebrow="Status"
        title="Student events query"
        items={[
          {
            label: "Session",
            value: studentId ?? "No authenticated student session.",
            state: studentId ? "ready" : "error",
          },
          {
            label: "Event listing",
            value: eventsQuery.isLoading
              ? "Loading public active and upcoming events."
              : eventsQuery.error?.message ?? `${activeEvents.length + upcomingEvents.length} visible events loaded.`,
            state: eventsQuery.isLoading ? "loading" : eventsQuery.error ? "error" : "ready",
          },
          {
            label: "Detail route",
            value: "Each event card now opens a nested event detail screen inside the Events tab.",
            state: "ready",
          },
        ]}
      />

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
  retryButton: {
    alignSelf: "flex-start",
    borderRadius: mobileTheme.radius.button,
    backgroundColor: mobileTheme.colors.actionBlueStrong,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...interactiveSurfaceShadowStyle,
  },
  retryButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
});
